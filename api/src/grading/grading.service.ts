import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  clampCriterionScore,
  computeSpellingScore,
  CriterionKind,
  letterForScore,
  sumCriterionScores,
} from "@scriptgrade/domain";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/types/actor";
import { AppConfig } from "../config/configuration";
import { ExercisesService } from "../exercises/exercises.service";
import { EMAIL, EmailPort } from "../notifications/email.port";
import { Inject } from "@nestjs/common";
import { STORAGE, StoragePort } from "../files/storage.port";
import { PrismaService } from "../prisma/prisma.service";
import { studentFacingStatus } from "./student-visibility";

@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly exercises: ExercisesService,
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(EMAIL) private readonly email: EmailPort,
    @Inject(STORAGE) private readonly storage: StoragePort,
  ) {}

  async queue(actor: Actor, exerciseId: string) {
    await this.exercises.assertCanMark(actor, exerciseId);
    return this.prisma.submission.findMany({
      where: { exerciseId, currentVersionId: { not: null } },
      include: {
        student: { select: { matricule: true, firstName: true, lastName: true } },
        currentVersion: {
          include: {
            pages: { orderBy: { slot: "asc" } },
            wordCount: true,
            aiProposal: { include: { criteria: true } },
            spelling: true,
            similarityHits: true,
          },
        },
        scores: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async startReview(actor: Actor, submissionId: string) {
    const sub = await this.loadForMark(actor, submissionId);
    if (sub.reviewStartedAt) return sub;
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        reviewStartedAt: new Date(),
        reviewerId: actor.lecturerId,
        status: "IN_REVIEW",
      },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "review.start",
      entityType: "Submission",
      entityId: submissionId,
    });
    return updated;
  }

  async setCriterionScore(
    actor: Actor,
    submissionId: string,
    criterionId: string,
    score: number,
    overrideNote?: string,
  ) {
    const sub = await this.loadForMark(actor, submissionId);
    if (!sub.reviewStartedAt) {
      throw new ForbiddenException("Start review before changing scores");
    }
    if (sub.releasedAt && sub.status === "RELEASED") {
      throw new ForbiddenException("Unrelease before changing a released grade");
    }
    const criterion = await this.prisma.rubricCriterion.findUnique({
      where: { id: criterionId },
    });
    if (!criterion || criterion.exerciseId !== sub.exerciseId) {
      throw new NotFoundException();
    }
    const clamped = clampCriterionScore(score, Number(criterion.maxPoints));
    const row = await this.prisma.criterionScore.upsert({
      where: {
        submissionId_criterionId: { submissionId, criterionId },
      },
      create: {
        submissionId,
        criterionId,
        score: clamped,
        overridden: true,
        overrideNote,
      },
      update: { score: clamped, overridden: true, overrideNote },
    });
    await this.recomputeTotal(submissionId);
    await this.audit.record({
      actorId: actor.accountId,
      action: "score.override",
      entityType: "CriterionScore",
      entityId: row.id,
      reason: overrideNote,
      after: { score: clamped, criterionId },
    });
    return this.getOne(actor, submissionId);
  }

  async dismissSpelling(
    actor: Actor,
    errorId: string,
    status: "CONFIRMED" | "DISMISSED",
    reason?: string,
  ) {
    const err = await this.prisma.spellingError.findUnique({
      where: { id: errorId },
      include: { version: { include: { submission: true } } },
    });
    if (!err) throw new NotFoundException();
    await this.exercises.assertCanMark(actor, err.version.submission.exerciseId);
    await this.prisma.spellingError.update({
      where: { id: errorId },
      data: { status, reason },
    });
    const versionId = err.versionId;
    const undismissed = await this.prisma.spellingError.count({
      where: { versionId, status: { not: "DISMISSED" } },
    });
    const spellingCriteria = await this.prisma.rubricCriterion.findMany({
      where: {
        exerciseId: err.version.submission.exerciseId,
        kind: CriterionKind.SPELLING,
      },
    });
    for (const c of spellingCriteria) {
      const score = computeSpellingScore({
        criterionMax: Number(c.maxPoints),
        undismissedErrors: undismissed,
        deduction: Number(c.spellingDeduction ?? 0.25),
        floor: Number(c.spellingFloor ?? 0),
      });
      await this.prisma.criterionScore.upsert({
        where: {
          submissionId_criterionId: {
            submissionId: err.version.submissionId,
            criterionId: c.id,
          },
        },
        create: {
          submissionId: err.version.submissionId,
          criterionId: c.id,
          score,
          overridden: false,
        },
        update: { score, overridden: false },
      });
    }
    await this.recomputeTotal(err.version.submissionId);
    await this.audit.record({
      actorId: actor.accountId,
      action: "spelling.set_status",
      entityType: "SpellingError",
      entityId: errorId,
      reason,
      after: { status },
    });
    return { ok: true, undismissed };
  }

  async saveFeedback(
    actor: Actor,
    submissionId: string,
    body: {
      remarks?: string;
      strengths?: string;
      weaknesses?: string;
      suggestions?: string;
    },
  ) {
    await this.loadForMark(actor, submissionId);
    await this.prisma.lecturerFeedback.upsert({
      where: { submissionId },
      create: {
        submissionId,
        remarks: body.remarks ?? "",
        strengths: body.strengths ?? "",
        weaknesses: body.weaknesses ?? "",
        suggestions: body.suggestions ?? "",
      },
      update: {
        remarks: body.remarks,
        strengths: body.strengths,
        weaknesses: body.weaknesses,
        suggestions: body.suggestions,
      },
    });
    return this.getOne(actor, submissionId);
  }

  async finalize(actor: Actor, submissionId: string) {
    await this.loadForMark(actor, submissionId);
    await this.recomputeTotal(submissionId);
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: "GRADED" },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "grade.finalize",
      entityType: "Submission",
      entityId: submissionId,
    });
    return updated;
  }

  async release(actor: Actor, submissionId: string) {
    const sub = await this.loadForMark(actor, submissionId);
    if (sub.status !== "GRADED" && sub.status !== "RELEASED") {
      throw new BadRequestException("Finalize the grade before release");
    }
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: "RELEASED", releasedAt: new Date() },
      include: { student: true, exercise: true },
    });
    await this.audit.record({
      actorId: actor.accountId,
      action: "grade.release",
      entityType: "Submission",
      entityId: submissionId,
    });
    if (
      this.config.get("releaseEmailEnabled", { infer: true }) &&
      updated.student.universityEmail
    ) {
      await this.email.send({
        to: updated.student.universityEmail,
        subject: `ScriptGrade: ${updated.exercise.title} released`,
        text: "Your exercise result is available in ScriptGrade.",
      });
    }
    return updated;
  }

  async unreleaseAndReturn(
    actor: Actor,
    submissionId: string,
    reason: string,
    personalDueAt: string,
  ) {
    if (!reason?.trim()) throw new BadRequestException("Reason required");
    const sub = await this.loadForMark(actor, submissionId);
    const unreleased = !!sub.releasedAt;
    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: "RETURNED",
          releasedAt: null,
          reviewStartedAt: null,
        },
      }),
      this.prisma.returnRequest.create({
        data: {
          exerciseId: sub.exerciseId,
          submissionId,
          reason,
          personalDueAt: new Date(personalDueAt),
          unreleased,
        },
      }),
    ]);
    await this.audit.record({
      actorId: actor.accountId,
      action: "submission.return",
      entityType: "Submission",
      entityId: submissionId,
      reason,
      after: { personalDueAt, unreleased },
    });
    return { ok: true };
  }

  async studentResult(actor: Actor, submissionId: string) {
    if (actor.role !== "STUDENT" || !actor.studentId) throw new ForbiddenException();
    const sub = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exercise: { include: { criteria: true, bands: true } },
        scores: { include: { criterion: true } },
        feedback: true,
        currentVersion: { include: { spelling: true, wordCount: true } },
      },
    });
    if (!sub || sub.studentId !== actor.studentId) throw new NotFoundException();
    // AI proposals and unofficial marks stay hidden until the lecturer releases.
    if (!sub.releasedAt) {
      return {
        status: studentFacingStatus(sub.status),
        released: false,
      };
    }
    return {
      released: true,
      total: sub.officialTotal,
      letterEn: sub.officialLetterEn,
      letterFr: sub.officialLetterFr,
      maxScore: sub.exercise.maxScore,
      remarks: sub.feedback?.remarks,
      strengths: sub.feedback?.strengths,
      weaknesses: sub.feedback?.weaknesses,
      suggestions: sub.feedback?.suggestions,
      rubric: sub.scores.map((s) => ({
        name: s.criterion.name,
        score: s.score,
        maxPoints: s.criterion.maxPoints,
      })),
      spelling: sub.exercise.showSpellingToStudent
        ? sub.currentVersion?.spelling.filter((e) => e.status !== "DISMISSED")
        : undefined,
    };
  }

  async getOne(actor: Actor, submissionId: string) {
    await this.loadForMark(actor, submissionId);
    const sub = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        exercise: { include: { criteria: { orderBy: { sortOrder: "asc" as const } } } },
        scores: { include: { criterion: true } },
        feedback: true,
        currentVersion: {
          include: {
            pages: { orderBy: { slot: "asc" } },
            ocr: true,
            spelling: true,
            wordCount: true,
            aiProposal: { include: { criteria: true } },
            similarityHits: {
              include: { peerVersion: { include: { submission: true } } },
            },
          },
        },
      },
    });
    if (!sub?.currentVersion) return sub;
    const pages = await Promise.all(
      sub.currentVersion.pages.map(async (page) => ({
        ...page,
        url: page.originalKey
          ? await this.storage.signRead(page.originalKey)
          : null,
      })),
    );
    return {
      ...sub,
      currentVersion: { ...sub.currentVersion, pages },
    };
  }

  async applyProposal(actor: Actor, submissionId: string) {
    const sub = await this.loadForMark(actor, submissionId);
    const proposal = sub.currentVersion?.aiProposal;
    if (!proposal) throw new BadRequestException("No AI proposal yet");
    const criteria = await this.prisma.rubricCriterion.findMany({
      where: { exerciseId: sub.exerciseId },
    });
    const maxById = new Map(criteria.map((c) => [c.id, Number(c.maxPoints)]));
    for (const c of proposal.criteria) {
      if (c.abstained) continue;
      const maxPoints = maxById.get(c.criterionId);
      if (maxPoints == null) continue;
      const proposed = clampCriterionScore(Number(c.proposed), maxPoints);
      await this.prisma.criterionScore.upsert({
        where: {
          submissionId_criterionId: {
            submissionId,
            criterionId: c.criterionId,
          },
        },
        create: {
          submissionId,
          criterionId: c.criterionId,
          score: proposed,
          overridden: false,
        },
        update: { score: proposed, overridden: false },
      });
    }
    await this.prisma.lecturerFeedback.upsert({
      where: { submissionId },
      create: {
        submissionId,
        remarks: "",
        strengths: proposal.strengths,
        weaknesses: proposal.weaknesses,
        suggestions: proposal.suggestions,
      },
      update: {
        strengths: proposal.strengths,
        weaknesses: proposal.weaknesses,
        suggestions: proposal.suggestions,
      },
    });
    await this.recomputeTotal(submissionId);
    await this.audit.record({
      actorId: actor.accountId,
      action: "grade.apply_proposal",
      entityType: "Submission",
      entityId: submissionId,
    });
    return this.getOne(actor, submissionId);
  }

  private async recomputeTotal(submissionId: string) {
    const sub = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: {
        scores: true,
        exercise: { include: { bands: true, criteria: true } },
      },
    });
    const total = clampCriterionScore(
      sumCriterionScores(sub.scores.map((s) => Number(s.score))),
      Number(sub.exercise.maxScore),
    );
    const bands = sub.exercise.bands.map((b) => ({
      minScore: Number(b.minScore),
      maxScore: Number(b.maxScore),
      labelEn: b.labelEn,
      labelFr: b.labelFr,
    }));
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        officialTotal: total,
        officialLetterEn: letterForScore(total, bands, "EN"),
        officialLetterFr: letterForScore(total, bands, "FR"),
      },
    });
  }

  private async loadForMark(actor: Actor, submissionId: string) {
    const sub = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        currentVersion: { include: { aiProposal: { include: { criteria: true } } } },
      },
    });
    if (!sub) throw new NotFoundException();
    await this.exercises.assertCanMark(actor, sub.exerciseId);
    return sub;
  }
}


