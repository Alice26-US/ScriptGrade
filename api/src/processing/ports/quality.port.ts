import { PageQuality } from "@scriptgrade/domain";

export const QUALITY = Symbol("QUALITY");

export interface QualityPort {
  inspect(image: Buffer): Promise<{ quality: PageQuality; notes?: string }>;
}
