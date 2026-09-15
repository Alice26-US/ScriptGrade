import { CriterionKind } from "./enums";
import { roundMarks, toHundredths } from "./money";
import { SYSTEM_MAX_PAGES } from "./constants";

export type RubricCriterionInput = {
  name: string;
  maxPoints: number;
  kind: CriterionKind;
  sortOrder: number;
  spellingDeduction?: number | null;
  spellingFloor?: number | null;
};

export type GradeBandInput = {
  minScore: number;
  maxScore: number;
  labelEn: string;
  labelFr: string;
};

export function assertCriteriaSumToMax(
  criteria: Pick<RubricCriterionInput, "maxPoints">[],
  maxScore: number,
): void {
  if (criteria.length === 0) {
    throw new Error("A published exercise must have at least one rubric criterion");
  }
  const sum = criteria.reduce((acc, c) => acc + toHundredths(c.maxPoints), 0);
  if (sum !== toHundredths(maxScore)) {
    throw new Error(
      `Rubric criteria must sum to max score (${roundMarks(sum / 100)} !== ${maxScore})`,
    );
  }
}

export function assertSpellingCriteriaValid(
  criteria: RubricCriterionInput[],
): void {
  for (const c of criteria) {
    if (c.kind !== CriterionKind.SPELLING) continue;
    if (c.spellingDeduction == null || c.spellingDeduction < 0) {
      throw new Error(
        `Spelling criterion "${c.name}" needs a non-negative per-error deduction`,
      );
    }
    if (c.spellingFloor == null || c.spellingFloor < 0) {
      throw new Error(`Spelling criterion "${c.name}" needs a non-negative floor`);
    }
    if (c.spellingFloor > c.maxPoints) {
      throw new Error(`Spelling floor cannot exceed criterion max for "${c.name}"`);
    }
  }
}

export function assertGradeBandsCoverScale(
  bands: GradeBandInput[],
  maxScore: number,
): void {
  if (bands.length === 0) {
    throw new Error("A published exercise must have grade bands");
  }
  const sorted = [...bands].sort(
    (a, b) => toHundredths(a.minScore) - toHundredths(b.minScore),
  );
  if (toHundredths(sorted[0].minScore) !== 0) {
    throw new Error("Grade bands must start at 0");
  }
  let cursor = 0;
  for (const band of sorted) {
    if (toHundredths(band.minScore) !== cursor) {
      throw new Error("Grade bands must be contiguous with no gaps or overlaps");
    }
    if (toHundredths(band.maxScore) <= toHundredths(band.minScore)) {
      throw new Error("Each grade band must have maxScore > minScore");
    }
    cursor = toHundredths(band.maxScore);
  }
  if (cursor !== toHundredths(maxScore)) {
    throw new Error("Grade bands must end at the exercise max score");
  }
}

export function letterForScore(
  score: number,
  bands: GradeBandInput[],
  locale: "EN" | "FR" = "EN",
): string | null {
  const s = toHundredths(score);
  const matches = bands.filter(
    (b) => s >= toHundredths(b.minScore) && s <= toHundredths(b.maxScore),
  );
  const band = matches.sort(
    (a, b) => toHundredths(b.minScore) - toHundredths(a.minScore),
  )[0];
  if (!band) return null;
  return locale === "FR" ? band.labelFr : band.labelEn;
}

export function sumCriterionScores(scores: number[]): number {
  return roundMarks(
    scores.reduce((acc, n) => acc + toHundredths(n), 0) / 100,
  );
}

export function assertPageLimits(maxPages: number, minPages: number): void {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > SYSTEM_MAX_PAGES) {
    throw new Error(`maxPages must be an integer between 1 and ${SYSTEM_MAX_PAGES}`);
  }
  if (!Number.isInteger(minPages) || minPages < 1 || minPages > maxPages) {
    throw new Error("minPages must be between 1 and maxPages");
  }
}

export function clampCriterionScore(score: number, maxPoints: number): number {
  const clamped = Math.min(maxPoints, Math.max(0, score));
  return roundMarks(clamped);
}
