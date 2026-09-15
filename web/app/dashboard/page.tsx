"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { homePath } from "@/lib/portal";
import type { Me } from "@/components/shell";

export default function DashboardRedirectPage() {
  useEffect(() => {
    api<Me>("/api/auth/me")
      .then((me) => {
        window.location.replace(homePath(me.role));
      })
      .catch(() => {
        window.location.replace("/");
      });
  }, []);

  return (
    <div className="flex min-h-full items-center justify-center text-sm text-[var(--muted)]">
      Loading…
    </div>
  );
}
