export const SPELLCHECK = Symbol("SPELLCHECK");

export type SpellSuspect = {
  token: string;
  suggestion?: string;
  pageSlot?: number;
};

export interface SpellcheckPort {
  check(args: {
    language: "EN" | "FR";
    tokens: { text: string; pageSlot?: number }[];
  }): Promise<SpellSuspect[]>;
}
