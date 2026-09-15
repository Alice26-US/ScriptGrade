import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { CurrentUser } from "../common/decorators/current-user";
import { Actor } from "../common/types/actor";
import { AuthService } from "./auth.service";
import {
  AdminActivateDto,
  ChangePasswordDto,
  CompleteProfileDto,
  ForgotPasswordDto,
  LecturerRegisterStartDto,
  LecturerRegisterVerifyDto,
  LoginDto,
  RegisterStartDto,
  RegisterVerifyDto,
  ResetPasswordDto,
} from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register/start")
  start(@Body() dto: RegisterStartDto) {
    return this.auth.startRegistration(dto.matricule, dto.universityEmail);
  }

  @Post("register/verify")
  verify(
    @Body() dto: RegisterVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.verifyRegistration(dto, res);
  }

  @Post("register/lecturer/start")
  startLecturer(@Body() dto: LecturerRegisterStartDto) {
    return this.auth.startLecturerRegistration(dto.universityEmail);
  }

  @Post("register/lecturer/verify")
  verifyLecturer(
    @Body() dto: LecturerRegisterVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.verifyLecturerRegistration(dto, res);
  }

  @Post("login")
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.login(dto.identifier, dto.password, res, dto.role);
  }

  @Post("refresh")
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req.cookies?.sg_refresh as string | undefined, res);
  }

  @Post("logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req.cookies?.sg_refresh as string | undefined, res);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() actor: Actor) {
    return this.auth.me(actor);
  }

  @Post("complete-profile")
  @UseGuards(JwtAuthGuard)
  completeProfile(@CurrentUser() actor: Actor, @Body() dto: CompleteProfileDto) {
    return this.auth.completeProfile(actor, dto);
  }

  @Post("password")
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() actor: Actor, @Body() dto: ChangePasswordDto) {
    return this.auth.changeOwnPassword(actor, dto.currentPassword, dto.newPassword);
  }

  @Post("photo")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  uploadPhoto(
    @CurrentUser() actor: Actor,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.auth.uploadOwnPhoto(actor, file);
  }

  @Post("forgot-password")
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.identifier);
  }

  @Post("reset-password")
  reset(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Post("admin-activate")
  adminActivate(@Body() dto: AdminActivateDto) {
    return this.auth.completeAdminActivation(dto.token, dto.password);
  }
}
