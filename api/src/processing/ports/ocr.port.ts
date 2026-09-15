export const OCR = Symbol("OCR");

export type OcrToken = {
  text: string;
  pageSlot: number;
  confidence?: number;
};

export type OcrResult = {
  rawText: string;
  tokens: OcrToken[];
  provider: string;
};

export interface OcrPort {
  recognize(pages: { slot: number; image: Buffer }[]): Promise<OcrResult>;
}
