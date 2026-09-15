export type SpellingScoreInput = {
    criterionMax: number;
    undismissedErrors: number;
    deduction: number;
    floor: number;
};
export declare function computeSpellingScore(input: SpellingScoreInput): number;
