import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSpellingScore } from "./spelling";
import { clampCriterionScore, letterForScore, sumCriterionScores } from "./rubric";

describe("computeSpellingScore", () => {
  it("deducts 0.25 per undismissed error", () => {
    assert.equal(
      computeSpellingScore({
        criterionMax: 3,
        undismissedErrors: 0,
        deduction: 0.25,
        floor: 0,
      }),
      3,
    );
    assert.equal(
      computeSpellingScore({
        criterionMax: 3,
        undismissedErrors: 3,
        deduction: 0.25,
        floor: 0,
      }),
      2.25,
    );
    assert.equal(
      computeSpellingScore({
        criterionMax: 3,
        undismissedErrors: 12,
        deduction: 0.25,
        floor: 0,
      }),
      0,
    );
  });
});

describe("sumCriterionScores", () => {
  it("sums without float drift", () => {
    assert.equal(sumCriterionScores([8, 5, 4, 2.25]), 19.25);
  });
});

describe("clampCriterionScore", () => {
  it("never exceeds the criterion maximum or goes below zero", () => {
    assert.equal(clampCriterionScore(15, 10), 10);
    assert.equal(clampCriterionScore(-1, 10), 0);
    assert.equal(clampCriterionScore(7.333, 10), 7.33);
  });
});

describe("letterForScore", () => {
  const bands = [
    { minScore: 0, maxScore: 9.99, labelEn: "F", labelFr: "Échec" },
    { minScore: 10, maxScore: 20, labelEn: "P", labelFr: "Passe" },
  ];
  it("maps inclusive ranges", () => {
    assert.equal(letterForScore(10, bands, "EN"), "P");
    assert.equal(letterForScore(0, bands, "FR"), "Échec");
  });
});
