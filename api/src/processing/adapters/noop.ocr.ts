import { Injectable } from "@nestjs/common";
import { OcrPort, OcrResult } from "../ports/ocr.port";

@Injectable()
export class NoopOcr implements OcrPort {
  async recognize(pages: { slot: number; image: Buffer }[]): Promise<OcrResult> {
    const tokens = pages.map((p) => ({
      text: "",
      pageSlot: p.slot,
      confidence: 0,
    }));
    return { rawText: "", tokens, provider: "noop" };
  }
}
