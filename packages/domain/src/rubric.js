"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCriteriaSumToMax = assertCriteriaSumToMax;
exports.assertSpellingCriteriaValid = assertSpellingCriteriaValid;
exports.assertGradeBandsCoverScale = assertGradeBandsCoverScale;
exports.letterForScore = letterForScore;
exports.sumCriterionScores = sumCriterionScores;
exports.assertPageLimits = assertPageLimits;
exports.clampCriterionScore = clampCriterionScore;
const enums_1 = require("./enums");
const money_1 = require("./money");
const constants_1 = require("./constants");
function assertCriteriaSumToMax(criteria, maxScore) {
    if (criteria.length === 0) {
        throw new Error("A published exercise must have at least one rubric criterion");
    }
    const sum = criteria.reduce((acc, c) => acc + (0, money_1.toHundredths)(c.maxPoints), 0);
    if (sum !== (0, money_1.toHundredths)(maxScore)) {
        throw new Error(`Rubric criteria must sum to max score (${(0, money_1.roundMarks)(sum / 100)} !== ${maxScore})`);
    }
}
function assertSpellingCriteriaValid(criteria) {
    for (const c of criteria) {
        if (c.kind !== enums_1.CriterionKind.SPELLING)
            continue;
        if (c.spellingDeduction == null || c.spellingDeduction < 0) {
            throw new Error(`Spelling criterion "${c.name}" needs a non-negative per-error deduction`);
        }
        if (c.spellingFloor == null || c.spellingFloor < 0) {
            throw new Error(`Spelling criterion "${c.name}" needs a non-negative floor`);
        }
        if (c.spellingFloor > c.maxPoints) {
            throw new Error(`Spelling floor cannot exceed criterion max for "${c.name}"`);
        }
    }
}
function assertGradeBandsCoverScale(bands, maxScore) {
    if (bands.length === 0) {
        throw new Error("A published exercise must have grade bands");
    }
    const sorted = [...bands].sort((a, b) => (0, money_1.toHundredths)(a.minScore) - (0, money_1.toHundredths)(b.minScore));
    if ((0, money_1.toHundredths)(sorted[0].minScore) !== 0) {
        throw new Error("Grade bands must start at 0");
    }
    let cursor = 0;
    for (const band of sorted) {
        if ((0, money_1.toHundredths)(band.minScore) !== cursor) {
            throw new Error("Grade bands must be contiguous with no gaps or overlaps");
        }
        if ((0, money_1.toHundredths)(band.maxScore) <= (0, money_1.toHundredths)(band.minScore)) {
            throw new Error("Each grade band must have maxScore > minScore");
        }
        cursor = (0, money_1.toHundredths)(band.maxScore);
    }
    if (cursor !== (0, money_1.toHundredths)(maxScore)) {
        throw new Error("Grade bands must end at the exercise max score");
    }
}
function letterForScore(score, bands, locale = "EN") {
    const s = (0, money_1.toHundredths)(score);
    const matches = bands.filter((b) => s >= (0, money_1.toHundredths)(b.minScore) && s <= (0, money_1.toHundredths)(b.maxScore));
    const band = matches.sort((a, b) => (0, money_1.toHundredths)(b.minScore) - (0, money_1.toHundredths)(a.minScore))[0];
    if (!band)
        return null;
    return locale === "FR" ? band.labelFr : band.labelEn;
}
function sumCriterionScores(scores) {
    return (0, money_1.roundMarks)(scores.reduce((acc, n) => acc + (0, money_1.toHundredths)(n), 0) / 100);
}
function assertPageLimits(maxPages, minPages) {
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > constants_1.SYSTEM_MAX_PAGES) {
        throw new Error(`maxPages must be an integer between 1 and ${constants_1.SYSTEM_MAX_PAGES}`);
    }
    if (!Number.isInteger(minPages) || minPages < 1 || minPages > maxPages) {
        throw new Error("minPages must be between 1 and maxPages");
    }
}
function clampCriterionScore(score, maxPoints) {
    const clamped = Math.min(maxPoints, Math.max(0, score));
    return (0, money_1.roundMarks)(clamped);
}
//# sourceMappingURL=rubric.js.map