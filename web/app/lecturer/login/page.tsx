"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthSplit } from "@/components/auth-split";
import { api } from "@/lib/api";
import { homePath } from "@/lib/portal";

type Campus = { id: string; name: string };

export default function LecturerLoginPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ identifier: email, password, role: "LECTURER" }),
      });
      window.location.href =
        res.profileComplete === false ? "/profile/setup" : homePath("LECTURER");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      variant="lecturer"
      kicker="For lecturers"
      headline="Set the brief. Set the date. Let the portal do the chasing."
      blurb="Publish assignment briefs with live deadlines, watch submissions arrive by campus and course, and grade scanned essays without leaving your desk."
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-3.5 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--navy-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--navy-700)]" />
          Faculty sign in
        </div>
        <h2 className="font-display text-[29px] font-medium text-[var(--crimson-900)]">
          Good to see you, Professor
        </h2>
        <p className="mb-8 mt-2 text-[14.5px] leading-relaxed text-[var(--muted)]">
          Sign in to set assignments, adjust deadlines, and review submitted scans.
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
            Staff email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="firstname.lastname@sli.cm"
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
              <input type="checkbox" className="accent-[var(--crimson-700)]" /> Keep me signed in
            </label>
            <Link href="/lecturer/forgot" className="font-medium text-[var(--navy-700)]">
              Forgot password?
            </Link>
          </div>
          {error ? <p className="mb-3 text-sm text-[var(--crimson-700)]">{error}</p> : null}
          <button className="btn btn-crimson w-full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in to faculty dashboard"}
          </button>
        </form>
        <div className="mt-6 flex gap-2.5 rounded-lg border border-[var(--line)] bg-[#f1f0eb] p-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C574C" strokeWidth="1.6" className="mt-0.5 shrink-0">
            <path d="M12 2 L20 5.5 L20 11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 L4 5.5 Z" />
          </svg>
          <p className="text-[12.5px] leading-relaxed text-[var(--muted)]">
            Faculty accounts use your university email.{" "}
            <Link href="/lecturer/register" className="font-semibold text-[var(--navy-700)]">
              Register here
            </Link>{" "}
            if you do not have an account yet.
          </p>
        </div>
      </div>
    </AuthSplit>
  );
}
