import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { CriterionKind, ExerciseLanguage } from "@scriptgrade/domain";

export class CriterionDto {
  @IsString()
  name!: string;

  @IsNumber()
  maxPoints!: number;

  @IsEnum(CriterionKind)
  kind!: CriterionKind;

  @IsInt()
  sortOrder!: number;

  @IsOptional()
  @IsNumber()
  spellingDeduction?: number;

  @IsOptional()
  @IsNumber()
  spellingFloor?: number;
}

export class BandDto {
  @IsNumber()
  minScore!: number;

  @IsNumber()
  maxScore!: number;

  @IsString()
  labelEn!: string;

  @IsString()
  labelFr!: string;
}

export class UpsertExerciseDto {
  @IsString()
  offeringId!: string;

  @IsString()
  title!: string;

  @IsString()
  prompt!: string;

  @IsEnum(ExerciseLanguage)
  language!: ExerciseLanguage;

  @IsNumber()
  maxScore!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minWords?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxPages?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minPages?: number;

  @IsString()
  opensAt!: string;

  @IsString()
  closesAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  graceSeconds?: number;

  @IsOptional()
  @IsNumber()
  similarityThreshold?: number;

  @IsOptional()
  @IsBoolean()
  showSpellingToStudent?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionDto)
  @ArrayMinSize(1)
  criteria!: CriterionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BandDto)
  @ArrayMinSize(1)
  bands!: BandDto[];
}

export class GrantAccessDto {
  @IsString()
  lecturerId!: string;
}
