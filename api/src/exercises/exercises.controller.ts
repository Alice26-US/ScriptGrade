import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@scriptgrade/domain";
import { CurrentUser } from "../common/decorators/current-user";
import { Roles } from "../common/decorators/roles";
import { RolesGuard } from "../common/guards/roles.guard";
import { Actor } from "../common/types/actor";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { GrantAccessDto, UpsertExerciseDto } from "./dto";
import { ExercisesService } from "./exercises.service";

@Controller("exercises")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.exercises.listFor(actor);
  }

  @Get(":id")
  get(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.exercises.getById(actor, id);
  }

  @Post()
  @Roles(UserRole.LECTURER)
  create(@CurrentUser() actor: Actor, @Body() dto: UpsertExerciseDto) {
    return this.exercises.create(actor, dto);
  }

  @Patch(":id")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  update(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() dto: UpsertExerciseDto,
  ) {
    return this.exercises.update(actor, id, dto);
  }

  @Post(":id/publish")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  publish(@CurrentUser() actor: Actor, @Param("id") id: string) {
    return this.exercises.publish(actor, id);
  }

  @Post(":id/enrol")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  enrol(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() body: { matricule: string },
  ) {
    return this.exercises.enrolStudent(actor, id, body.matricule);
  }

  @Post(":id/access")
  @Roles(UserRole.LECTURER, UserRole.ADMIN)
  grant(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() dto: GrantAccessDto,
  ) {
    return this.exercises.grantAccess(actor, id, dto);
  }

  @Post(":id/reassign")
  @Roles(UserRole.ADMIN)
  reassign(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() body: { lecturerId: string },
  ) {
    return this.exercises.reassignOwner(actor, id, body.lecturerId);
  }
}
