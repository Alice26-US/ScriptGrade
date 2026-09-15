import { Injectable } from "@nestjs/common";
import { PageQuality } from "@scriptgrade/domain";
import { QualityPort } from "../ports/quality.port";

/**
 * Technical quality gate without native image libraries.
 * Blur/darkness still require a CV adapter (sharp) later; this rejects
 * corrupt files, tiny images, and near-empty buffers.
 */
@Injectable()
export class BasicQuality implements QualityPort {
  async inspect(image: Buffer): Promise<{ quality: PageQuality; notes?: string }> {
    if (!image || image.length < 8_000) {
      return { quality: PageQuality.FAIL_BLANK, notes: "file too small" };
    }
    const meta = readImageMeta(image);
    if (!meta) {
      return { quality: PageQuality.FAIL_CHECKSUM, notes: "unreadable image" };
    }
    if (Math.min(meta.width, meta.height) < 600) {
      return { quality: PageQuality.FAIL_RESOLUTION };
    }
    return { quality: PageQuality.OK };
  }
}

function readImageMeta(buf: Buffer): { width: number; height: number } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return jpegSize(buf);
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return webpSize(buf);
  }
  return null;
}

function jpegSize(buf: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const size = buf.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + size;
  }
  return null;
}

function webpSize(buf: Buffer): { width: number; height: number } | null {
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buf.length >= 30) {
    const width = 1 + buf[24] + (buf[25] << 8) + (buf[26] << 16);
    const height = 1 + buf[27] + (buf[28] << 8) + (buf[29] << 16);
    return { width, height };
  }
  if (chunk === "VP8 " && buf.length >= 30) {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buf.length >= 25) {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}
