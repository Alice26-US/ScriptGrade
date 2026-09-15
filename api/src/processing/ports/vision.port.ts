export const VISION = Symbol("VISION");

export type VisionCriterion = {
  criterionId: string;
  name: string;
  maxPoints: number;
  kind: string;
};

export type VisionConfidence = "high" | "medium" | "low";

export type VisionScore = {
  criterionId: string;
  proposed: number;
  abstained: boolean;
  evidence?: string;
};

export type VisionSpellingFinding = {
  token: string;
  suggestion?: string;
  pageSlot?: number;
  confirmed: boolean;
  evidence?: string;
};

export type VisionReviewFlag = {
  code: string;
  message: string;
  criterionId?: string;
};

export type VisionProposal = {
  overallScore: number;
  confidence: VisionConfidence;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  abstainNotes?: string;
  scores: VisionScore[];
  spellingFindings: VisionSpellingFinding[];
  reviewFlags: VisionReviewFlag[];
  needsLecturerReview: boolean;
  provider: string;
  model: string;
  raw?: unknown;
};

export type VisionAssessArgs = {
  language: "EN" | "FR";
  prompt: string;
  maxScore: number;
  minWords: number;
  criteria: VisionCriterion[];
  pages: { slot: number; image: Buffer; mimeType: string }[];
};

export interface VisionPort {
  assess(args: VisionAssessArgs): Promise<VisionProposal>;
}
