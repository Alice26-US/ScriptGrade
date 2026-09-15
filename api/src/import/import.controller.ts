import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImportKind, UserRole } from "@scriptgrade/domain";
import { CurrentUser } from "../common/decorators/current-user";
import { Roles } from "../common/decorators/roles";
import { RolesGuard } from "../common/guards/roles.guard";
import { Actor } from "../common/types/actor";
import { AuthService } from "../identity/auth.service";
import { JwtAuthGuard } from "../identity/jwt-auth.guard";
import { ImportService } from "./import.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ImportController {
  constructor(
    private readonly imports: ImportService,
    private readonly auth: AuthService,
  ) {}

  @Get("setup")
  setup() {
    return this.imports.setupStatus();
  }

  @Post("setup/demo")
  async demo(@CurrentUser() actor: Actor) {
    const results = await this.imports.importDemo(actor);
    return {
      ok: true,
      results,
      howToLogin: {
        admin: {
          identifier: "admin@scriptgrade.local",
          password: "ChangeMeNow1",
        },
        note: "Students register themselves with matricule. Lecturers register with university email. Then import enrolments and offering-lecturers.",
      },
    };
  }

  @Post("students/:id/reset-onboarding")
  resetStudentOnboarding(@Param("id") id: string, @CurrentUser() actor: Actor) {
    return this.auth.resetOnboarding(actor, "student", id);
  }

  @Post("lecturers/:id/reset-onboarding")
  resetLecturerOnboarding(@Param("id") id: string, @CurrentUser() actor: Actor) {
    return this.auth.resetOnboarding(actor, "lecturer", id);
  }

  @Get("students")
  students() {
    return this.imports.listStudents();
  }

  @Get("lecturers")
  lecturers() {
    return this.imports.listLecturers();
  }

  @Post("import/:kind")
  @UseInterceptors(FileInterceptor("file"))
  importKind(
    @Param("kind") kindRaw: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: Actor,
  ) {
    if (!file) throw new BadRequestException("CSV file is required");
    const kind = kindRaw.replace(/-/g, "_").toUpperCase() as ImportKind;
    if (!Object.values(ImportKind).includes(kind)) {
      throw new BadRequestException(`Unknown import kind ${kindRaw}`);
    }
    return this.imports.importCsv({
      kind,
      filename: file.originalname,
      buffer: file.buffer,
      actor,
    });
  }

  @Post("students/:id/activate")
  activateStudent(
    @Param("id") id: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.auth.issueAdminActivation(id, actor);
  }

  @Post("lecturers/:id/password")
  setLecturerPassword(
    @Param("id") id: string,
    @Body() body: { password: string },
    @CurrentUser() actor: Actor,
  ) {
    return this.auth.setLecturerPassword(id, body.password, actor);
  }

  @Post("lecturers")
  async createLecturer(
    @Body()
    body: {
      email: string;
      firstName: string;
      lastName: string;
      temporaryPassword?: string;
    },
    @CurrentUser() actor: Actor,
  ) {
    await this.imports.createLecturerRecord({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    if (body.temporaryPassword) {
      const lecturer = await this.imports.findLecturerByEmail(body.email);
      if (lecturer) {
        await this.auth.setLecturerPassword(
          lecturer.id,
          body.temporaryPassword,
          actor,
        );
      }
    }
    return { ok: true };
  }
}
