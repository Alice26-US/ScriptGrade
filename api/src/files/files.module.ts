import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "../config/configuration";
import { FilesController } from "./files.controller";
import { LocalStorage } from "./local.storage";
import { S3Storage } from "./s3.storage";
import { STORAGE, StoragePort } from "./storage.port";

@Global()
@Module({
  controllers: [FilesController],
  providers: [
    LocalStorage,
    S3Storage,
    {
      provide: STORAGE,
      inject: [ConfigService, LocalStorage, S3Storage],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        local: LocalStorage,
        s3: S3Storage,
      ): StoragePort =>
        config.get("storage", { infer: true }).driver === "s3" ? s3 : local,
    },
  ],
  exports: [STORAGE, LocalStorage],
})
export class FilesModule {}
