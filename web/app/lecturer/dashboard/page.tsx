"use client";

import { DashboardHome } from "@/components/dashboard-home";
import { RoleGate } from "@/components/role-gate";

export default function LecturerDashboardPage() {
  return (
    <RoleGate role="LECTURER">
      <DashboardHome role="LECTURER" />
    </RoleGate>
  );
}
