import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@scriptgrade/domain";
import { Roles } from "../common/decorators/roles";
import { RolesGuard } from "../common/guards/roles.guard";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { AcademicService } from "./academic.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAcademicController {
  constructor(private readonly academic: AcademicService) {}

  @Get("academic")
  catalog() {
    return this.academic.academicCatalog();
  }

  @Post("courses")
  createCourse(@Body() body: { code: string; title: string }) {
    return this.academic.createCourse(body.code, body.title);
  }

  @Post("terms")
  createTerm(@Body() body: { code: string; name: string }) {
    return this.academic.createTerm(body.code, body.name);
  }

  @Post("offerings")
  createOffering(
    @Body()
    body: {
      courseId: string;
      termId: string;
      campusId: string;
      programmeId: string;
      level: string;
      group?: string;
    },
  ) {
    return this.academic.createOffering(body);
  }

  @Post("offerings/:id/lecturers")
  assign(
    @Param("id") offeringId: string,
    @Body() body: { lecturerId: string },
  ) {
    return this.academic.assignLecturerToOffering(offeringId, body.lecturerId);
  }
}
