import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { AppConfig } from "../config/configuration";
import { StoragePort, StoredObject } from "./storage.port";

@Injectable()
export class LocalStorage implements StoragePort {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private root(): string {
    return this.config.get("storage", { infer: true }).localRoot;
  }

  private secret(): string {
    return this.config.get("jwt", { infer: true }).secret;
  }

  async put(args: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredObject> {
    const full = join(this.root(), args.key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, args.body);
    return {
      key: args.key,
      byteSize: args.body.length,
      contentType: args.contentType,
    };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(join(this.root(), key));
  }

  async signRead(key: string, ttlSeconds = 300): Promise<string> {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${key}:${exp}`;
    const sig = createHmac("sha256", this.secret()).update(payload).digest("hex");
    return `/api/files/local?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
  }

  verifySignature(key: string, exp: string, sig: string): boolean {
    if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
    const payload = `${key}:${exp}`;
    const expected = createHmac("sha256", this.secret()).update(payload).digest("hex");
    return expected === sig;
  }
}
