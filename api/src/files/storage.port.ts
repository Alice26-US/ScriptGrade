export const STORAGE = Symbol("STORAGE");

export type StoredObject = {
  key: string;
  byteSize: number;
  contentType: string;
};

export interface StoragePort {
  put(args: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  signRead(key: string, ttlSeconds?: number): Promise<string>;
}
