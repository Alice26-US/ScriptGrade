import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { AppConfig } from "../../config/configuration";
import { assessOpenAiCompatible } from "../openai-compatible.vision";
import { VisionPort, VisionProposal } from "../ports/vision.port";

/**
 * Gemma vision adapter (default ScriptGrade grader).
 * Endpoint and model come from GEMMA_* env — do not hardcode the model at call sites.
 */
@Injectable()
export class GemmaVision implements VisionPort {
  private readonly log = new Logger(GemmaVision.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  readonly provider = "gemma";

  constructor(config: ConfigService<AppConfig, true>) {
    const gemma = config.get("gemma", { infer: true });
    this.model = gemma.visionModel;
    this.client = gemma.apiKey
      ? new OpenAI({ apiKey: gemma.apiKey, baseURL: gemma.baseUrl })
      : null;
  }

  assess(args: Parameters<VisionPort["assess"]>[0]): Promise<VisionProposal> {
    return assessOpenAiCompatible(
      this.client,
      this.provider,
      this.model,
      args,
      this.log,
    );
  }
}
