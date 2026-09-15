"use client";

import { DashboardHome } from "@/components/dashboard-home";
import { RoleGate } from "@/components/role-gate";

export default function StudentDashboardPage() {
  return (
    <RoleGate role="STUDENT">
      <DashboardHome role="STUDENT" />
    </RoleGate>
  );
}
