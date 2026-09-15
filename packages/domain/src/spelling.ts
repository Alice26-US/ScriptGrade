import { roundMarks, toHundredths } from "./money";

export type SpellingScoreInput = {
  criterionMax: number;
  undismissedErrors: number;
  deduction: number;
  floor: number;
};

/**
 * Deterministic spelling mark:
 * max(floor, criterionMax − undismissedErrors × deduction), clamped to [0, criterionMax].
 */
export function computeSpellingScore(input: SpellingScoreInput): number {
  if (input.criterionMax < 0 || input.deduction < 0) {
    throw new Error("Spelling criterion max and deduction must be non-negative");
  }
  if (input.undismissedErrors < 0) {
    throw new Error("Error count must be non-negative");
  }

  const raw =
    toHundredths(input.criterionMax) -
    input.undismissedErrors * toHundredths(input.deduction);
  const floored = Math.max(toHundredths(input.floor), raw);
  const clamped = Math.min(
    toHundredths(input.criterionMax),
    Math.max(0, floored),
  );
  return roundMarks(clamped / 100);
}
