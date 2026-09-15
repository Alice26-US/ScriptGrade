import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UNIVERSITY_CAMPUSES, UserRole } from "@scriptgrade/domain";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { Response } from "express";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/types/actor";
import { AppConfig } from "../config/configuration";
import { STORAGE, StoragePort } from "../files/storage.port";
import { EMAIL, EmailPort } from "../notifications/email.port";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./jwt.strategy";

const ACCESS_COOKIE = "sg_access";
const REFRESH_COOKIE = "sg_refresh";

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly audit: AuditService,
    @Inject(EMAIL) private readonly email: EmailPort,
    @Inject(STORAGE) private readonly storage: StoragePort,
  ) {}

  async onModuleInit(): Promise<void> {
    const bootstrap = this.config.get("adminBootstrap", { infer: true }) ?? {
      email: process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@scriptgrade.local",
      password: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "ChangeMeNow1",
    };
    const email = bootstrap.email.toLowerCase();
    const existing = await this.prisma.userAccount.findFirst({
      where: { role: "ADMIN", adminEmail: email },
    });
    if (!existing) {
      await this.prisma.userAccount.create({
        data: {
          role: "ADMIN",
          adminEmail: email,
          passwordHash: await bcrypt.hash(bootstrap.password, 12),
          locale: "EN",
        },
      });
    }
  }

  normalizeMatricule(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, "");
  }

  maskEmail(email: string): string {
    const [user, domain] = email.split("@");
    if (!domain) return "***";
    const keep = user.slice(0, 1);
    return `${keep}***@${domain}`;
  }

  async startRegistration(
    matriculeRaw: string,
    universityEmailRaw: string,
  ): Promise<{
    status: "otp_sent";
    maskedEmail: string;
    otp?: string;
  }> {
    const matricule = this.normalizeMatricule(matriculeRaw);
    if (!matricule) throw new BadRequestException("Matricule is required");
    const universityEmail = universityEmailRaw.trim().toLowerCase();
    let student = await this.prisma.student.findUnique({ where: { matricule } });
    if (student && !student.active) {
      throw new ForbiddenException("This student record is inactive");
    }
    if (student) {
      const existing = await this.prisma.userAccount.findUnique({
        where: { studentId: student.id },
      });
      if (existing?.passwordHash && student.onboardingCompletedAt) {
        throw new ConflictException("Account already exists; please log in with your matricule");
      }
      if (existing?.passwordHash && !student.onboardingCompletedAt) {
        throw new ConflictException(
          "You already set a password. Log in with your matricule to finish your profile.",
        );
      }
    }
    const emailTaken = await this.prisma.student.findFirst({
      where: { universityEmail, ...(student ? { NOT: { id: student.id } } : {}) },
    });
    if (emailTaken) {
      throw new ConflictException("That university email is already used by another student");
    }
    if (!student) {
      student = await this.prisma.student.create({
        data: {
          matricule,
          universityEmail,
          firstName: "Pending",
          lastName: "Pending",
          active: true,
        },
      });
    } else if (student.universityEmail !== universityEmail) {
      student = await this.prisma.student.update({
        where: { id: student.id },
        data: { universityEmail },
      });
    }
    const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.prisma.activationOtp.create({
      data: {
        studentId: student.id,
        targetEmail: universityEmail,
        codeHash,
        purpose: "register",
        expiresAt,
      },
    });
    await this.email.send({
      to: universityEmail,
      subject: "ScriptGrade activation code",
      text: `Your ScriptGrade activation code is ${otp}. It expires in 10 minutes.`,
    });
    await this.audit.record({
      action: "register.start",
      entityType: "Student",
      entityId: student.id,
    });
    const emailDriver = this.config.get("email", { infer: true })?.driver ?? "noop";
    return {
      status: "otp_sent",
      maskedEmail: this.maskEmail(universityEmail),
      ...(emailDriver === "noop" ? { otp } : {}),
    };
  }

  async verifyRegistration(
    args: {
      matricule: string;
      otp: string;
      universityEmail: string;
      password: string;
      fullName: string;
      campusId: string;
      facultyId: string;
      departmentId: string;
      programme: string;
      level: string;
      academicYear: string;
    },
    res: Response,
  ): Promise<{ role: UserRole; profileComplete: boolean }> {
    const matricule = this.normalizeMatricule(args.matricule);
    const student = await this.prisma.student.findUnique({ where: { matricule } });
    if (!student || !student.active) {
      throw new ForbiddenException("Unknown or inactive student record");
    }
    const otp = await this.prisma.activationOtp.findFirst({
      where: {
        studentId: student.id,
        purpose: "register",
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otp || otp.codeHash !== hashToken(args.otp.trim())) {
      throw new UnauthorizedException("Invalid or expired code");
    }
    const providedEmail = args.universityEmail.trim().toLowerCase();
    if (otp.targetEmail && otp.targetEmail !== providedEmail) {
      throw new BadRequestException("University email does not match the address we sent the code to");
    }
    const emailTaken = await this.prisma.student.findFirst({
      where: { universityEmail: providedEmail, NOT: { id: student.id } },
    });
    if (emailTaken) {
      throw new ConflictException("That university email is already used by another student");
    }
    await this.assertCampus(args.campusId);
    await this.assertFacultyDepartment(args.facultyId, args.departmentId);
    const { firstName, lastName } = parseFullName(args.fullName);
    const programme = await this.resolveProgramme(
      args.facultyId,
      args.departmentId,
      args.programme,
    );
    const passwordHash = await bcrypt.hash(args.password, 12);
    await this.prisma.$transaction([
      this.prisma.activationOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.student.update({
        where: { id: student.id },
        data: {
          firstName,
          lastName,
          universityEmail: providedEmail,
          campusId: args.campusId,
          facultyId: args.facultyId,
          departmentId: args.departmentId,
          programmeId: programme.id,
          level: args.level.trim(),
          academicYear: args.academicYear.trim(),
          onboardingCompletedAt: new Date(),
        },
      }),
      this.prisma.userAccount.upsert({
        where: { studentId: student.id },
        create: {
          role: "STUDENT",
          studentId: student.id,
          passwordHash,
        },
        update: { passwordHash },
      }),
    ]);
    const account = await this.prisma.userAccount.findUniqueOrThrow({
      where: { studentId: student.id },
    });
    await this.issueSession(account.id, account.role, res);
    await this.audit.record({
      actorId: account.id,
      action: "register.complete",
      entityType: "Student",
      entityId: student.id,
    });
    return { role: "STUDENT", profileComplete: true };
  }

  async startLecturerRegistration(universityEmailRaw: string): Promise<{
    status: "otp_sent";
    maskedEmail: string;
    otp?: string;
  }> {
    const universityEmail = universityEmailRaw.trim().toLowerCase();
    let lecturer = await this.prisma.lecturer.findUnique({ where: { email: universityEmail } });
    if (lecturer && !lecturer.active) {
      throw new ForbiddenException("This lecturer record is inactive");
    }
    if (lecturer) {
      const existing = await this.prisma.userAccount.findUnique({
        where: { lecturerId: lecturer.id },
      });
      if (existing?.passwordHash && lecturer.onboardingCompletedAt) {
        throw new ConflictException("Account already exists; please log in with your university email");
      }
      if (existing?.passwordHash && !lecturer.onboardingCompletedAt) {
        throw new ConflictException(
          "You already set a password. Log in with your university email to finish your profile.",
        );
      }
    } else {
      lecturer = await this.prisma.lecturer.create({
        data: {
          email: universityEmail,
          firstName: "Pending",
          lastName: "Pending",
          active: true,
        },
      });
    }
    const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await this.prisma.activationOtp.create({
      data: {
        accountId: null,
        targetEmail: universityEmail,
        codeHash: hashToken(otp),
        purpose: "lecturer-register",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
    await this.email.send({
      to: universityEmail,
      subject: "ScriptGrade activation code",
      text: `Your ScriptGrade activation code is ${otp}. It expires in 10 minutes.`,
    });
    await this.audit.record({
      action: "register.lecturer.start",
      entityType: "Lecturer",
      entityId: lecturer.id,
    });
    const emailDriver = this.config.get("email", { infer: true })?.driver ?? "noop";
    return {
      status: "otp_sent",
      maskedEmail: this.maskEmail(universityEmail),
      ...(emailDriver === "noop" ? { otp } : {}),
    };
  }

  async verifyLecturerRegistration(
    args: {
      universityEmail: string;
      otp: string;
      password: string;
      fullName: string;
      campusId: string;
      facultyId: string;
      departmentId: string;
    },
    res: Response,
  ): Promise<{ role: UserRole; profileComplete: boolean }> {
    const universityEmail = args.universityEmail.trim().toLowerCase();
    const lecturer = await this.prisma.lecturer.findUnique({ where: { email: universityEmail } });
    if (!lecturer || !lecturer.active) {
      throw new ForbiddenException("Unknown or inactive lecturer record");
    }
    const otp = await this.prisma.activationOtp.findFirst({
      where: {
        purpose: "lecturer-register",
        targetEmail: universityEmail,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otp || otp.codeHash !== hashToken(args.otp.trim())) {
      throw new UnauthorizedException("Invalid or expired code");
    }
    await this.assertCampus(args.campusId);
    await this.assertFacultyDepartment(args.facultyId, args.departmentId);
    const { firstName, lastName } = parseFullName(args.fullName);
    const passwordHash = await bcrypt.hash(args.password, 12);
    await this.prisma.$transaction([
      this.prisma.activationOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.lecturer.update({
        where: { id: lecturer.id },
        data: {
          firstName,
          lastName,
          campusId: args.campusId,
          facultyId: args.facultyId,
          departmentId: args.departmentId,
          onboardingCompletedAt: new Date(),
        },
      }),
      this.prisma.userAccount.upsert({
        where: { lecturerId: lecturer.id },
        create: {
          role: "LECTURER",
          lecturerId: lecturer.id,
          passwordHash,
        },
        update: { passwordHash },
      }),
    ]);
    const account = await this.prisma.userAccount.findUniqueOrThrow({
      where: { lecturerId: lecturer.id },
    });
    await this.issueSession(account.id, account.role, res);
    await this.audit.record({
      actorId: account.id,
      action: "register.lecturer.complete",
      entityType: "Lecturer",
      entityId: lecturer.id,
    });
    return { role: "LECTURER", profileComplete: true };
  }

  async login(
    identifierRaw: string,
    password: string,
    res: Response,
    role?: UserRole,
  ): Promise<{ role: UserRole; profileComplete: boolean }> {
    const identifier = identifierRaw.trim();
    const account = await this.resolveLoginAccount(identifier, role);
    if (!account?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(password, account.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    if (account.student && !account.student.active) {
      throw new ForbiddenException("Student record is inactive");
    }
    if (account.lecturer && !account.lecturer.active) {
      throw new ForbiddenException("Lecturer account is inactive");
    }
    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });
    await this.issueSession(account.id, account.role, res);
    await this.audit.record({
      actorId: account.id,
      action: "auth.login",
      entityType: "UserAccount",
      entityId: account.id,
    });
    return {
      role: account.role,
      profileComplete: await this.isProfileComplete(account.role, account.studentId, account.lecturerId),
    };
  }

  async refresh(refreshToken: string | undefined, res: Response): Promise<void> {
    if (!refreshToken) throw new UnauthorizedException();
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { account: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }
    stored.revokedAt = new Date();
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await this.issueSession(stored.accountId, stored.account.role, res);
  }

  async logout(refreshToken: string | undefined, res: Response): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken) },
        data: { revokedAt: new Date() },
      });
    }
    this.clearCookies(res);
  }

  async me(actor: Actor) {
    if (actor.role === "STUDENT" && actor.studentId) {
      const student = await this.prisma.student.findUniqueOrThrow({
        where: { id: actor.studentId },
        include: { campus: true, faculty: true, department: true, programme: true },
      });
      return {
        role: actor.role,
        locale: actor.locale,
        fullName: displayName(student.firstName, student.lastName),
        firstName: student.firstName,
        lastName: student.lastName,
        matricule: student.matricule,
        universityEmail: student.universityEmail,
        campus: student.campus?.name ?? null,
        campusId: student.campusId,
        faculty: student.faculty?.name ?? null,
        department: student.department?.name ?? null,
        programme: student.programme?.name ?? null,
        level: student.level,
        academicYear: student.academicYear,
        photoUrl: student.photoKey
          ? await this.storage.signRead(student.photoKey)
          : null,
        facultyId: student.facultyId,
        departmentId: student.departmentId,
        canEdit: { password: true, photo: true, details: true },
        profileComplete: Boolean(student.onboardingCompletedAt),
        matriculeLocked: true,
      };
    }
    if (actor.role === "LECTURER" && actor.lecturerId) {
      const lecturer = await this.prisma.lecturer.findUniqueOrThrow({
        where: { id: actor.lecturerId },
        include: { campus: true, faculty: true, department: true },
      });
      return {
        role: actor.role,
        locale: actor.locale,
        fullName: displayName(lecturer.firstName, lecturer.lastName),
        firstName: lecturer.firstName,
        lastName: lecturer.lastName,
        universityEmail: lecturer.email,
        email: lecturer.email,
        campus: lecturer.campus?.name ?? null,
        campusId: lecturer.campusId,
        faculty: lecturer.faculty?.name ?? null,
        department: lecturer.department?.name ?? null,
        facultyId: lecturer.facultyId,
        departmentId: lecturer.departmentId,
        photoUrl: lecturer.photoKey
          ? await this.storage.signRead(lecturer.photoKey)
          : null,
        canEdit: { password: true, photo: true, details: true },
        profileComplete: Boolean(lecturer.onboardingCompletedAt),
      };
    }
    return {
      role: actor.role,
      locale: actor.locale,
      email: actor.adminEmail,
      fullName: "Administrator",
      canEdit: { password: true, photo: false },
      profileComplete: true,
    };
  }

  async completeProfile(
    actor: Actor,
    args: {
      fullName: string;
      campusId: string;
      facultyId: string;
      departmentId: string;
      programme?: string;
      level?: string;
      academicYear?: string;
    },
  ) {
    await this.assertCampus(args.campusId);
    await this.assertFacultyDepartment(args.facultyId, args.departmentId);
    const { firstName, lastName } = parseFullName(args.fullName);
    if (actor.role === "STUDENT" && actor.studentId) {
      const programme = await this.resolveProgramme(
        args.facultyId,
        args.departmentId,
        args.programme ?? "",
      );
      await this.prisma.student.update({
        where: { id: actor.studentId },
        data: {
          firstName,
          lastName,
          campusId: args.campusId,
          facultyId: args.facultyId,
          departmentId: args.departmentId,
          programmeId: programme.id,
          level: args.level?.trim(),
          academicYear: args.academicYear?.trim(),
          onboardingCompletedAt: new Date(),
        },
      });
      return this.me(actor);
    }
    if (actor.role === "LECTURER" && actor.lecturerId) {
      await this.prisma.lecturer.update({
        where: { id: actor.lecturerId },
        data: {
          firstName,
          lastName,
          campusId: args.campusId,
          facultyId: args.facultyId,
          departmentId: args.departmentId,
          onboardingCompletedAt: new Date(),
        },
      });
      return this.me(actor);
    }
    throw new ForbiddenException();
  }

  async resetOnboarding(actor: Actor, kind: "student" | "lecturer", id: string) {
    if (actor.role !== "ADMIN") throw new ForbiddenException();
    if (kind === "student") {
      await this.prisma.student.update({
        where: { id },
        data: { onboardingCompletedAt: null },
      });
    } else {
      await this.prisma.lecturer.update({
        where: { id },
        data: { onboardingCompletedAt: null },
      });
    }
    await this.audit.record({
      actorId: actor.accountId,
      action: "onboarding.reset",
      entityType: kind === "student" ? "Student" : "Lecturer",
      entityId: id,
    });
    return { ok: true };
  }

  async changeOwnPassword(
    actor: Actor,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: actor.accountId },
    });
    if (!account?.passwordHash) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");
    await this.prisma.userAccount.update({
      where: { id: actor.accountId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "auth.change_password",
      entityType: "UserAccount",
      entityId: actor.accountId,
    });
  }

  async uploadOwnPhoto(actor: Actor, file: Express.Multer.File): Promise<{ photoUrl: string }> {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!file || !allowed.has(file.mimetype)) {
      throw new BadRequestException("Photo must be JPEG, PNG, or WebP");
    }
    if (file.size > 4 * 1024 * 1024) {
      throw new BadRequestException("Photo must be under 4MB");
    }
    if (actor.role === "STUDENT" && actor.studentId) {
      const key = `profiles/students/${actor.studentId}`;
      await this.storage.put({ key, body: file.buffer, contentType: file.mimetype });
      await this.prisma.student.update({
        where: { id: actor.studentId },
        data: { photoKey: key },
      });
      return { photoUrl: await this.storage.signRead(key) };
    }
    if (actor.role === "LECTURER" && actor.lecturerId) {
      const key = `profiles/lecturers/${actor.lecturerId}`;
      await this.storage.put({ key, body: file.buffer, contentType: file.mimetype });
      await this.prisma.lecturer.update({
        where: { id: actor.lecturerId },
        data: { photoKey: key },
      });
      return { photoUrl: await this.storage.signRead(key) };
    }
    throw new ForbiddenException("Admin accounts do not have a profile photo");
  }

  async forgotPassword(identifierRaw: string): Promise<{ ok: true; token?: string }> {
    const identifier = identifierRaw.trim();
    const account = identifier.includes("@")
      ? ((await this.findLecturerAccountByEmail(identifier)) ??
        (await this.findAdminByEmail(identifier)))
      : await this.findByMatricule(identifier);
    const email =
      account?.student?.universityEmail ??
      account?.lecturer?.email ??
      account?.adminEmail;
    if (!account || !email) return { ok: true };
    const token = randomBytes(24).toString("hex");
    await this.prisma.activationOtp.create({
      data: {
        studentId: account.studentId,
        accountId: account.id,
        codeHash: hashToken(token),
        purpose: `reset:${account.id}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    await this.email.send({
      to: email,
      subject: "ScriptGrade password reset",
      text: `Use this token to reset your password: ${token}`,
    });
    const emailDriver = this.config.get("email", { infer: true })?.driver ?? "noop";
    return {
      ok: true,
      ...(emailDriver === "noop" ? { token } : {}),
    };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const otp = await this.prisma.activationOtp.findFirst({
      where: {
        codeHash: hashToken(token),
        purpose: { startsWith: "reset:" },
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!otp) throw new UnauthorizedException("Invalid or expired token");
    const accountId = otp.purpose.slice("reset:".length);
    await this.prisma.$transaction([
      this.prisma.activationOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.userAccount.update({
        where: { id: accountId },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      }),
    ]);
  }

  async issueAdminActivation(studentId: string, actor: Actor): Promise<void> {
    if (actor.role !== "ADMIN") throw new ForbiddenException();
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new BadRequestException("Student not found");
    const token = randomBytes(24).toString("hex");
    await this.prisma.activationOtp.create({
      data: {
        studentId: student.id,
        codeHash: hashToken(token),
        purpose: "admin-activate",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const dest = student.universityEmail;
    if (dest) {
      await this.email.send({
        to: dest,
        subject: "ScriptGrade registrar activation",
        text: `Your registrar activation token: ${token}`,
      });
    }
    await this.audit.record({
      actorId: actor.accountId,
      action: "student.admin_activate.issue",
      entityType: "Student",
      entityId: student.id,
      after: { tokenIssued: true, emailed: !!dest },
    });
  }

  async setLecturerPassword(
    lecturerId: string,
    password: string,
    actor: Actor,
  ): Promise<void> {
    if (actor.role !== "ADMIN") throw new ForbiddenException();
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: lecturerId },
    });
    if (!lecturer) throw new BadRequestException("Lecturer not found");
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.userAccount.upsert({
      where: { lecturerId },
      create: {
        role: "LECTURER",
        lecturerId,
        passwordHash,
      },
      update: { passwordHash },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "lecturer.set_password",
      entityType: "Lecturer",
      entityId: lecturerId,
    });
  }

  async completeAdminActivation(token: string, password: string): Promise<void> {
    const otp = await this.prisma.activationOtp.findFirst({
      where: {
        codeHash: hashToken(token),
        purpose: "admin-activate",
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!otp?.studentId) throw new UnauthorizedException("Invalid or expired token");
    const studentId = otp.studentId;
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.activationOtp.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.userAccount.upsert({
        where: { studentId },
        create: {
          role: "STUDENT",
          studentId,
          passwordHash,
        },
        update: { passwordHash },
      }),
    ]);
  }

  private async resolveLoginAccount(identifier: string, role?: UserRole) {
    if (role === "STUDENT") {
      if (identifier.includes("@")) {
        throw new BadRequestException("Students log in with matricule, not email");
      }
      const account = await this.findByMatricule(identifier);
      if (account && account.role !== "STUDENT") return null;
      return account;
    }
    if (role === "LECTURER") {
      if (!identifier.includes("@")) {
        throw new BadRequestException("Lecturers log in with university email");
      }
      return this.findLecturerAccountByEmail(identifier);
    }
    if (role === "ADMIN") {
      if (!identifier.includes("@")) {
        throw new BadRequestException("Administrators log in with email");
      }
      return this.findAdminByEmail(identifier);
    }
    if (identifier.includes("@")) {
      return (
        (await this.findLecturerAccountByEmail(identifier)) ??
        (await this.findAdminByEmail(identifier))
      );
    }
    const account = await this.findByMatricule(identifier);
    if (account && account.role !== "STUDENT") return null;
    return account;
  }

  private async findByMatricule(matriculeRaw: string) {
    const matricule = this.normalizeMatricule(matriculeRaw);
    const student = await this.prisma.student.findUnique({ where: { matricule } });
    if (!student) return null;
    return this.prisma.userAccount.findUnique({
      where: { studentId: student.id },
      include: { student: true, lecturer: true },
    });
  }

  private async isProfileComplete(
    role: UserRole,
    studentId: string | null,
    lecturerId: string | null,
  ): Promise<boolean> {
    if (role === "ADMIN") return true;
    if (role === "STUDENT" && studentId) {
      const s = await this.prisma.student.findUnique({ where: { id: studentId } });
      return Boolean(s?.onboardingCompletedAt);
    }
    if (role === "LECTURER" && lecturerId) {
      const l = await this.prisma.lecturer.findUnique({ where: { id: lecturerId } });
      return Boolean(l?.onboardingCompletedAt);
    }
    return false;
  }

  private async assertCampus(campusId: string) {
    const campus = await this.prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus || !UNIVERSITY_CAMPUSES.some((c) => c.code === campus.code)) {
      throw new BadRequestException("Campus must be Bonaberi, Bonamoussadi, or Ndogpassi");
    }
  }

  private async assertFacultyDepartment(facultyId: string, departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: { faculty: true },
    });
    if (!department || department.facultyId !== facultyId) {
      throw new BadRequestException("Choose a department that belongs to the selected faculty");
    }
    if (!["HMS", "ENG", "AGR"].includes(department.faculty.code)) {
      throw new BadRequestException("Faculty must be Health and Medical Sciences, Engineering, or Agriculture");
    }
  }

  private async resolveProgramme(
    facultyId: string,
    departmentId: string,
    name: string,
  ) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("Programme is required");
    const existing = await this.prisma.programme.findFirst({
      where: {
        departmentId,
        name: { equals: trimmed, mode: "insensitive" },
      },
    });
    if (existing) {
      return this.prisma.programme.update({
        where: { id: existing.id },
        data: { facultyId, departmentId },
      });
    }
    const codeBase = trimmed.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() || "PROG";
    return this.prisma.programme.create({
      data: {
        code: `${codeBase}-${Date.now().toString(36).toUpperCase()}`,
        name: trimmed,
        facultyId,
        departmentId,
      },
    });
  }

  private async findLecturerAccountByEmail(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    const lecturer = await this.prisma.lecturer.findUnique({ where: { email } });
    if (!lecturer) return null;
    return this.prisma.userAccount.findUnique({
      where: { lecturerId: lecturer.id },
      include: { student: true, lecturer: true },
    });
  }

  private async findAdminByEmail(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();
    return this.prisma.userAccount.findUnique({
      where: { adminEmail: email },
      include: { student: true, lecturer: true },
    });
  }

  private async issueSession(
    accountId: string,
    role: UserRole,
    res: Response,
  ): Promise<void> {
    const payload: JwtPayload = { sub: accountId, role };
    const access = await this.jwt.signAsync(payload);
    const refresh = randomBytes(32).toString("hex");
    const days = 7;
    await this.prisma.refreshToken.create({
      data: {
        accountId,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });
    const secure = this.config.get("nodeEnv", { infer: true }) === "production";
    res.cookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
  }
}

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function displayName(firstName: string, lastName: string): string {
  if (!lastName || lastName === firstName) return firstName;
  return `${firstName} ${lastName}`.trim();
}

function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Student", lastName: "Student" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}
