"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crest } from "@/components/crest";
import { api } from "@/lib/api";
import { getLocale, setLocale, t } from "@/lib/i18n";
import { homePath, loginPath } from "@/lib/portal";

export type Me = {
  role: "STUDENT" | "LECTURER" | "ADMIN";
  firstName?: string;
  lastName?: string;
  matricule?: string;
  email?: string;
  universityEmail?: string;
  fullName?: string;
  campus?: string | null;
  faculty?: string | null;
  department?: string | null;
  programme?: string | null;
  level?: string | null;
  profileComplete?: boolean;
};

export function Shell({ children }: { children: React.ReactNode }) {
  const copy = t();
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function logout() {
    const dest = loginPath(me?.role);
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = dest;
  }

  const initials = (me?.fullName ?? me?.firstName ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const studentNav =
    me?.role === "STUDENT"
      ? [
          { href: "/student/dashboard", label: "Dashboard" },
          { href: "/student/dashboard", label: "Submit work" },
          { href: "/profile", label: "My grades" },
        ]
      : me?.role === "LECTURER"
        ? [
            { href: "/lecturer/dashboard", label: "Dashboard" },
            { href: "/lecturer/exercises/new", label: "Set assignment" },
            { href: "/profile", label: "Profile" },
          ]
        : me?.role === "ADMIN"
          ? [{ href: "/admin", label: "Dashboard" }]
          : [];

  return (
    <div className="min-h-full bg-[var(--parchment)] text-[var(--ink)]">
      <header className={`topbar ${me?.role === "ADMIN" ? "admin-topbar" : ""}`}>
        <Link href={homePath(me?.role)} className="flex items-center gap-3 text-[#efe9da]">
          <Crest size={34} />
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-semibold">
              {me?.role === "ADMIN" ? "Saint Louis University" : "Saint Louis Institute"}
            </span>
            <span className="hidden text-[11px] text-[#9aa6b5] sm:block">
              {me?.campus ?? "Cameroon"}
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {studentNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-3.5 py-2 text-[13.5px] text-[#c7ceda] hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden rounded border border-white/20 px-2 py-1 text-xs text-[#c7ceda] sm:inline"
            onClick={() => setLocale(getLocale() === "EN" ? "FR" : "EN")}
          >
            {getLocale() === "EN" ? "FR" : "EN"}
          </button>
          {me ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-[13px] font-semibold text-white">
                  {me.fullName ?? me.matricule ?? me.email}
                </div>
                <div className="text-[11.5px] text-[#9aa6b5]">
                  {[me.level, me.department ?? me.faculty].filter(Boolean).join(" · ") || me.role}
                </div>
              </div>
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--crimson-700)] text-[13px] font-semibold text-white">
                {initials}
              </div>
              <button type="button" onClick={logout} className="text-xs text-[#c7ceda] underline">
                {copy.logout}
              </button>
            </div>
          ) : me === null ? (
            <Link href="/" className="text-sm text-[#c7ceda]">
              {copy.login}
            </Link>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
