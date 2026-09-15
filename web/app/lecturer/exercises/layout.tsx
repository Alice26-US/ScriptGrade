"use client";

import { RoleGate } from "@/components/role-gate";

export default function LecturerExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate role={["LECTURER", "ADMIN"]}>{children}</RoleGate>;
}
