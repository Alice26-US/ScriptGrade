"use client";

import Link from "next/link";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { homePath } from "@/lib/portal";
import type { Me } from "@/components/shell";

export default function LecturerPortalPage() {
  useEffect(() => {
    api<Me>("/api/auth/me")
      .then((me) => {
        if (me.role === "LECTURER") window.location.replace(homePath("LECTURER"));
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="hero-grid flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--navy)]">
          ScriptGrade
        </Link>
        <span className="badge">Lecturer Portal</span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <section className="card portal-card">
          <h1 className="text-2xl font-semibold text-[var(--navy)]">Lecturer Portal</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Login with your university email, or register.
          </p>
          <div className="actions">
            <Link className="btn btn-navy" href="/lecturer/login">
              Login
            </Link>
            <Link className="btn btn-secondary" href="/lecturer/register">
              Register
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
