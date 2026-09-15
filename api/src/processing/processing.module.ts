import { Module } from "@nestjs/common";
import { AverageHashSimilarity, JaccardTextSimilarity } from "./adapters/noop.similarity";
import { NoopOcr } from "./adapters/noop.ocr";
import { DictionarySpellcheck } from "./adapters/dictionary.spellcheck";
import { BasicQuality } from "./adapters/basic.quality";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { OCR } from "./ports/ocr.port";
import { QUALITY } from "./ports/quality.port";
import { IMAGE_SIMILARITY, TEXT_SIMILARITY } from "./ports/similarity.port";
import { SPELLCHECK } from "./ports/spellcheck.port";
import { VISION } from "./ports/vision.port";
import { ProcessingService } from "./processing.service";
import { createVisionAdapter } from "./vision.factory";

@Module({
  providers: [
    ProcessingService,
    { provide: OCR, useClass: NoopOcr },
    { provide: SPELLCHECK, useClass: DictionarySpellcheck },
    {
      provide: VISION,
      useFactory: (config: ConfigService<AppConfig, true>) =>
        createVisionAdapter(config),
      inject: [ConfigService],
    },
    { provide: QUALITY, useClass: BasicQuality },
    { provide: TEXT_SIMILARITY, useClass: JaccardTextSimilarity },
    { provide: IMAGE_SIMILARITY, useClass: AverageHashSimilarity },
  ],
  exports: [ProcessingService, QUALITY],
})
export class ProcessingModule {}
