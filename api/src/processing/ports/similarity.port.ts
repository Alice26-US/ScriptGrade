export const TEXT_SIMILARITY = Symbol("TEXT_SIMILARITY");
export const IMAGE_SIMILARITY = Symbol("IMAGE_SIMILARITY");

export interface TextSimilarityPort {
  score(a: string, b: string): Promise<number>;
}

export interface ImageSimilarityPort {
  hash(image: Buffer): Promise<string>;
  compare(hashA: string, hashB: string): number;
}
