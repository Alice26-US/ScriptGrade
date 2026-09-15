"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthSplit } from "@/components/auth-split";
import { api } from "@/lib/api";
import { homePath } from "@/lib/portal";

type Campus = { id: string; name: string };

export default function StudentLoginPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState("");
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Campus[]>("/api/catalog/campuses")
      .then((list) => {
        setCampuses(list);
        if (list[0]) setCampusId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ role: string; profileComplete?: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: matricule, password, role: "STUDENT" }),
      });
      window.location.href =
        res.profileComplete === false ? "/profile/setup" : homePath("STUDENT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      variant="student"
      kicker="Student Portal"
      headline="Your essays, submitted on time, every time."
      blurb="Sign in to view assignment briefs from your lecturers, track deadlines, and upload your scanned work in one place."
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-3.5 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--crimson-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--crimson-700)]" />
          Student sign in
        </div>
        <h2 className="font-display text-[29px] font-medium text-[var(--navy-900)]">Welcome back</h2>
        <p className="mb-8 mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
          Enter your student credentials to reach your submission dashboard.
        </p>
        <form onSubmit={onSubmit}>
          <label className="field mb-5">
            Your campus
            <select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              {campuses.length === 0 ? <option value="">Loading campuses…</option> : null}
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  Saint Louis Institute — {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field mb-5">
            Matriculation number
            <input
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              required
              autoComplete="username"
              placeholder="e.g. SWE/24/0016"
            />
          </label>
          <label className="field mb-5">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="••••••••••"
            />
          </label>
          <div className="mb-7 flex items-center justify-between text-[13.5px]">
            <label className="flex items-center gap-2 font-normal text-[var(--muted)]">
              <input type="checkbox" className="accent-[var(--navy-700)]" /> Keep me signed in
            </label>
            <Link href="/student/forgot" className="font-medium text-[var(--crimson-700)]">
              Forgot password?
            </Link>
          </div>
          {error ? <p className="mb-3 text-sm text-[var(--crimson-700)]">{error}</p> : null}
          <button className="btn w-full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to submit work"}
          </button>
        </form>
        <div className="my-6 flex items-center gap-3.5 text-[12.5px] text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--line)]" />
          new here
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <p className="text-center text-[13px] text-[var(--muted)]">
          First submission on this platform?{" "}
          <Link href="/student/register" className="font-semibold text-[var(--crimson-700)]">
            Activate your student account
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
