import { CriterionKind } from "./enums";
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
export declare function assertCriteriaSumToMax(criteria: Pick<RubricCriterionInput, "maxPoints">[], maxScore: number): void;
export declare function assertSpellingCriteriaValid(criteria: RubricCriterionInput[]): void;
export declare function assertGradeBandsCoverScale(bands: GradeBandInput[], maxScore: number): void;
export declare function letterForScore(score: number, bands: GradeBandInput[], locale?: "EN" | "FR"): string | null;
export declare function sumCriterionScores(scores: number[]): number;
export declare function assertPageLimits(maxPages: number, minPages: number): void;
export declare function clampCriterionScore(score: number, maxPoints: number): number;
