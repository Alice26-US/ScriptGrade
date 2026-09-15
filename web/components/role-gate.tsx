"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { homePath, loginPath, type PortalRole } from "@/lib/portal";
import type { Me } from "@/components/shell";

export function RoleGate({
  role,
  children,
}: {
  role: PortalRole | PortalRole[];
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState(false);
  const allowedKey = (Array.isArray(role) ? role : [role]).join(",");

  useEffect(() => {
    const allowed = allowedKey.split(",") as PortalRole[];
    api<Me>("/api/auth/me")
      .then((me) => {
        if (me.profileComplete === false && !window.location.pathname.startsWith("/profile/setup")) {
          window.location.replace("/profile/setup");
          return;
        }
        if (!allowed.includes(me.role)) {
          window.location.replace(homePath(me.role));
          return;
        }
        setOk(true);
      })
      .catch(() => {
        window.location.replace(loginPath(allowed[0]));
      });
  }, [allowedKey]);

  if (!ok) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
