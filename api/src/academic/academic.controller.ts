import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user";
import { Actor } from "../common/types/actor";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { AcademicService } from "./academic.service";

@Controller("offerings")
@UseGuards(JwtAuthGuard)
export class AcademicController {
  constructor(private readonly academic: AcademicService) {}

  @Get()
  list(@CurrentUser() actor: Actor) {
    return this.academic.listOfferingsFor(actor);
  }
}
