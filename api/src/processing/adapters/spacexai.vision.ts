import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { AppConfig } from "../../config/configuration";
import { assessOpenAiCompatible } from "../openai-compatible.vision";
import { VisionPort, VisionProposal } from "../ports/vision.port";

@Injectable()
export class SpaceXaiVision implements VisionPort {
  private readonly log = new Logger(SpaceXaiVision.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  readonly provider = "spacexai";

  constructor(config: ConfigService<AppConfig, true>) {
    const xai = config.get("xai", { infer: true });
    this.model = xai.visionModel;
    this.client = xai.apiKey
      ? new OpenAI({ apiKey: xai.apiKey, baseURL: xai.baseUrl })
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
