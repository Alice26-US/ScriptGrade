import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { parseAndNormalize } from "./vision-proposal";

describe("sample submission store", () => {
  it("parses a Gemma-shaped payload and persists it on a real version when one exists", async (t) => {
    const prisma = new PrismaClient();
    try {
      const version = await prisma.submissionVersion.findFirst({
        where: { completedAt: { not: null } },
        include: {
          submission: {
            include: {
              exercise: { include: { criteria: true } },
            },
          },
        },
        orderBy: { completedAt: "desc" },
      });
      if (!version || version.submission.exercise.criteria.length === 0) {
        t.skip("No completed sample submission in the database");
        return;
      }

      const criteria = version.submission.exercise.criteria;
      const maxScore = Number(version.submission.exercise.maxScore);
      const proposal = parseAndNormalize(
        JSON.stringify({
          overallScore: maxScore + 5,
          confidence: "medium",
          strengths: "Addresses the prompt.",
          weaknesses: "Thin supporting detail.",
          suggestions: "Add one worked example.",
          scores: criteria.map((c, i) => ({
            criterionId: c.id,
            proposed: Number(c.maxPoints) + 3,
            abstained: i === criteria.length - 1,
            evidence: `Visible on page 1 for ${c.name}`,
          })),
          spellingFindings: [
            {
              token: "enviroment",
              suggestion: "environment",
              pageSlot: 1,
              confirmed: true,
              evidence: "line 2",
            },
          ],
          reviewFlags: [
            {
              code: "ABSTAINED_CRITERION",
              message: "Last criterion unreadable — lecturer review required",
            },
          ],
          needsLecturerReview: true,
        }),
        {
          language: version.submission.exercise.language,
          prompt: version.submission.exercise.prompt,
          maxScore,
          minWords: version.submission.exercise.minWords,
          criteria: criteria.map((c) => ({
            criterionId: c.id,
            name: c.name,
            maxPoints: Number(c.maxPoints),
            kind: c.kind,
          })),
          pages: [{ slot: 1, image: Buffer.from("x"), mimeType: "image/jpeg" }],
        },
        { provider: "gemma", model: "gemma-3.6" },
      );

      for (const score of proposal.scores) {
        const max = Number(
          criteria.find((c) => c.id === score.criterionId)?.maxPoints ?? 0,
        );
        assert.ok(score.proposed <= max);
        assert.ok(score.proposed >= 0);
      }
      assert.ok(proposal.overallScore <= maxScore);

      class Rollback extends Error {}
      try {
        await prisma.$transaction(async (tx) => {
          const saved = await tx.aiProposal.upsert({
            where: { versionId: version.id },
            create: {
              versionId: version.id,
              overallScore: proposal.overallScore,
              confidence: proposal.confidence,
              strengths: proposal.strengths,
              weaknesses: proposal.weaknesses,
              suggestions: proposal.suggestions,
              abstainNotes: proposal.abstainNotes,
              needsLecturerReview: proposal.needsLecturerReview,
              reviewFlags: proposal.reviewFlags,
              spellingFindings: proposal.spellingFindings,
              provider: proposal.provider,
              model: proposal.model,
              rawJson: proposal.raw as object,
            },
            update: {
              overallScore: proposal.overallScore,
              confidence: proposal.confidence,
              strengths: proposal.strengths,
              weaknesses: proposal.weaknesses,
              suggestions: proposal.suggestions,
              abstainNotes: proposal.abstainNotes,
              needsLecturerReview: proposal.needsLecturerReview,
              reviewFlags: proposal.reviewFlags,
              spellingFindings: proposal.spellingFindings,
              provider: proposal.provider,
              model: proposal.model,
              rawJson: proposal.raw as object,
            },
          });
          await tx.aiCriterionScore.deleteMany({ where: { proposalId: saved.id } });
          for (const score of proposal.scores) {
            await tx.aiCriterionScore.create({
              data: {
                proposalId: saved.id,
                criterionId: score.criterionId,
                proposed: score.proposed,
                abstained: score.abstained,
                evidence: score.evidence,
              },
            });
          }
          const roundTrip = await tx.aiProposal.findUniqueOrThrow({
            where: { id: saved.id },
            include: { criteria: true, version: { include: { submission: true } } },
          });
          assert.equal(roundTrip.provider, "gemma");
          assert.equal(roundTrip.model, "gemma-3.6");
          assert.equal(roundTrip.needsLecturerReview, true);
          assert.ok(Number(roundTrip.overallScore) <= maxScore);
          assert.equal(roundTrip.criteria.length, criteria.length);
          assert.equal(roundTrip.version.submission.id, version.submissionId);
          throw new Rollback();
        });
      } catch (err) {
        if (!(err instanceof Rollback)) throw err;
      }
    } finally {
      await prisma.$disconnect();
    }
  });
});
