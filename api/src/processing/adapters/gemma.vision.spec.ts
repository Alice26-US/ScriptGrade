import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../../config/configuration";
import { GemmaVision } from "./gemma.vision";

function fakeConfig(gemma: AppConfig["gemma"]): ConfigService<AppConfig, true> {
  return {
    get: (key: string) => (key === "gemma" ? gemma : undefined),
  } as unknown as ConfigService<AppConfig, true>;
}

function sampleJpeg(): Buffer {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAD/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAf/2Q==",
    "base64",
  );
}

describe("GemmaVision", () => {
  it("proposes nothing when the server-side API key is missing", async () => {
    const vision = new GemmaVision(
      fakeConfig({
        apiKey: "",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        visionModel: "gemma-3.6",
      }),
    );
    const proposal = await vision.assess({
      language: "EN",
      prompt: "Define osmosis.",
      maxScore: 10,
      minWords: 20,
      criteria: [
        { criterionId: "c1", name: "Content", maxPoints: 7, kind: "NORMAL" },
        { criterionId: "c2", name: "Language", maxPoints: 3, kind: "SPELLING" },
      ],
      pages: [{ slot: 1, image: sampleJpeg(), mimeType: "image/jpeg" }],
    });
    assert.equal(proposal.provider, "gemma");
    assert.equal(proposal.model, "gemma-3.6");
    assert.equal(proposal.overallScore, 0);
    assert.equal(proposal.needsLecturerReview, true);
    assert.ok(proposal.scores.every((s) => s.abstained));
  });

  it("returns structured output from a live Gemma call when GEMMA_API_KEY is set", async (t) => {
    const apiKey = process.env.GEMMA_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      t.skip("GEMMA_API_KEY not set — skipping live provider call");
      return;
    }
    const vision = new GemmaVision(
      fakeConfig({
        apiKey,
        baseUrl:
          process.env.GEMMA_BASE_URL ??
          "https://generativelanguage.googleapis.com/v1beta/openai",
        visionModel: process.env.GEMMA_VISION_MODEL ?? "gemma-3.6",
      }),
    );
    const proposal = await vision.assess({
      language: "EN",
      prompt: "Write one sentence about water.",
      maxScore: 10,
      minWords: 5,
      criteria: [
        { criterionId: "c1", name: "Content", maxPoints: 10, kind: "NORMAL" },
      ],
      pages: [{ slot: 1, image: sampleJpeg(), mimeType: "image/jpeg" }],
    });
    assert.equal(proposal.provider, "gemma");
    assert.ok(["high", "medium", "low"].includes(proposal.confidence));
    assert.ok(proposal.overallScore >= 0);
    assert.ok(Array.isArray(proposal.scores));
    assert.ok(Array.isArray(proposal.reviewFlags));
    assert.ok(Array.isArray(proposal.spellingFindings));
    for (const score of proposal.scores) {
      assert.ok(score.proposed >= 0);
      assert.ok(score.proposed <= 10);
    }
  });
});
