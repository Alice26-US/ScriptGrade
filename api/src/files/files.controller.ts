import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { AppConfig } from "../config/configuration";
import { LocalStorage } from "./local.storage";

@Controller("files")
export class FilesController {
  constructor(
    private readonly local: LocalStorage,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Get("local")
  async localFile(
    @Query("key") key: string,
    @Query("exp") exp: string,
    @Query("sig") sig: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (this.config.get("storage", { infer: true }).driver !== "local") {
      throw new ForbiddenException();
    }
    if (!key || !this.local.verifySignature(key, exp, sig)) {
      throw new ForbiddenException("Invalid or expired file token");
    }
    try {
      const buf = await this.local.get(key);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Cache-Control", "private, max-age=60");
      return new StreamableFile(buf);
    } catch {
      throw new NotFoundException();
    }
  }
}
