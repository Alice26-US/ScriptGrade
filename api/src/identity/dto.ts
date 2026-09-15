import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import { MIN_PASSWORD_LENGTH } from "@scriptgrade/domain";

export class RegisterStartDto {
  @IsString()
  matricule!: string;

  @IsEmail()
  universityEmail!: string;
}

export class RegisterVerifyDto {
  @IsString()
  matricule!: string;

  @IsString()
  otp!: string;

  @IsEmail()
  universityEmail!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;

  @IsString()
  fullName!: string;

  @IsString()
  campusId!: string;

  @IsString()
  facultyId!: string;

  @IsString()
  departmentId!: string;

  @IsString()
  programme!: string;

  @IsString()
  level!: string;

  @IsString()
  academicYear!: string;
}

export class CompleteProfileDto {
  @IsString()
  fullName!: string;

  @IsString()
  campusId!: string;

  @IsString()
  facultyId!: string;

  @IsString()
  departmentId!: string;

  @IsOptional()
  @IsString()
  programme?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;
}

export class LoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsIn(["STUDENT", "LECTURER", "ADMIN"])
  role?: "STUDENT" | "LECTURER" | "ADMIN";
}

export class LecturerRegisterStartDto {
  @IsEmail()
  universityEmail!: string;
}

export class LecturerRegisterVerifyDto {
  @IsEmail()
  universityEmail!: string;

  @IsString()
  otp!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;

  @IsString()
  fullName!: string;

  @IsString()
  campusId!: string;

  @IsString()
  facultyId!: string;

  @IsString()
  departmentId!: string;
}

export class ForgotPasswordDto {
  @IsString()
  identifier!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;
}

export class AdminActivateDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword!: string;
}

export class CreateLecturerDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  temporaryPassword?: string;
}
