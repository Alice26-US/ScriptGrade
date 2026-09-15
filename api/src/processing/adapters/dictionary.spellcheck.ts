import { Injectable } from "@nestjs/common";
import { SpellcheckPort, SpellSuspect } from "../ports/spellcheck.port";
import { EN_WORDS } from "./dictionaries/en";
import { FR_WORDS } from "./dictionaries/fr";

const SKIP = /^[0-9]+$|^[A-Z]{2,}$/;

@Injectable()
export class DictionarySpellcheck implements SpellcheckPort {
  async check(args: {
    language: "EN" | "FR";
    tokens: { text: string; pageSlot?: number }[];
  }): Promise<SpellSuspect[]> {
    const dict = args.language === "FR" ? FR_WORDS : EN_WORDS;
    const out: SpellSuspect[] = [];
    for (const token of args.tokens) {
      const raw = token.text.trim();
      if (raw.length < 3) continue;
      if (SKIP.test(raw)) continue;
      const key = normalize(raw, args.language);
      if (!key || dict.has(key)) continue;
      out.push({
        token: raw,
        suggestion: suggest(key, dict),
        pageSlot: token.pageSlot,
      });
    }
    return out;
  }
}

function normalize(word: string, language: "EN" | "FR"): string {
  const stripped = word.replace(/^[^A-Za-zÀ-ÿŒœ]+|[^A-Za-zÀ-ÿŒœ']+$/g, "");
  if (language === "FR") return stripped.toLowerCase();
  return stripped.toLowerCase();
}

function suggest(word: string, dict: Set<string>): string | undefined {
  if (word.length > 14) return undefined;
  let best: string | undefined;
  let bestDist = 3;
  for (const candidate of dict) {
    if (Math.abs(candidate.length - word.length) > 2) continue;
    const d = levenshtein(word, candidate);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = candidate;
      if (d === 1) break;
    }
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
