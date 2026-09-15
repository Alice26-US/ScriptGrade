"use client";

import { RoleGate } from "@/components/role-gate";

export default function StudentExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate role="STUDENT">{children}</RoleGate>;
}
