import { UserRole } from "@scriptgrade/domain";

export type Actor = {
  accountId: string;
  role: UserRole;
  studentId: string | null;
  lecturerId: string | null;
  adminEmail: string | null;
  locale: "EN" | "FR";
};
