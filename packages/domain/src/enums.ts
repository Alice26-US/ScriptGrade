export const UserRole = {
  STUDENT: "STUDENT",
  LECTURER: "LECTURER",
  ADMIN: "ADMIN",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Locale = {
  EN: "EN",
  FR: "FR",
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const ExerciseLanguage = {
  EN: "EN",
  FR: "FR",
} as const;
export type ExerciseLanguage = (typeof ExerciseLanguage)[keyof typeof ExerciseLanguage];

export const ExerciseStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ExerciseStatus = (typeof ExerciseStatus)[keyof typeof ExerciseStatus];

export const SubmissionStatus = {
  DRAFT: "DRAFT",
  RESERVING: "RESERVING",
  UPLOADING: "UPLOADING",
  SUBMITTED: "SUBMITTED",
  PROCESSING: "PROCESSING",
  AI_PROPOSED: "AI_PROPOSED",
  IN_REVIEW: "IN_REVIEW",
  RETURNED: "RETURNED",
  GRADED: "GRADED",
  RELEASED: "RELEASED",
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const CriterionKind = {
  NORMAL: "NORMAL",
  SPELLING: "SPELLING",
  LENGTH: "LENGTH",
} as const;
export type CriterionKind = (typeof CriterionKind)[keyof typeof CriterionKind];

export const SpellingErrorStatus = {
  SUSPECT: "SUSPECT",
  CONFIRMED: "CONFIRMED",
  DISMISSED: "DISMISSED",
} as const;
export type SpellingErrorStatus =
  (typeof SpellingErrorStatus)[keyof typeof SpellingErrorStatus];

export const ReservationStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type ReservationStatus =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

export const PageQuality = {
  PENDING: "PENDING",
  OK: "OK",
  FAIL_BLUR: "FAIL_BLUR",
  FAIL_DARK: "FAIL_DARK",
  FAIL_RESOLUTION: "FAIL_RESOLUTION",
  FAIL_BLANK: "FAIL_BLANK",
  FAIL_CHECKSUM: "FAIL_CHECKSUM",
} as const;
export type PageQuality = (typeof PageQuality)[keyof typeof PageQuality];

export const VersionSource = {
  STUDENT: "STUDENT",
  RETURN: "RETURN",
} as const;
export type VersionSource = (typeof VersionSource)[keyof typeof VersionSource];

export const ImportKind = {
  CAMPUSES: "CAMPUSES",
  FACULTIES: "FACULTIES",
  DEPARTMENTS: "DEPARTMENTS",
  PROGRAMMES: "PROGRAMMES",
  COURSES: "COURSES",
  TERMS: "TERMS",
  OFFERINGS: "OFFERINGS",
  ENROLMENTS: "ENROLMENTS",
  OFFERING_LECTURERS: "OFFERING_LECTURERS",
} as const;
export type ImportKind = (typeof ImportKind)[keyof typeof ImportKind];
