import { Module } from "@nestjs/common";
import { AcademicController } from "./academic.controller";
import { AcademicService } from "./academic.service";
import { AdminAcademicController } from "./admin-academic.controller";
import { CatalogController } from "./catalog.controller";

@Module({
  controllers: [AcademicController, CatalogController, AdminAcademicController],
  providers: [AcademicService],
  exports: [AcademicService],
})
export class AcademicModule {}
