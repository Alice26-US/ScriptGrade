import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole, VersionSource } from "@scriptgrade/domain";
import { CurrentUser } from "../common/decorators/current-user";
import { Roles } from "../common/decorators/roles";
import { RolesGuard } from "../common/guards/roles.guard";
import { Actor } from "../common/types/actor";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { SubmissionsService } from "./submissions.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get("exercises/:exerciseId/submission")
  @Roles(UserRole.STUDENT)
  mine(@CurrentUser() actor: Actor, @Param("exerciseId") exerciseId: string) {
    return this.submissions.getMine(actor, exerciseId);
  }

  @Post("exercises/:exerciseId/drafts/:slot")
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor("file"))
  draft(
    @CurrentUser() actor: Actor,
    @Param("exerciseId") exerciseId: string,
    @Param("slot", ParseIntPipe) slot: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.submissions.saveDraft(actor, exerciseId, slot, file);
  }

  @Post("exercises/:exerciseId/reserve")
  @Roles(UserRole.STUDENT)
  reserve(
    @CurrentUser() actor: Actor,
    @Param("exerciseId") exerciseId: string,
    @Body() body: { slots: number[] },
  ) {
    return this.submissions.reserve(
      actor,
      exerciseId,
      body.slots ?? [],
      VersionSource.STUDENT,
    );
  }

  @Post("versions/:versionId/pages/:slot")
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor("file"))
  upload(
    @CurrentUser() actor: Actor,
    @Param("versionId") versionId: string,
    @Param("slot", ParseIntPipe) slot: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.submissions.uploadPage(actor, versionId, slot, file);
  }

  @Post("versions/:versionId/complete")
  @Roles(UserRole.STUDENT)
  complete(@CurrentUser() actor: Actor, @Param("versionId") versionId: string) {
    return this.submissions.complete(actor, versionId);
  }
}
