import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { GemmaVision } from "./adapters/gemma.vision";
import { SpaceXaiVision } from "./adapters/spacexai.vision";
import { createVisionAdapter } from "./vision.factory";

function fakeConfig(values: Partial<AppConfig>): ConfigService<AppConfig, true> {
  return {
    get: (key: keyof AppConfig) => values[key],
  } as unknown as ConfigService<AppConfig, true>;
}

const gemma = {
  apiKey: "",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  visionModel: "gemma-3.6",
};
const xai = {
  apiKey: "",
  baseUrl: "https://api.x.ai/v1",
  visionModel: "grok-4.5",
};

describe("createVisionAdapter", () => {
  it("defaults to Gemma and keeps the model in configuration", async () => {
    const vision = createVisionAdapter(
      fakeConfig({ visionDriver: "gemma", gemma, xai }),
    );
    assert.ok(vision instanceof GemmaVision);
    const proposal = await vision.assess({
      language: "EN",
      prompt: "Explain mitosis.",
      maxScore: 10,
      minWords: 20,
      criteria: [
        { criterionId: "c1", name: "Content", maxPoints: 10, kind: "NORMAL" },
      ],
      pages: [{ slot: 1, image: Buffer.from("img"), mimeType: "image/jpeg" }],
    });
    assert.equal(proposal.provider, "gemma");
    assert.equal(proposal.model, "gemma-3.6");
    assert.equal(proposal.needsLecturerReview, true);
    assert.ok(proposal.scores[0]?.abstained);
  });

  it("can switch to SpaceXAI through VISION_DRIVER", () => {
    const vision = createVisionAdapter(
      fakeConfig({ visionDriver: "spacexai", gemma, xai }),
    );
    assert.ok(vision instanceof SpaceXaiVision);
  });
});
