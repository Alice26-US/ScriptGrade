import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { ImageSimilarityPort, TextSimilarityPort } from "../ports/similarity.port";

@Injectable()
export class JaccardTextSimilarity implements TextSimilarityPort {
  async score(a: string, b: string): Promise<number> {
    const ta = tokenize(a);
    const tb = tokenize(b);
    if (ta.size === 0 && tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter += 1;
    const union = ta.size + tb.size - inter;
    return union === 0 ? 0 : inter / union;
  }
}

@Injectable()
export class AverageHashSimilarity implements ImageSimilarityPort {
  async hash(image: Buffer): Promise<string> {
    return createHash("sha256").update(image.subarray(0, 4096)).digest("hex");
  }

  compare(hashA: string, hashB: string): number {
    if (!hashA || !hashB) return 0;
    if (hashA === hashB) return 1;
    return 0;
  }
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-zàâçéèêëîïôùûüÿœæ0-9']+/i)
      .filter((t) => t.length > 2),
  );
}
