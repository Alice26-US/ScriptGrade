import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";

@Module({
  imports: [IdentityModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
