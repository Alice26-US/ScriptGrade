import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  assertSlotCount,
  canReplacePageDuringGrace,
  canStudentInitiateResubmit,
  deriveExerciseStatus,
  PageQuality,
  studentFacingStatus,
  VersionSource,
} from "@scriptgrade/domain";
import { createHash } from "crypto";
import { AcademicService } from "../academic/academic.service";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/types/actor";
import { AppConfig } from "../config/configuration";
import { STORAGE, StoragePort } from "../files/storage.port";
import { PrismaService } from "../prisma/prisma.service";
import { QUALITY, QualityPort } from "../processing/ports/quality.port";
import { ProcessingService } from "../processing/processing.service";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly academic: AcademicService,
    private readonly processing: ProcessingService,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(STORAGE) private readonly storage: StoragePort,
    @Inject(QUALITY) private readonly quality: QualityPort,
  ) {}

  async getMine(actor: Actor, exerciseId: string) {
    this.requireStudent(actor);
    const submission = await this.prisma.submission.findUnique({
      where: {
        exerciseId_studentId: { exerciseId, studentId: actor.studentId! },
      },
      include: {
        currentVersion: { include: { pages: true, reservation: true } },
        exercise: true,
      },
    });
    if (!submission) {
      return { status: "draft", studentFacing: "draft" };
    }
    return {
      id: submission.id,
      status: submission.status,
      studentFacing: studentFacingStatus(
        submission.status,
        !!submission.releasedAt,
      ),
      currentVersion: submission.currentVersion,
      releasedAt: submission.releasedAt,
    };
  }

  async saveDraft(
    actor: Actor,
    exerciseId: string,
    slot: number,
    file: Express.Multer.File,
  ) {
    const studentId = this.requireStudent(actor);
    const exercise = await this.requireEnrolledOpenish(studentId, exerciseId, true);
    this.assertImage(file);
    const retainUntil = this.retainUntil();
    const key = `drafts/${exerciseId}/${studentId}/slot-${slot}-${Date.now()}`;
    const stored = await this.storage.put({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    const sha256 = sha(file.buffer);
    const page = await this.prisma.draftPage.upsert({
      where: {
        studentId_exerciseId_slot: { studentId, exerciseId, slot },
      },
      create: {
        studentId,
        exerciseId,
        slot,
        storageKey: stored.key,
        sha256,
        retainUntil,
      },
      update: { storageKey: stored.key, sha256, retainUntil },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "draft.backup",
      entityType: "DraftPage",
      entityId: page.id,
      after: { slot, exerciseId },
    });
    return { slot, backedUp: true, sha256 };
  }

  async reserve(
    actor: Actor,
    exerciseId: string,
    slots: number[],
    source: VersionSource = VersionSource.STUDENT,
  ) {
    const studentId = this.requireStudent(actor);
    const exercise = await this.requireEnrolledOpenish(studentId, exerciseId, false);
    const unique = [...new Set(slots)].sort((a, b) => a - b);
    if (unique.length !== slots.length || unique.some((s, i) => s !== i + 1 && s !== i)) {
      // slots should be 1..n
    }
    const ordered = unique.length ? unique : [];
    if (ordered[0] !== 1 || ordered.some((s, i) => s !== i + 1)) {
      throw new BadRequestException("Slots must be contiguous starting at 1");
    }
    assertSlotCount(ordered.length, exercise.minPages, exercise.maxPages);

    let submission = await this.prisma.submission.findUnique({
      where: { exerciseId_studentId: { exerciseId, studentId } },
      include: { returnRequests: { where: { resolvedAt: null } } },
    });

    const live = deriveExerciseStatus({
      stored: exercise.status,
      opensAt: exercise.opensAt,
      closesAt: exercise.closesAt,
      now: new Date(),
    });
    const returnActive = (submission?.returnRequests.length ?? 0) > 0;
    const gate = canStudentInitiateResubmit({
      exerciseStatus: live,
      closesAt: returnActive
        ? submission!.returnRequests[0].personalDueAt
        : exercise.closesAt,
      now: new Date(),
      reviewStarted: !!submission?.reviewStartedAt,
      finalizedOrReleased:
        submission?.status === "GRADED" ||
        submission?.status === "RELEASED" ||
        !!submission?.releasedAt,
      studentResubmitCount: submission?.studentResubmitCount ?? 0,
      lecturerReturnActive: returnActive,
    });
    if (submission?.currentVersionId && !gate.ok) {
      throw new ForbiddenException(gate.reason);
    }

    if (!submission) {
      submission = await this.prisma.submission.create({
        data: { exerciseId, studentId, status: "RESERVING" },
        include: { returnRequests: { where: { resolvedAt: null } } },
      });
    }

    const increment =
      source === VersionSource.STUDENT && submission.currentVersionId
        ? { studentResubmitCount: { increment: 1 } }
        : {};

    const version = await this.prisma.submissionVersion.create({
      data: {
        submissionId: submission.id,
        source,
        reservationCreatedAt: new Date(),
        pageCount: ordered.length,
        isCurrent: false,
        pages: {
          create: ordered.map((slot) => ({
            slot,
            retainUntil: this.retainUntil(),
            quality: "PENDING",
          })),
        },
      },
    });

    const expiresAt = new Date(Date.now() + exercise.graceSeconds * 1000);
    const reservation = await this.prisma.uploadReservation.create({
      data: {
        versionId: version.id,
        slotCount: ordered.length,
        expiresAt,
        status: "ACTIVE",
      },
    });

    await this.prisma.submission.update({
      where: { id: submission.id },
      data: { status: "UPLOADING", ...increment },
    });

    await this.processing.enqueueExpire(reservation.id, expiresAt);
    await this.audit.record({
      actorId: actor.accountId,
      action: "submission.reserve",
      entityType: "SubmissionVersion",
      entityId: version.id,
      after: {
        reservationCreatedAt: version.reservationCreatedAt,
        slots: ordered.length,
        expiresAt,
      },
    });

    return {
      submissionId: submission.id,
      versionId: version.id,
      reservationId: reservation.id,
      reservationCreatedAt: version.reservationCreatedAt,
      expiresAt,
      slots: ordered,
      message:
        "Not submitted until the server confirms every page. Phone clock is not used.",
    };
  }

  async uploadPage(
    actor: Actor,
    versionId: string,
    slot: number,
    file: Express.Multer.File,
  ) {
    const studentId = this.requireStudent(actor);
    this.assertImage(file);
    const version = await this.prisma.submissionVersion.findUnique({
      where: { id: versionId },
      include: {
        reservation: true,
        pages: true,
        submission: true,
      },
    });
    if (!version || version.submission.studentId !== studentId) {
      throw new NotFoundException();
    }
    const reservation = version.reservation;
    if (!reservation || reservation.status !== "ACTIVE") {
      throw new ForbiddenException("Reservation is not active");
    }
    if (new Date() >= reservation.expiresAt) {
      throw new ForbiddenException("Grace period expired");
    }
    const page = version.pages.find((p) => p.slot === slot);
    if (!page) throw new BadRequestException("Unknown slot — cannot add pages after reserve");

    const sha256 = sha(file.buffer);
    const inspect = await this.quality.inspect(file.buffer);
    if (page.originalKey) {
      if (page.quality === PageQuality.OK) {
        throw new ForbiddenException("This slot is already uploaded");
      }
      const allowed = canReplacePageDuringGrace({
        reservationActive: true,
        graceExpiresAt: reservation.expiresAt,
        now: new Date(),
        quality: page.quality,
        checksumFailed: page.quality === PageQuality.FAIL_CHECKSUM,
      });
      if (!allowed.ok) {
        throw new ForbiddenException(allowed.reason);
      }
    }

    const key = `submissions/${version.submission.exerciseId}/${version.submissionId}/${version.id}/slot-${slot}`;
    const stored = await this.storage.put({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const updated = await this.prisma.submissionPage.update({
      where: { id: page.id },
      data: {
        originalKey: stored.key,
        workingKey: stored.key,
        sha256,
        byteSize: stored.byteSize,
        mimeType: file.mimetype,
        quality: inspect.quality,
        replaceCount: page.originalKey ? { increment: 1 } : undefined,
      },
    });

    if (page.originalKey) {
      await this.audit.record({
        actorId: actor.accountId,
        action: "page.replace",
        entityType: "SubmissionPage",
        entityId: page.id,
        after: { slot, quality: inspect.quality, sha256 },
      });
    }

    return {
      slot,
      quality: updated.quality,
      sha256,
      replaceable: updated.quality !== "OK",
    };
  }

  async complete(actor: Actor, versionId: string) {
    const studentId = this.requireStudent(actor);
    const version = await this.prisma.submissionVersion.findUnique({
      where: { id: versionId },
      include: {
        reservation: true,
        pages: { orderBy: { slot: "asc" } },
        submission: true,
      },
    });
    if (!version || version.submission.studentId !== studentId) {
      throw new NotFoundException();
    }
    const reservation = version.reservation;
    if (!reservation) throw new BadRequestException();
    if (new Date() >= reservation.expiresAt && reservation.status === "ACTIVE") {
      await this.processing.expireReservation(reservation.id);
      throw new ForbiddenException(
        "Grace period expired with incomplete pages — not submitted",
      );
    }
    const missing = version.pages.filter(
      (p) => !p.originalKey || p.quality !== "OK",
    );
    if (missing.length) {
      throw new BadRequestException(
        `Cannot confirm submit: ${missing.length} page(s) missing or failed quality`,
      );
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.submissionVersion.updateMany({
        where: { submissionId: version.submissionId, isCurrent: true },
        data: { isCurrent: false },
      }),
      this.prisma.submissionVersion.update({
        where: { id: version.id },
        data: { completedAt: now, isCurrent: true },
      }),
      this.prisma.uploadReservation.update({
        where: { id: reservation.id },
        data: { status: "COMPLETED" },
      }),
      this.prisma.submission.update({
        where: { id: version.submissionId },
        data: {
          currentVersionId: version.id,
          status: "SUBMITTED",
        },
      }),
      this.prisma.returnRequest.updateMany({
        where: { submissionId: version.submissionId, resolvedAt: null },
        data: { resolvedAt: now },
      }),
    ]);

    await this.processing.enqueueVersion(version.id);
    await this.audit.record({
      actorId: actor.accountId,
      action: "submission.complete",
      entityType: "Submission",
      entityId: version.submissionId,
      after: {
        versionId: version.id,
        reservationCreatedAt: version.reservationCreatedAt,
        completedAt: now,
      },
    });

    return {
      status: "submitted",
      message: `Submitted successfully — ${now.toISOString()}`,
      reservationCreatedAt: version.reservationCreatedAt,
      completedAt: now,
    };
  }

  private requireStudent(actor: Actor): string {
    if (actor.role !== "STUDENT" || !actor.studentId) {
      throw new ForbiddenException();
    }
    return actor.studentId;
  }

  private async requireEnrolledOpenish(
    studentId: string,
    exerciseId: string,
    allowClosedDraft: boolean,
  ) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { offering: { include: { campus: true } } },
    });
    if (!exercise) throw new NotFoundException();
    await this.academic.ensureStudentEnrolment(studentId, exercise.offeringId);
    const live = deriveExerciseStatus({
      stored: exercise.status,
      opensAt: exercise.opensAt,
      closesAt: exercise.closesAt,
      now: new Date(),
    });
    if (exercise.status === "DRAFT") throw new ForbiddenException();
    if (!allowClosedDraft && live !== "OPEN" && live !== "PUBLISHED") {
      const openReturn = await this.prisma.returnRequest.findFirst({
        where: {
          exerciseId,
          resolvedAt: null,
          submission: { studentId },
          personalDueAt: { gt: new Date() },
        },
      });
      if (!openReturn) {
        throw new ForbiddenException("Exercise is not open");
      }
    }
    return exercise;
  }

  private assertImage(file: Express.Multer.File) {
    if (!file) throw new BadRequestException("File required");
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException("Pages must be JPEG, PNG, or WebP");
    }
    if (file.size > 12 * 1024 * 1024) {
      throw new BadRequestException("Page exceeds 12MB");
    }
  }

  private retainUntil(): Date {
    const years = this.config.get("retentionYears", { infer: true });
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    return d;
  }
}

function sha(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
