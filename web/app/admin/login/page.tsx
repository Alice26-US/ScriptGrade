"use client";

import { FormEvent, useState } from "react";
import { AuthSplit } from "@/components/auth-split";
import { api } from "@/lib/api";
import { homePath } from "@/lib/portal";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ role: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: email, password, role: "ADMIN" }),
      });
      window.location.href = homePath(res.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit
      variant="admin"
      kicker="Administrator"
      headline="University records and class setup."
      blurb="Sign in to manage lecturers, students, and class offerings."
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-3.5 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--crimson-700)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--crimson-700)]" />
          Admin sign in
        </div>
        <h2 className="font-display text-[29px] font-medium text-[var(--navy-900)]">Welcome, Admin</h2>
        <p className="mb-8 mt-2 text-[14.5px] text-[var(--muted)]">Use your administrator email.</p>
        <form onSubmit={onSubmit} className="space-y-5">
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-[var(--crimson-700)]">{error}</p> : null}
          <button className="btn w-full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </AuthSplit>
  );
}
