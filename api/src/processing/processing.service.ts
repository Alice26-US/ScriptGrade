import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  clampCriterionScore,
  computeSpellingScore,
  CriterionKind,
  PageQuality,
  sumCriterionScores,
} from "@scriptgrade/domain";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { STORAGE, StoragePort } from "../files/storage.port";
import { PrismaService } from "../prisma/prisma.service";
import { OCR, OcrPort } from "./ports/ocr.port";
import { SPELLCHECK, SpellcheckPort } from "./ports/spellcheck.port";
import { VISION, VisionPort } from "./ports/vision.port";
import {
  IMAGE_SIMILARITY,
  ImageSimilarityPort,
  TEXT_SIMILARITY,
  TextSimilarityPort,
} from "./ports/similarity.port";

@Injectable()
export class ProcessingService implements OnModuleInit {
  private readonly log = new Logger(ProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE) private readonly storage: StoragePort,
    @Inject(OCR) private readonly ocr: OcrPort,
    @Inject(SPELLCHECK) private readonly spell: SpellcheckPort,
    @Inject(VISION) private readonly vision: VisionPort,
    @Inject(TEXT_SIMILARITY) private readonly textSim: TextSimilarityPort,
    @Inject(IMAGE_SIMILARITY) private readonly imageSim: ImageSimilarityPort,
  ) {}

  async onModuleInit(): Promise<void> {
    setInterval(() => {
      this.closeDueExercises().catch((err) =>
        this.log.warn(`closeDueExercises: ${err instanceof Error ? err.message : err}`),
      );
    }, 60_000);
  }

  async enqueueVersion(versionId: string): Promise<void> {
    setImmediate(() => {
      this.processVersion(versionId).catch((err) =>
        this.log.error(`processVersion ${versionId}: ${err instanceof Error ? err.message : err}`),
      );
    });
  }

  async enqueueExpire(reservationId: string, expiresAt: Date): Promise<void> {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    setTimeout(() => {
      this.expireReservation(reservationId).catch((err) =>
        this.log.warn(`expireReservation: ${err instanceof Error ? err.message : err}`),
      );
    }, delay);
  }

  async enqueueSimilarity(exerciseId: string): Promise<void> {
    setImmediate(() => {
      this.runSimilarity(exerciseId).catch((err) =>
        this.log.warn(`runSimilarity: ${err instanceof Error ? err.message : err}`),
      );
    });
  }

  async processVersion(versionId: string): Promise<void> {
    const version = await this.prisma.submissionVersion.findUnique({
      where: { id: versionId },
      include: {
        pages: { orderBy: { slot: "asc" } },
        submission: {
          include: {
            exercise: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    });
    if (!version || !version.completedAt) return;

    await this.prisma.submission.update({
      where: { id: version.submissionId },
      data: { status: "PROCESSING" },
    });

    const pages: { slot: number; image: Buffer; mimeType: string }[] = [];
    const skippedSlots: number[] = [];
    for (const page of version.pages) {
      if (!page.originalKey) continue;
      const image = await this.storage.get(page.originalKey);
      const phash = await this.imageSim.hash(image);
      await this.prisma.submissionPage.update({
        where: { id: page.id },
        data: { phash },
      });
      if (page.quality !== PageQuality.OK) {
        skippedSlots.push(page.slot);
        continue;
      }
      pages.push({
        slot: page.slot,
        image,
        mimeType: page.mimeType ?? "image/webp",
      });
    }

    // OCR is a derived aid for spelling/word-count estimates only — never the source of truth.
    const ocr = await this.ocr.recognize(
      pages.map((p) => ({ slot: p.slot, image: p.image })),
    );
    await this.prisma.ocrDocument.upsert({
      where: { versionId },
      create: {
        versionId,
        rawText: ocr.rawText,
        tokensJson: ocr.tokens as unknown as Prisma.InputJsonValue,
        provider: ocr.provider,
      },
      update: {
        rawText: ocr.rawText,
        tokensJson: ocr.tokens as unknown as Prisma.InputJsonValue,
        provider: ocr.provider,
      },
    });

    const suspects = await this.spell.check({
      language: version.submission.exercise.language,
      tokens: ocr.tokens.map((t) => ({ text: t.text, pageSlot: t.pageSlot })),
    });
    await this.prisma.spellingError.deleteMany({ where: { versionId } });
    if (suspects.length) {
      await this.prisma.spellingError.createMany({
        data: suspects.map((s) => ({
          versionId,
          token: s.token,
          suggestion: s.suggestion,
          pageSlot: s.pageSlot,
          status: "SUSPECT",
        })),
      });
    }

    const words = ocr.rawText.trim() ? ocr.rawText.trim().split(/\s+/).length : 0;
    const minWords = version.submission.exercise.minWords;
    const confidence = ocr.provider === "noop" || !ocr.rawText ? "low" : "medium";
    await this.prisma.wordCountEstimate.upsert({
      where: { versionId },
      create: {
        versionId,
        estimated: words,
        minWords,
        confidence,
        belowMin: minWords > 0 && words < minWords,
      },
      update: {
        estimated: words,
        minWords,
        confidence,
        belowMin: minWords > 0 && words < minWords,
      },
    });

    const exercise = version.submission.exercise;
    const maxScore = Number(exercise.maxScore);
    const proposal = await this.vision.assess({
      language: exercise.language,
      prompt: exercise.prompt,
      maxScore,
      minWords,
      criteria: exercise.criteria.map((c) => ({
        criterionId: c.id,
        name: c.name,
        maxPoints: Number(c.maxPoints),
        kind: c.kind,
      })),
      pages,
    });

    if (skippedSlots.length) {
      proposal.reviewFlags = [
        ...proposal.reviewFlags,
        {
          code: "QUALITY_SKIPPED",
          message: `Page(s) ${skippedSlots.join(", ")} failed quality and were not sent to the vision model.`,
        },
      ];
      proposal.needsLecturerReview = true;
    }

    const confirmedFindings = proposal.spellingFindings.filter((f) => f.confirmed);
    if (confirmedFindings.length) {
      await this.prisma.spellingError.createMany({
        data: confirmedFindings.map((s) => ({
          versionId,
          token: s.token,
          suggestion: s.suggestion,
          pageSlot: s.pageSlot,
          status: "CONFIRMED" as const,
          reason: s.evidence ?? "vision-confirmed",
        })),
      });
    }

    const undismissed = await this.prisma.spellingError.count({
      where: { versionId, status: { not: "DISMISSED" } },
    });

    const criterionRows: {
      criterionId: string;
      proposed: number;
      abstained: boolean;
      evidence?: string;
    }[] = [];
    for (const c of exercise.criteria) {
      const fromModel = proposal.scores.find((s) => s.criterionId === c.id);
      let proposed = clampCriterionScore(
        fromModel?.proposed ?? 0,
        Number(c.maxPoints),
      );
      let abstained = fromModel?.abstained ?? true;
      if (c.kind === CriterionKind.SPELLING) {
        proposed = computeSpellingScore({
          criterionMax: Number(c.maxPoints),
          undismissedErrors: undismissed,
          deduction: Number(c.spellingDeduction ?? 0.25),
          floor: Number(c.spellingFloor ?? 0),
        });
        abstained = false;
      }
      criterionRows.push({
        criterionId: c.id,
        proposed,
        abstained,
        evidence: fromModel?.evidence,
      });
    }

    const overallScore = clampCriterionScore(
      sumCriterionScores(criterionRows.map((r) => r.proposed)),
      maxScore,
    );

    const saved = await this.prisma.aiProposal.upsert({
      where: { versionId },
      create: {
        versionId,
        overallScore,
        confidence: proposal.confidence,
        strengths: proposal.strengths,
        weaknesses: proposal.weaknesses,
        suggestions: proposal.suggestions,
        abstainNotes: proposal.abstainNotes,
        needsLecturerReview: proposal.needsLecturerReview,
        reviewFlags: proposal.reviewFlags as unknown as Prisma.InputJsonValue,
        spellingFindings: proposal.spellingFindings as unknown as Prisma.InputJsonValue,
        provider: proposal.provider,
        model: proposal.model,
        rawJson: proposal.raw as Prisma.InputJsonValue | undefined,
      },
      update: {
        overallScore,
        confidence: proposal.confidence,
        strengths: proposal.strengths,
        weaknesses: proposal.weaknesses,
        suggestions: proposal.suggestions,
        abstainNotes: proposal.abstainNotes,
        needsLecturerReview: proposal.needsLecturerReview,
        reviewFlags: proposal.reviewFlags as unknown as Prisma.InputJsonValue,
        spellingFindings: proposal.spellingFindings as unknown as Prisma.InputJsonValue,
        provider: proposal.provider,
        model: proposal.model,
        rawJson: proposal.raw as Prisma.InputJsonValue | undefined,
      },
    });
    await this.prisma.aiCriterionScore.deleteMany({ where: { proposalId: saved.id } });

    for (const row of criterionRows) {
      await this.prisma.aiCriterionScore.create({
        data: {
          proposalId: saved.id,
          criterionId: row.criterionId,
          proposed: row.proposed,
          abstained: row.abstained,
          evidence: row.evidence,
        },
      });
    }

    if (version.isCurrent) {
      await this.prisma.submission.update({
        where: { id: version.submissionId },
        data: { status: "AI_PROPOSED" },
      });
    }
    await this.audit.record({
      action: "ai.propose",
      entityType: "Submission",
      entityId: version.submissionId,
      after: {
        versionId,
        provider: proposal.provider,
        model: proposal.model,
        overallScore,
        confidence: proposal.confidence,
        needsLecturerReview: proposal.needsLecturerReview,
      },
    });
    this.log.log(
      `Processed version ${versionId} via ${proposal.provider}/${proposal.model}`,
    );
  }

  async runSimilarity(exerciseId: string): Promise<void> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: {
        submissions: {
          include: {
            currentVersion: {
              include: { ocr: true, pages: true },
            },
          },
        },
      },
    });
    if (!exercise) return;
    const versions = exercise.submissions
      .map((s) => s.currentVersion)
      .filter((v): v is NonNullable<typeof v> => !!v && !!v.completedAt);
    const threshold = Number(exercise.similarityThreshold);

    for (let i = 0; i < versions.length; i++) {
      for (let j = i + 1; j < versions.length; j++) {
        const a = versions[i];
        const b = versions[j];
        const textScore = await this.textSim.score(
          a.ocr?.rawText ?? "",
          b.ocr?.rawText ?? "",
        );
        let imageScore = 0;
        for (const pa of a.pages) {
          for (const pb of b.pages) {
            if (pa.phash && pb.phash) {
              imageScore = Math.max(imageScore, this.imageSim.compare(pa.phash, pb.phash));
            }
          }
        }
        if (textScore >= threshold || imageScore >= 0.9) {
          await this.prisma.similarityHit.upsert({
            where: {
              versionId_peerVersionId: { versionId: a.id, peerVersionId: b.id },
            },
            create: {
              versionId: a.id,
              peerVersionId: b.id,
              textScore,
              imageScore,
              details: { pair: true },
            },
            update: { textScore, imageScore },
          });
          await this.prisma.similarityHit.upsert({
            where: {
              versionId_peerVersionId: { versionId: b.id, peerVersionId: a.id },
            },
            create: {
              versionId: b.id,
              peerVersionId: a.id,
              textScore,
              imageScore,
              details: { pair: true },
            },
            update: { textScore, imageScore },
          });
        }
      }
    }
  }

  async expireReservation(reservationId: string): Promise<void> {
    const res = await this.prisma.uploadReservation.findUnique({
      where: { id: reservationId },
      include: { version: { include: { pages: true, submission: true } } },
    });
    if (!res || res.status !== "ACTIVE") return;
    const empty = res.version.pages.filter((p) => !p.originalKey).length;
    if (empty === 0 && res.version.completedAt) {
      await this.prisma.uploadReservation.update({
        where: { id: res.id },
        data: { status: "COMPLETED" },
      });
      return;
    }
    await this.prisma.uploadReservation.update({
      where: { id: res.id },
      data: { status: "EXPIRED" },
    });
    if (!res.version.completedAt) {
      await this.prisma.submission.update({
        where: { id: res.version.submissionId },
        data: { status: "DRAFT" },
      });
    }
  }

  async closeDueExercises(): Promise<void> {
    const due = await this.prisma.exercise.findMany({
      where: {
        status: { in: ["PUBLISHED", "OPEN"] },
        closesAt: { lte: new Date() },
      },
    });
    for (const ex of due) {
      await this.prisma.exercise.update({
        where: { id: ex.id },
        data: { status: "CLOSED" },
      });
      await this.enqueueSimilarity(ex.id);
    }
    const opening = await this.prisma.exercise.findMany({
      where: {
        status: "PUBLISHED",
        opensAt: { lte: new Date() },
        closesAt: { gt: new Date() },
      },
    });
    for (const ex of opening) {
      await this.prisma.exercise.update({
        where: { id: ex.id },
        data: { status: "OPEN" },
      });
    }
  }
}
