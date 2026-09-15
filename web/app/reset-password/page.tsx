"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setInfo("Password updated. You can log in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="field">
        Reset token
        <input value={token} onChange={(e) => setToken(e.target.value)} required />
      </label>
      <label className="field">
        New password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      {info ? <p className="text-sm text-[var(--ok)]">{info}</p> : null}
      {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
      <button className="btn w-full" type="submit" disabled={busy}>
        Save password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="hero-grid flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--navy)]">
          ScriptGrade
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="card w-full max-w-md space-y-4">
          <h1 className="text-2xl font-semibold text-[var(--navy)]">Reset password</h1>
          <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
            <ResetForm />
          </Suspense>
          <p className="text-sm text-[var(--muted)]">
            <Link href="/">Back to ScriptGrade</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
