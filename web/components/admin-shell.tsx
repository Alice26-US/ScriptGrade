"use client";

import Link from "next/link";
import { Crest } from "@/components/crest";
import type { Me } from "@/components/shell";
import { api } from "@/lib/api";
import { loginPath } from "@/lib/portal";

export function AdminShell({
  me,
  section,
  onSection,
  children,
}: {
  me?: Me | null;
  section: string;
  onSection: (id: string) => void;
  children: React.ReactNode;
}) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "lecturers", label: "Manage Lecturers" },
    { id: "students", label: "Manage Students" },
    { id: "assignments", label: "Assignment Settings" },
    { id: "import", label: "University data" },
  ];

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = loginPath("ADMIN");
  }

  return (
    <div className="min-h-full bg-[#f4efe6]">
      <header className="topbar admin-topbar">
        <Link href="/admin" className="flex items-center gap-3 text-white">
          <Crest size={36} />
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold tracking-wide">
              SAINT LOUIS UNIVERSITY
            </span>
            <span className="block text-center text-[11px] tracking-[0.2em] text-white/80">
              CAMEROON
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm text-white">
          <span>Welcome, Admin</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
            {(me?.fullName ?? "A").slice(0, 1)}
          </span>
          <button type="button" onClick={logout} className="underline">
            Log out
          </button>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-72px)]">
        <aside className="hidden w-[220px] shrink-0 border-r border-[var(--line)] bg-[#f7f3ea] md:block">
          <nav className="flex flex-col pt-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSection(item.id)}
                className={`px-5 py-3.5 text-left text-sm font-semibold ${
                  section === item.id
                    ? "bg-[#1a4f8b] text-white"
                    : "text-[#1a4f8b] hover:bg-white/60"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={section === item.id ? "btn" : "btn btn-secondary"}
                onClick={() => onSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
