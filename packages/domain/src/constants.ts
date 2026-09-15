/** System cap — lecturer may set a lower max pages per exercise. */
export const SYSTEM_MAX_PAGES = 10;

export const DEFAULT_GRACE_SECONDS = 30 * 60;
export const MIN_GRACE_SECONDS = 0;
export const MAX_GRACE_SECONDS = 60 * 60;

export const STUDENT_RESUBMIT_CAP = 10;

export const DEFAULT_RETENTION_YEARS = 5;

export const OTP_TTL_MINUTES = 10;
export const OTP_LENGTH = 6;

export const MIN_PASSWORD_LENGTH = 8;

export const UNIVERSITY_CAMPUSES = [
  { code: "BONABERI", name: "Bonaberi" },
  { code: "BONAMOUSSADI", name: "Bonamoussadi" },
  { code: "NDOGPASSI", name: "Ndogpassi" },
] as const;
export type UniversityCampusCode = (typeof UNIVERSITY_CAMPUSES)[number]["code"];
export const UNIVERSITY_CAMPUS_CODES: UniversityCampusCode[] = UNIVERSITY_CAMPUSES.map(
  (c) => c.code,
);

export const UNIVERSITY_LEVELS = [
  { code: "HND1", name: "HND 1" },
  { code: "HND2", name: "HND 2" },
  { code: "Y1", name: "Year 1" },
  { code: "Y2", name: "Year 2" },
  { code: "Y3", name: "Year 3" },
  { code: "Y4", name: "Year 4" },
] as const;

export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL = "7d";
