"use client";

import { RoleGate } from "@/components/role-gate";

export default function StudentResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate role="STUDENT">{children}</RoleGate>;
}
