import { BadRequestException, Injectable } from "@nestjs/common";
import { ImportKind } from "@scriptgrade/domain";
import { readFile } from "fs/promises";
import { join } from "path";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/types/actor";
import { PrismaService } from "../prisma/prisma.service";
import { CsvRow, optional, parseCsv, required } from "./csv";

type RowError = { line: number; message: string };

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listStudents() {
    return this.prisma.student.findMany({
      orderBy: { matricule: "asc" },
      select: {
        id: true,
        matricule: true,
        universityEmail: true,
        firstName: true,
        lastName: true,
        active: true,
        level: true,
        onboardingCompletedAt: true,
        account: { select: { id: true } },
      },
    });
  }

  async listLecturers() {
    const rows = await this.prisma.lecturer.findMany({
      orderBy: { email: "asc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        onboardingCompletedAt: true,
        account: { select: { id: true, passwordHash: true } },
      },
    });
    return rows.map(({ account, ...row }) => ({
      ...row,
      hasAccount: !!account,
      hasPassword: !!account?.passwordHash,
    }));
  }

  findLecturerByEmail(email: string) {
    return this.prisma.lecturer.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  async createLecturerRecord(args: {
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const email = args.email.trim().toLowerCase();
    return this.prisma.lecturer.upsert({
      where: { email },
      create: {
        email,
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        active: true,
      },
      update: {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        active: true,
      },
    });
  }

  async setupStatus() {
    const [
      campuses,
      faculties,
      departments,
      programmes,
      courses,
      terms,
      offerings,
      students,
      lecturers,
      enrolments,
      offeringLecturers,
    ] = await Promise.all([
      this.prisma.campus.count(),
      this.prisma.faculty.count(),
      this.prisma.department.count(),
      this.prisma.programme.count(),
      this.prisma.course.count(),
      this.prisma.academicTerm.count(),
      this.prisma.courseOffering.count(),
      this.prisma.student.count(),
      this.prisma.lecturer.count(),
      this.prisma.enrolment.count(),
      this.prisma.offeringLecturer.count(),
    ]);
    const lecturerRows = await this.listLecturers();
    return {
      campuses,
      faculties,
      departments,
      programmes,
      courses,
      terms,
      offerings,
      students,
      lecturers,
      enrolments,
      offeringLecturers,
      lecturersReady: lecturerRows.filter((l) => l.hasPassword).length,
    };
  }

  async importDemo(actor: Actor) {
    const dir = join(process.cwd(), "fixtures");
    const steps: { kind: ImportKind; file: string }[] = [
      { kind: ImportKind.CAMPUSES, file: "campuses.csv" },
      { kind: ImportKind.FACULTIES, file: "faculties.csv" },
      { kind: ImportKind.DEPARTMENTS, file: "departments.csv" },
      { kind: ImportKind.PROGRAMMES, file: "programmes.csv" },
      { kind: ImportKind.COURSES, file: "courses.csv" },
      { kind: ImportKind.TERMS, file: "terms.csv" },
      { kind: ImportKind.OFFERINGS, file: "offerings.csv" },
    ];
    const results = [];
    for (const step of steps) {
      const buffer = await readFile(join(dir, step.file));
      results.push(
        await this.importCsv({
          kind: step.kind,
          filename: step.file,
          buffer,
          actor,
        }),
      );
    }
    return results;
  }

  async importCsv(args: {
    kind: ImportKind;
    filename: string;
    buffer: Buffer;
    actor: Actor;
  }) {
    const rows = parseCsv(args.buffer);
    const errors: RowError[] = [];
    let success = 0;
    for (let i = 0; i < rows.length; i++) {
      const line = i + 2;
      try {
        await this.upsert(args.kind, rows[i], line);
        success += 1;
      } catch (err) {
        errors.push({
          line,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    const batch = await this.prisma.importBatch.create({
      data: {
        kind: args.kind,
        filename: args.filename,
        actorId: args.actor.accountId,
        rowCount: rows.length,
        successCount: success,
        errorCount: errors.length,
        errors: errors,
      },
    });
    await this.audit.record({
      actorId: args.actor.accountId,
      action: "import.csv",
      entityType: "ImportBatch",
      entityId: batch.id,
      after: { kind: args.kind, success, errors: errors.length },
    });
    return {
      id: batch.id,
      kind: args.kind,
      rowCount: rows.length,
      successCount: success,
      errorCount: errors.length,
      errors,
    };
  }

  private async upsert(kind: ImportKind, row: CsvRow, line: number): Promise<void> {
    switch (kind) {
      case ImportKind.CAMPUSES:
        return this.campus(row, line);
      case ImportKind.FACULTIES:
        return this.faculty(row, line);
      case ImportKind.DEPARTMENTS:
        return this.department(row, line);
      case ImportKind.PROGRAMMES:
        return this.programme(row, line);
      case ImportKind.COURSES:
        return this.course(row, line);
      case ImportKind.TERMS:
        return this.term(row, line);
      case ImportKind.OFFERINGS:
        return this.offering(row, line);
      case ImportKind.ENROLMENTS:
        return this.enrolment(row, line);
      case ImportKind.OFFERING_LECTURERS:
        return this.offeringLecturer(row, line);
      default:
        throw new BadRequestException(`Unknown import kind ${kind}`);
    }
  }

  private async campus(row: CsvRow, line: number) {
    const code = required(row, "code", line).toUpperCase();
    await this.prisma.campus.upsert({
      where: { code },
      create: {
        code,
        name: required(row, "name", line),
        timezone: optional(row, "timezone") ?? "UTC",
      },
      update: {
        name: required(row, "name", line),
        timezone: optional(row, "timezone") ?? undefined,
      },
    });
  }

  private async faculty(row: CsvRow, line: number) {
    const code = required(row, "code", line).toUpperCase();
    await this.prisma.faculty.upsert({
      where: { code },
      create: { code, name: required(row, "name", line) },
      update: { name: required(row, "name", line) },
    });
  }

  private async department(row: CsvRow, line: number) {
    const code = required(row, "code", line).toUpperCase();
    const facultyCode = required(row, "facultyCode", line).toUpperCase();
    const faculty = await this.prisma.faculty.findUnique({ where: { code: facultyCode } });
    if (!faculty) throw new Error(`Line ${line}: unknown faculty ${facultyCode}`);
    await this.prisma.department.upsert({
      where: { code },
      create: { code, name: required(row, "name", line), facultyId: faculty.id },
      update: { name: required(row, "name", line), facultyId: faculty.id },
    });
  }

  private async programme(row: CsvRow, line: number) {
    const code = required(row, "code", line).toUpperCase();
    const department = await this.findDepartment(optional(row, "departmentCode"));
    const faculty =
      (await this.findFaculty(optional(row, "facultyCode"))) ??
      (department
        ? await this.prisma.faculty.findUnique({ where: { id: department.facultyId } })
        : null);
    await this.prisma.programme.upsert({
      where: { code },
      create: {
        code,
        name: required(row, "name", line),
        facultyId: faculty?.id,
        departmentId: department?.id,
      },
      update: {
        name: required(row, "name", line),
        facultyId: faculty?.id,
        departmentId: department?.id,
      },
    });
  }

  private async course(row: CsvRow, line: number) {
    const code = required(row, "code", line).toUpperCase();
    await this.prisma.course.upsert({
      where: { code },
      create: { code, title: required(row, "title", line) },
      update: { title: required(row, "title", line) },
    });
  }

  private async term(row: CsvRow, line: number) {
    const code = required(row, "code", line).toUpperCase();
    await this.prisma.academicTerm.upsert({
      where: { code },
      create: { code, name: required(row, "name", line) },
      update: { name: required(row, "name", line) },
    });
  }

  private async offering(row: CsvRow, line: number) {
    const offeringKey = required(row, "offeringKey", line);
    const courseCode = required(row, "courseCode", line).toUpperCase();
    const termCode = required(row, "termCode", line).toUpperCase();
    const campusCode = required(row, "campusCode", line).toUpperCase();
    const programmeCode = required(row, "programmeCode", line).toUpperCase();
    const [course, term, campus, programme] = await Promise.all([
      this.prisma.course.findUnique({ where: { code: courseCode } }),
      this.prisma.academicTerm.findUnique({ where: { code: termCode } }),
      this.prisma.campus.findUnique({ where: { code: campusCode } }),
      this.prisma.programme.findUnique({ where: { code: programmeCode } }),
    ]);
    if (!course) throw new Error(`Line ${line}: unknown course ${courseCode}`);
    if (!term) throw new Error(`Line ${line}: unknown term ${termCode}`);
    if (!campus) throw new Error(`Line ${line}: unknown campus ${campusCode}`);
    if (!programme) throw new Error(`Line ${line}: unknown programme ${programmeCode}`);
    await this.prisma.courseOffering.upsert({
      where: { offeringKey },
      create: {
        offeringKey,
        courseId: course.id,
        termId: term.id,
        campusId: campus.id,
        programmeId: programme.id,
        level: required(row, "level", line),
        group: optional(row, "group"),
        timezone: optional(row, "timezone"),
        active: optional(row, "active") !== "false",
      },
      update: {
        courseId: course.id,
        termId: term.id,
        campusId: campus.id,
        programmeId: programme.id,
        level: required(row, "level", line),
        group: optional(row, "group"),
        timezone: optional(row, "timezone"),
        active: optional(row, "active") !== "false",
      },
    });
  }

  private async enrolment(row: CsvRow, line: number) {
    const matricule = required(row, "matricule", line).trim().toUpperCase();
    const offeringKey = required(row, "offeringKey", line);
    const student = await this.prisma.student.findUnique({ where: { matricule } });
    const offering = await this.prisma.courseOffering.findUnique({
      where: { offeringKey },
    });
    if (!student) throw new Error(`Line ${line}: no registered student with matricule ${matricule}`);
    if (!offering) throw new Error(`Line ${line}: unknown offering ${offeringKey}`);
    const active = optional(row, "active") !== "false";
    await this.prisma.enrolment.upsert({
      where: {
        studentId_offeringId: { studentId: student.id, offeringId: offering.id },
      },
      create: { studentId: student.id, offeringId: offering.id, active },
      update: { active },
    });
  }

  private async findFaculty(code?: string) {
    return code
      ? this.prisma.faculty.findUnique({ where: { code: code.toUpperCase() } })
      : null;
  }

  private async findDepartment(code?: string) {
    return code
      ? this.prisma.department.findUnique({ where: { code: code.toUpperCase() } })
      : null;
  }

  private async findProgramme(code?: string) {
    return code
      ? this.prisma.programme.findUnique({ where: { code: code.toUpperCase() } })
      : null;
  }

  private async offeringLecturer(row: CsvRow, line: number) {
    const email = required(row, "email", line).toLowerCase();
    const offeringKey = required(row, "offeringKey", line);
    const lecturer = await this.prisma.lecturer.findUnique({ where: { email } });
    const offering = await this.prisma.courseOffering.findUnique({
      where: { offeringKey },
    });
    if (!lecturer) throw new Error(`Line ${line}: no registered lecturer with email ${email}`);
    if (!offering) throw new Error(`Line ${line}: unknown offering ${offeringKey}`);
    await this.prisma.offeringLecturer.upsert({
      where: {
        offeringId_lecturerId: {
          offeringId: offering.id,
          lecturerId: lecturer.id,
        },
      },
      create: { offeringId: offering.id, lecturerId: lecturer.id },
      update: {},
    });
  }
}
