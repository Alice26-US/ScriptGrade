import {
  clampCriterionScore,
  sumCriterionScores,
} from "@scriptgrade/domain";
import {
  VisionAssessArgs,
  VisionConfidence,
  VisionProposal,
  VisionReviewFlag,
  VisionSpellingFinding,
} from "./ports/vision.port";

const CONFIDENCES: VisionConfidence[] = ["high", "medium", "low"];

export function buildSystemPrompt(language: "EN" | "FR"): string {
  const locale = language === "FR" ? "French" : "English";
  return `You are a university marking assistant for handwritten formative exercises.

SOURCE OF TRUTH: the original handwritten page images. Do not treat OCR or any transcript as truth.
Never invent unreadable content. If handwriting cannot be confidently understood, abstain on affected criteria and flag for lecturer review.

You only PROPOSE grades. The lecturer remains the final authority. Never claim AI-generated-content detection.

Return a single JSON object (no markdown) with this shape:
{
  "overallScore": number,
  "confidence": "high" | "medium" | "low",
  "strengths": string,
  "weaknesses": string,
  "suggestions": string,
  "abstainNotes": string,
  "scores": [
    {
      "criterionId": string,
      "proposed": number,
      "abstained": boolean,
      "evidence": string
    }
  ],
  "spellingFindings": [
    {
      "token": string,
      "suggestion": string,
      "pageSlot": number,
      "confirmed": boolean,
      "evidence": string
    }
  ],
  "reviewFlags": [
    { "code": string, "message": string, "criterionId": string }
  ],
  "needsLecturerReview": boolean
}

Rules:
- proposed must be in [0, that criterion's maxPoints].
- overallScore must be in [0, assignment maxScore] and should equal the sum of criterion proposed scores (use 0 for abstained).
- Set abstained=true when the page region for that criterion is unreadable or missing. Do not guess.
- spellingFindings: include only errors you can confidently read on the page images. confirmed=true only when you are sure. A deterministic spelling checker may overwrite the SPELLING criterion score.
- reviewFlags codes: UNREADABLE_HANDWRITING, LOW_CONFIDENCE, MISSING_ANSWER, ABSTAINED_CRITERION, ILLEGIBLE_PAGE.
- Language of strengths, weaknesses, suggestions, evidence, and notes: ${locale}.`;
}

export function buildUserPayload(args: VisionAssessArgs): string {
  return JSON.stringify({
    assignmentPrompt: args.prompt,
    maxScore: args.maxScore,
    minWords: args.minWords,
    criteria: args.criteria,
    pageSlots: args.pages.map((p) => p.slot),
    instructions: {
      imagesAreSourceOfTruth: true,
      neverInventUnreadableContent: true,
      lecturerIsFinalAuthority: true,
    },
  });
}

export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : trimmed).trim();
}

export function abstainProposal(
  args: VisionAssessArgs,
  meta: { provider: string; model: string },
  reason: string,
  raw?: unknown,
): VisionProposal {
  const flags: VisionReviewFlag[] = [
    { code: "MODEL_UNAVAILABLE", message: reason },
  ];
  return {
    overallScore: 0,
    confidence: "low",
    strengths: "",
    weaknesses: "",
    suggestions: "",
    abstainNotes: reason,
    scores: args.criteria.map((c) => ({
      criterionId: c.criterionId,
      proposed: 0,
      abstained: true,
      evidence: reason,
    })),
    spellingFindings: [],
    reviewFlags: flags,
    needsLecturerReview: true,
    provider: meta.provider,
    model: meta.model,
    raw,
  };
}

export function parseAndNormalize(
  rawText: string,
  args: VisionAssessArgs,
  meta: { provider: string; model: string },
): VisionProposal {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonText(rawText)) as Record<string, unknown>;
  } catch {
    return abstainProposal(
      args,
      meta,
      "Vision output was not valid JSON; lecturer must score.",
      rawText,
    );
  }

  const parsedScores = Array.isArray(parsed.scores) ? parsed.scores : [];
  const scores = args.criteria.map((c) => {
    const hit = parsedScores.find(
      (s) =>
        s &&
        typeof s === "object" &&
        (s as { criterionId?: unknown }).criterionId === c.criterionId,
    ) as
      | {
          proposed?: unknown;
          abstained?: unknown;
          evidence?: unknown;
        }
      | undefined;
    const missing = !hit;
    const abstained = missing || hit.abstained === true;
    const proposed = abstained
      ? 0
      : clampCriterionScore(Number(hit.proposed ?? 0) || 0, c.maxPoints);
    return {
      criterionId: c.criterionId,
      proposed,
      abstained,
      evidence: typeof hit?.evidence === "string" ? hit.evidence : undefined,
    };
  });

  const computed = clampCriterionScore(
    sumCriterionScores(scores.map((s) => s.proposed)),
    args.maxScore,
  );
  const claimed = Number(parsed.overallScore);
  const overallScore =
    Number.isFinite(claimed) && claimed > 0
      ? clampCriterionScore(Math.min(claimed, computed), args.maxScore)
      : computed;

  const confidenceRaw = String(parsed.confidence ?? "").toLowerCase();
  const anyAbstained = scores.some((s) => s.abstained);
  let confidence: VisionConfidence = CONFIDENCES.includes(
    confidenceRaw as VisionConfidence,
  )
    ? (confidenceRaw as VisionConfidence)
    : anyAbstained
      ? "low"
      : "medium";

  const reviewFlags = normalizeFlags(parsed.reviewFlags);
  const spellingFindings = normalizeFindings(parsed.spellingFindings);

  if (anyAbstained) {
    confidence = confidence === "high" ? "medium" : confidence;
    if (
      !reviewFlags.some(
        (f) => f.code === "ABSTAINED_CRITERION" || f.code === "UNREADABLE_HANDWRITING",
      )
    ) {
      reviewFlags.push({
        code: "ABSTAINED_CRITERION",
        message: "One or more rubric criteria could not be scored from the handwriting.",
      });
    }
  }
  if (args.pages.length === 0) {
    reviewFlags.push({
      code: "MISSING_ANSWER",
      message: "No readable page images were available for vision grading.",
    });
    confidence = "low";
  }

  const needsLecturerReview =
    parsed.needsLecturerReview === true ||
    anyAbstained ||
    confidence === "low" ||
    reviewFlags.length > 0;

  const abstainNotes =
    typeof parsed.abstainNotes === "string" && parsed.abstainNotes.trim()
      ? parsed.abstainNotes
      : needsLecturerReview
        ? "Flagged for lecturer review."
        : undefined;

  return {
    overallScore,
    confidence,
    strengths: asString(parsed.strengths),
    weaknesses: asString(parsed.weaknesses),
    suggestions: asString(parsed.suggestions),
    abstainNotes,
    scores,
    spellingFindings,
    reviewFlags,
    needsLecturerReview,
    provider: meta.provider,
    model: meta.model,
    raw: parsed,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeFlags(value: unknown): VisionReviewFlag[] {
  if (!Array.isArray(value)) return [];
  const flags: VisionReviewFlag[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { code?: unknown; message?: unknown; criterionId?: unknown };
    const code = typeof row.code === "string" ? row.code.trim() : "";
    const message = typeof row.message === "string" ? row.message.trim() : "";
    if (!code && !message) continue;
    flags.push({
      code: code || "LECTURER_REVIEW",
      message: message || code,
      criterionId:
        typeof row.criterionId === "string" ? row.criterionId : undefined,
    });
  }
  return flags;
}

function normalizeFindings(value: unknown): VisionSpellingFinding[] {
  if (!Array.isArray(value)) return [];
  const findings: VisionSpellingFinding[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      token?: unknown;
      suggestion?: unknown;
      pageSlot?: unknown;
      confirmed?: unknown;
      evidence?: unknown;
    };
    const token = typeof row.token === "string" ? row.token.trim() : "";
    if (!token) continue;
    const confirmed = row.confirmed === true;
    findings.push({
      token,
      suggestion:
        typeof row.suggestion === "string" ? row.suggestion : undefined,
      pageSlot:
        typeof row.pageSlot === "number" && Number.isFinite(row.pageSlot)
          ? row.pageSlot
          : undefined,
      confirmed,
      evidence: typeof row.evidence === "string" ? row.evidence : undefined,
    });
  }
  return findings;
}
