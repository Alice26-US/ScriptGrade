"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { api } from "@/lib/api";

export default function StudentForgotPage() {
  const [matricule, setMatricule] = useState("");
  const [info, setInfo] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ ok: true; token?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier: matricule }),
      });
      setInfo("If that account exists, a reset message was sent.");
      if (res.token) setToken(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame portal="student" title="Forgot password">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="field">
          Matricule
          <input value={matricule} onChange={(e) => setMatricule(e.target.value)} required />
        </label>
        {info ? <p className="text-sm text-[var(--ok)]">{info}</p> : null}
        {token ? (
          <p className="text-sm">
            Reset token: <code>{token}</code>
          </p>
        ) : null}
        {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
        <button className="btn w-full" type="submit" disabled={busy}>
          Send reset
        </button>
        {token ? (
          <p className="text-sm">
            <Link href={`/reset-password?token=${encodeURIComponent(token)}`}>Set a new password</Link>
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Have a token? <Link href="/reset-password">Reset password</Link>
          </p>
        )}
        <p className="text-sm text-[var(--muted)]">
          <Link href="/student/login">Back to login</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
