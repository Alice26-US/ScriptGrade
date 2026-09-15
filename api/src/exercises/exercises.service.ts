import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  assertCriteriaSumToMax,
  assertGradeBandsCoverScale,
  assertGraceSeconds,
  assertPageLimits,
  assertSpellingCriteriaValid,
  CriterionKind,
  DEFAULT_GRACE_SECONDS,
  DEFAULT_SIMILARITY_THRESHOLD,
  deriveExerciseStatus,
  ExerciseStatus,
  SYSTEM_MAX_PAGES,
} from "@scriptgrade/domain";
import { AcademicService } from "../academic/academic.service";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/types/actor";
import { PrismaService } from "../prisma/prisma.service";
import { GrantAccessDto, UpsertExerciseDto } from "./dto";

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly academic: AcademicService,
  ) {}

  async create(actor: Actor, dto: UpsertExerciseDto) {
    const lecturerId = this.requireLecturer(actor);
    await this.academic.assertLecturerCanUseOffering(lecturerId, dto.offeringId);
    this.validateDraft(dto);
    const exercise = await this.prisma.exercise.create({
      data: {
        ...this.baseData(dto, lecturerId),
        criteria: { create: dto.criteria.map((c) => this.criterionData(c)) },
        bands: { create: dto.bands.map((b) => this.bandData(b)) },
      },
      include: { criteria: true, bands: true, offering: { include: { campus: true } } },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "exercise.create",
      entityType: "Exercise",
      entityId: exercise.id,
    });
    return this.present(exercise);
  }

  async update(actor: Actor, id: string, dto: UpsertExerciseDto) {
    const exercise = await this.getWritable(actor, id);
    if (exercise.rubricFrozen) {
      throw new ForbiddenException("Rubric is frozen after publish");
    }
    this.validateDraft(dto);
    if (dto.offeringId !== exercise.offeringId) {
      throw new ForbiddenException("Cannot move an exercise to another offering");
    }
    await this.prisma.$transaction([
      this.prisma.rubricCriterion.deleteMany({ where: { exerciseId: id } }),
      this.prisma.gradeBand.deleteMany({ where: { exerciseId: id } }),
      this.prisma.exercise.update({
        where: { id },
        data: this.baseData(dto, exercise.ownerLecturerId),
      }),
      this.prisma.rubricCriterion.createMany({
        data: dto.criteria.map((c) => ({ exerciseId: id, ...this.criterionData(c) })),
      }),
      this.prisma.gradeBand.createMany({
        data: dto.bands.map((b) => ({ exerciseId: id, ...this.bandData(b) })),
      }),
    ]);
    await this.audit.record({
      actorId: actor.accountId,
      action: "exercise.update",
      entityType: "Exercise",
      entityId: id,
    });
    return this.getById(actor, id);
  }

  async publish(actor: Actor, id: string) {
    const exercise = await this.getWritable(actor, id);
    const full = await this.prisma.exercise.findUniqueOrThrow({
      where: { id },
      include: { criteria: true, bands: true },
    });
    const criteria = full.criteria.map((c) => ({
      name: c.name,
      maxPoints: Number(c.maxPoints),
      kind: c.kind,
      sortOrder: c.sortOrder,
      spellingDeduction: c.spellingDeduction != null ? Number(c.spellingDeduction) : null,
      spellingFloor: c.spellingFloor != null ? Number(c.spellingFloor) : null,
    }));
    const bands = full.bands.map((b) => ({
      minScore: Number(b.minScore),
      maxScore: Number(b.maxScore),
      labelEn: b.labelEn,
      labelFr: b.labelFr,
    }));
    assertCriteriaSumToMax(criteria, Number(full.maxScore));
    assertSpellingCriteriaValid(criteria);
    assertGradeBandsCoverScale(bands, Number(full.maxScore));
    assertPageLimits(full.maxPages, full.minPages);
    assertGraceSeconds(full.graceSeconds);
    const now = new Date();
    const status =
      now >= full.closesAt
        ? ExerciseStatus.CLOSED
        : now >= full.opensAt
          ? ExerciseStatus.OPEN
          : ExerciseStatus.PUBLISHED;
    const updated = await this.prisma.exercise.update({
      where: { id },
      data: { status, rubricFrozen: true },
      include: { criteria: true, bands: true, offering: { include: { campus: true } } },
    });
    const enrolled = await this.academic.enrolMatchingStudents(exercise.offeringId);
    await this.audit.record({
      actorId: actor.accountId,
      action: "exercise.publish",
      entityType: "Exercise",
      entityId: id,
      after: { status, enrolled },
    });
    return { ...this.present(updated), enrolled };
  }

  async enrolStudent(actor: Actor, exerciseId: string, matricule: string) {
    const exercise = await this.getWritable(actor, exerciseId);
    return this.academic.enrolStudentByMatricule(exercise.offeringId, matricule);
  }

  async grantAccess(actor: Actor, id: string, dto: GrantAccessDto) {
    const exercise = await this.getWritable(actor, id);
    const membership = await this.prisma.offeringLecturer.findUnique({
      where: {
        offeringId_lecturerId: {
          offeringId: exercise.offeringId,
          lecturerId: dto.lecturerId,
        },
      },
    });
    if (!membership && actor.role !== "ADMIN") {
      throw new ForbiddenException("Lecturer is not assigned to this offering");
    }
    await this.prisma.exerciseAccess.upsert({
      where: {
        exerciseId_lecturerId: { exerciseId: id, lecturerId: dto.lecturerId },
      },
      create: {
        exerciseId: id,
        lecturerId: dto.lecturerId,
        grantedById: actor.lecturerId ?? undefined,
      },
      update: {},
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "exercise.grant_access",
      entityType: "Exercise",
      entityId: id,
      after: { lecturerId: dto.lecturerId },
    });
    return { ok: true };
  }

  async reassignOwner(actor: Actor, id: string, lecturerId: string) {
    if (actor.role !== "ADMIN") throw new ForbiddenException();
    await this.prisma.exercise.update({
      where: { id },
      data: { ownerLecturerId: lecturerId },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "exercise.reassign_owner",
      entityType: "Exercise",
      entityId: id,
      after: { lecturerId },
    });
    return { ok: true };
  }

  async listFor(actor: Actor) {
    const where =
      actor.role === "ADMIN"
        ? {}
        : actor.role === "LECTURER" && actor.lecturerId
          ? {
              OR: [
                { ownerLecturerId: actor.lecturerId },
                { access: { some: { lecturerId: actor.lecturerId } } },
              ],
            }
          : actor.role === "STUDENT" && actor.studentId
            ? {
                status: { not: "DRAFT" as const },
                offering: await this.academic.studentOfferingWhere(actor.studentId),
              }
            : { id: "__none__" };
    const rows = await this.prisma.exercise.findMany({
      where,
      include: {
        criteria: { orderBy: { sortOrder: "asc" } },
        bands: true,
        owner: { select: { firstName: true, lastName: true } },
        offering: { include: { campus: true, course: true } },
      },
      orderBy: { closesAt: "asc" },
    });
    return rows.map((e) => this.present(e, actor.role === "STUDENT"));
  }

  async getById(actor: Actor, id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: {
        criteria: { orderBy: { sortOrder: "asc" } },
        bands: true,
        owner: { select: { firstName: true, lastName: true } },
        offering: { include: { campus: true, course: true } },
      },
    });
    if (!exercise) throw new NotFoundException();
    await this.assertCanRead(actor, exercise);
    return this.present(exercise, actor.role === "STUDENT");
  }

  async assertCanMark(actor: Actor, exerciseId: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
    });
    if (!exercise) throw new NotFoundException();
    if (actor.role === "ADMIN") return exercise;
    if (!actor.lecturerId) throw new ForbiddenException();
    if (exercise.ownerLecturerId === actor.lecturerId) return exercise;
    const access = await this.prisma.exerciseAccess.findUnique({
      where: {
        exerciseId_lecturerId: {
          exerciseId,
          lecturerId: actor.lecturerId,
        },
      },
    });
    if (!access) throw new ForbiddenException("Not authorized to mark this exercise");
    return exercise;
  }

  private async getWritable(actor: Actor, id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException();
    if (actor.role === "ADMIN") return exercise;
    if (!actor.lecturerId) throw new ForbiddenException();
    if (exercise.ownerLecturerId === actor.lecturerId) return exercise;
    throw new ForbiddenException("Only the owner or an admin can edit this exercise");
  }

  private async assertCanRead(
    actor: Actor,
    exercise: { id: string; ownerLecturerId: string; offeringId: string; status: string },
  ) {
    if (actor.role === "ADMIN") return;
    if (actor.role === "LECTURER" && actor.lecturerId) {
      if (exercise.ownerLecturerId === actor.lecturerId) return;
      const access = await this.prisma.exerciseAccess.findUnique({
        where: {
          exerciseId_lecturerId: {
            exerciseId: exercise.id,
            lecturerId: actor.lecturerId,
          },
        },
      });
      if (access) return;
      throw new ForbiddenException();
    }
    if (actor.role === "STUDENT" && actor.studentId) {
      if (exercise.status === "DRAFT") throw new ForbiddenException();
      await this.academic.ensureStudentEnrolment(actor.studentId, exercise.offeringId);
      return;
    }
    throw new ForbiddenException();
  }

  private requireLecturer(actor: Actor): string {
    if (actor.role === "ADMIN") {
      throw new ForbiddenException("Admin is not a routine marker; reassign after create");
    }
    if (actor.role !== "LECTURER" || !actor.lecturerId) {
      throw new ForbiddenException();
    }
    return actor.lecturerId;
  }

  private validateDraft(dto: UpsertExerciseDto) {
    assertPageLimits(dto.maxPages ?? SYSTEM_MAX_PAGES, dto.minPages ?? 1);
    assertGraceSeconds(dto.graceSeconds ?? DEFAULT_GRACE_SECONDS);
    assertCriteriaSumToMax(dto.criteria, dto.maxScore);
    assertSpellingCriteriaValid(
      dto.criteria.map((c) => ({
        ...c,
        spellingDeduction: c.spellingDeduction ?? null,
        spellingFloor: c.spellingFloor ?? null,
      })),
    );
    assertGradeBandsCoverScale(dto.bands, dto.maxScore);
    if (new Date(dto.closesAt) <= new Date(dto.opensAt)) {
      throw new ForbiddenException("closesAt must be after opensAt");
    }
  }

  private baseData(dto: UpsertExerciseDto, ownerLecturerId: string) {
    return {
      offeringId: dto.offeringId,
      ownerLecturerId,
      title: dto.title,
      prompt: dto.prompt,
      language: dto.language,
      maxScore: dto.maxScore,
      minWords: dto.minWords ?? 0,
      maxPages: dto.maxPages ?? SYSTEM_MAX_PAGES,
      minPages: dto.minPages ?? 1,
      opensAt: new Date(dto.opensAt),
      closesAt: new Date(dto.closesAt),
      graceSeconds: dto.graceSeconds ?? DEFAULT_GRACE_SECONDS,
      similarityThreshold: dto.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD,
      showSpellingToStudent: dto.showSpellingToStudent ?? true,
    };
  }

  private criterionData(c: UpsertExerciseDto["criteria"][number]) {
    return {
      name: c.name,
      maxPoints: c.maxPoints,
      kind: c.kind,
      sortOrder: c.sortOrder,
      spellingDeduction:
        c.kind === CriterionKind.SPELLING ? (c.spellingDeduction ?? 0.25) : null,
      spellingFloor: c.kind === CriterionKind.SPELLING ? (c.spellingFloor ?? 0) : null,
    };
  }

  private bandData(b: UpsertExerciseDto["bands"][number]) {
    return {
      minScore: b.minScore,
      maxScore: b.maxScore,
      labelEn: b.labelEn,
      labelFr: b.labelFr,
    };
  }

  private present(
    exercise: {
      status: ExerciseStatus;
      opensAt: Date;
      closesAt: Date;
      offering: { timezone: string | null; campus: { timezone: string } };
    },
    studentView = false,
  ) {
    const live = deriveExerciseStatus({
      stored: exercise.status,
      opensAt: exercise.opensAt,
      closesAt: exercise.closesAt,
      now: new Date(),
    });
    return {
      ...exercise,
      status: live,
      timezone: this.academic.offeringTimezone(exercise.offering),
      ...(studentView
        ? {}
        : {}),
    };
  }
}
