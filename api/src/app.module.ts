import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AcademicModule } from "./academic/academic.module";
import { AuditModule } from "./audit/audit.module";
import { configuration } from "./config/configuration";
import { ExercisesModule } from "./exercises/exercises.module";
import { FilesModule } from "./files/files.module";
import { GradingModule } from "./grading/grading.module";
import { HealthController } from "./health.controller";
import { IdentityModule } from "./identity/identity.module";
import { ImportModule } from "./import/import.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProcessingModule } from "./processing/processing.module";
import { SubmissionsModule } from "./submissions/submissions.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    AuditModule,
    FilesModule,
    NotificationsModule,
    IdentityModule,
    AcademicModule,
    ImportModule,
    ExercisesModule,
    ProcessingModule,
    SubmissionsModule,
    GradingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
