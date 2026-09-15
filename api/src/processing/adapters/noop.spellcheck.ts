import { Injectable } from "@nestjs/common";
import { SpellcheckPort, SpellSuspect } from "../ports/spellcheck.port";

@Injectable()
export class NoopSpellcheck implements SpellcheckPort {
  async check(): Promise<SpellSuspect[]> {
    return [];
  }
}
