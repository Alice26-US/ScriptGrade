import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { GemmaVision } from "./adapters/gemma.vision";
import { SpaceXaiVision } from "./adapters/spacexai.vision";
import { VisionPort } from "./ports/vision.port";

/** Resolve the vision adapter from VISION_DRIVER. Default: Gemma. */
export function createVisionAdapter(
  config: ConfigService<AppConfig, true>,
): VisionPort {
  const driver = (
    config.get("visionDriver", { infer: true }) ?? "gemma"
  ).toLowerCase();
  if (driver === "spacexai" || driver === "xai") {
    return new SpaceXaiVision(config);
  }
  return new GemmaVision(config);
}
