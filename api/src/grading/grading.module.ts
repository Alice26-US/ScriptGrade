import { Module } from "@nestjs/common";
import { ExercisesModule } from "../exercises/exercises.module";
import { GradingController } from "./grading.controller";
import { GradingService } from "./grading.service";

@Module({
  imports: [ExercisesModule],
  controllers: [GradingController],
  providers: [GradingService],
})
export class GradingModule {}
