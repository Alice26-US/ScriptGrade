ALTER TABLE "AiProposal" ADD COLUMN "overallScore" DECIMAL(8,2);
ALTER TABLE "AiProposal" ADD COLUMN "confidence" TEXT;
ALTER TABLE "AiProposal" ADD COLUMN "needsLecturerReview" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AiProposal" ADD COLUMN "reviewFlags" JSONB;
ALTER TABLE "AiProposal" ADD COLUMN "spellingFindings" JSONB;
