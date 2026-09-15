import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { StoragePort, StoredObject } from "./storage.port";

@Injectable()
export class S3Storage implements StoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const storage = config.get("storage", { infer: true });
    this.bucket = storage.bucket ?? "";
    this.client = new S3Client({ region: storage.region });
  }

  async put(args: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: args.key,
        Body: args.body,
        ContentType: args.contentType,
      }),
    );
    return {
      key: args.key,
      byteSize: args.body.length,
      contentType: args.contentType,
    };
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  async signRead(key: string, _ttlSeconds = 300): Promise<string> {
    // Presigning can be added with @aws-sdk/s3-request-presigner. For MVP we
    // stream through the API so RBAC still applies.
    return `/files/s3/${encodeURIComponent(key)}`;
  }
}
