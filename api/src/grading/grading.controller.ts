import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@scriptgrade/domain";
import { CurrentUser } from "../common/decorators/current-user";
import { Roles } from "../common/decorators/roles";
import { RolesGuard } from "../common/guards/roles.guard";
import { Actor } from "../common/types/actor";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { GradingService } from "./grading.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradingController {
  constructor(private readonly grading: GradingService) {}

  @Get("exercises/:exerciseId/marking")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  queue(@CurrentUser() actor: Actor, @Param("exerciseId") exerciseId: string) {
    return this.grading.queue(actor, exerciseId);
  }

  @Get("submissions/:id")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  get(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.grading.getOne(actor, id);
  }

  @Get("results/:id")
  @Roles(UserRole.STUDENT)
  result(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.grading.studentResult(actor, id);
  }

  @Post("submissions/:id/start-review")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  start(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.grading.startReview(actor, id);
  }

  @Post("submissions/:id/apply-proposal")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  apply(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.grading.applyProposal(actor, id);
  }

  @Post("submissions/:id/criteria/:criterionId")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  score(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Param("criterionId") criterionId: string,
    @Body() body: { score: number; reason?: string },
  ) {
    return this.grading.setCriterionScore(
      actor,
      id,
      criterionId,
      body.score,
      body.reason,
    );
  }

  @Post("spelling/:id")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  spelling(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() body: { status: "CONFIRMED" | "DISMISSED"; reason?: string },
  ) {
    return this.grading.dismissSpelling(actor, id, body.status, body.reason);
  }

  @Post("submissions/:id/feedback")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  feedback(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body()
    body: {
      remarks?: string;
      strengths?: string;
      weaknesses?: string;
      suggestions?: string;
    },
  ) {
    return this.grading.saveFeedback(actor, id, body);
  }

  @Post("submissions/:id/finalize")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  finalize(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.grading.finalize(actor, id);
  }

  @Post("submissions/:id/release")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  release(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.grading.release(actor, id);
  }

  @Post("submissions/:id/return")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  ret(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() body: { reason: string; personalDueAt: string },
  ) {
    return this.grading.unreleaseAndReturn(
      actor,
      id,
      body.reason,
      body.personalDueAt,
    );
  }
}
