import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VisionAssessArgs } from "./ports/vision.port";
import {
  abstainProposal,
  extractJsonText,
  parseAndNormalize,
} from "./vision-proposal";

const args: VisionAssessArgs = {
  language: "EN",
  prompt: "Define osmosis in one paragraph.",
  maxScore: 10,
  minWords: 40,
  criteria: [
    { criterionId: "c-content", name: "Content", maxPoints: 7, kind: "NORMAL" },
    { criterionId: "c-lang", name: "Language", maxPoints: 3, kind: "SPELLING" },
  ],
  pages: [{ slot: 1, image: Buffer.from("x"), mimeType: "image/jpeg" }],
};

describe("parseAndNormalize", () => {
  it("clamps criterion scores to maxPoints and overall to maxScore", () => {
    const proposal = parseAndNormalize(
      JSON.stringify({
        overallScore: 99,
        confidence: "high",
        strengths: "Clear definition",
        weaknesses: "Thin example",
        suggestions: "Add an example",
        scores: [
          { criterionId: "c-content", proposed: 15, abstained: false, evidence: "page 1" },
          { criterionId: "c-lang", proposed: -2, abstained: false, evidence: "page 1" },
        ],
        spellingFindings: [],
        reviewFlags: [],
        needsLecturerReview: false,
      }),
      args,
      { provider: "gemma", model: "gemma-3.6" },
    );

    assert.equal(proposal.provider, "gemma");
    assert.equal(proposal.model, "gemma-3.6");
    assert.equal(
      proposal.scores.find((s) => s.criterionId === "c-content")?.proposed,
      7,
    );
    assert.equal(
      proposal.scores.find((s) => s.criterionId === "c-lang")?.proposed,
      0,
    );
    assert.equal(proposal.overallScore, 7);
    assert.equal(proposal.needsLecturerReview, false);
  });

  it("abstains missing criteria and flags lecturer review", () => {
    const proposal = parseAndNormalize(
      JSON.stringify({
        overallScore: 4,
        confidence: "low",
        strengths: "",
        weaknesses: "",
        suggestions: "",
        scores: [
          {
            criterionId: "c-content",
            proposed: 4,
            abstained: true,
            evidence: "illegible last lines",
          },
        ],
        spellingFindings: [
          {
            token: "osmosiss",
            suggestion: "osmosis",
            pageSlot: 1,
            confirmed: true,
            evidence: "visible on line 2",
          },
        ],
        reviewFlags: [
          { code: "UNREADABLE_HANDWRITING", message: "Last third of page 1 is smudged" },
        ],
        needsLecturerReview: true,
      }),
      args,
      { provider: "gemma", model: "gemma-3.6" },
    );

    const content = proposal.scores.find((s) => s.criterionId === "c-content");
    const lang = proposal.scores.find((s) => s.criterionId === "c-lang");
    assert.equal(content?.abstained, true);
    assert.equal(content?.proposed, 0);
    assert.equal(lang?.abstained, true);
    assert.equal(proposal.needsLecturerReview, true);
    assert.equal(proposal.confidence, "low");
    assert.equal(proposal.spellingFindings[0]?.token, "osmosiss");
    assert.equal(proposal.spellingFindings[0]?.confirmed, true);
    assert.ok(
      proposal.reviewFlags.some((f) => f.code === "UNREADABLE_HANDWRITING"),
    );
  });

  it("never invents content from invalid JSON — abstains all", () => {
    const proposal = parseAndNormalize("not-json", args, {
      provider: "gemma",
      model: "gemma-3.6",
    });
    assert.ok(proposal.scores.every((s) => s.abstained && s.proposed === 0));
    assert.equal(proposal.overallScore, 0);
    assert.equal(proposal.needsLecturerReview, true);
  });

  it("extracts JSON from markdown fences", () => {
    assert.equal(extractJsonText("```json\n{\"a\":1}\n```"), '{"a":1}');
  });
});

describe("abstainProposal", () => {
  it("marks every criterion abstained for lecturer review", () => {
    const proposal = abstainProposal(
      args,
      { provider: "gemma", model: "gemma-3.6" },
      "Vision model unavailable (missing API key); lecturer must score.",
    );
    assert.equal(proposal.provider, "gemma");
    assert.equal(proposal.confidence, "low");
    assert.equal(proposal.needsLecturerReview, true);
    assert.equal(proposal.scores.length, 2);
    assert.ok(proposal.scores.every((s) => s.abstained));
  });
});
