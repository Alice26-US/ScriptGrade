import { Module } from "@nestjs/common";
import { AcademicModule } from "../academic/academic.module";
import { ProcessingModule } from "../processing/processing.module";
import { SubmissionsController } from "./submissions.controller";
import { SubmissionsService } from "./submissions.service";

@Module({
  imports: [AcademicModule, ProcessingModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
