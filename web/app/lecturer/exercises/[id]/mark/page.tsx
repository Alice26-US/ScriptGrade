"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

type Row = {
  id: string;
  status: string;
  officialTotal: string | null;
  student: { matricule: string; firstName: string; lastName: string };
  currentVersion?: { similarityHits?: unknown[] };
};

export default function MarkQueuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const copy = t();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [matricule, setMatricule] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await api<Row[]>(`/api/exercises/${id}/marking`);
    setRows(list);
  }

  useEffect(() => {
    api<{ status: string }>(`/api/exercises/${id}`)
      .then((ex) => setStatus(ex.status))
      .catch((e: Error) => setError(e.message));
    load().catch((e: Error) => setError(e.message));
  }, [id]);

  async function publish() {
    setError("");
    setBusy(true);
    try {
      const res = await api<{ status?: string; enrolled?: number }>(`/api/exercises/${id}/publish`, {
        method: "POST",
      });
      setStatus(res.status ?? "PUBLISHED");
      setMessage(
        res.enrolled
          ? `Published. ${res.enrolled} student(s) in this class can now see it.`
          : "Published. Add students by matricule if they do not appear yet.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function enrol(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ matricule: string; fullName: string }>(`/api/exercises/${id}/enrol`, {
        method: "POST",
        body: JSON.stringify({ matricule }),
      });
      setMessage(`${res.fullName} (${res.matricule}) was added to this class.`);
      setMatricule("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{copy.mark}</h1>
        {status === "DRAFT" ? (
          <button className="btn" type="button" disabled={busy} onClick={() => void publish()}>
            Publish to students
          </button>
        ) : (
          <span className="badge">{status}</span>
        )}
      </div>
      {status === "DRAFT" ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          This is still a draft. Students cannot see it until you publish.
        </p>
      ) : (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Students in this class (same campus, programme and level) can see it. You can also add a
          student by matricule.
        </p>
      )}
      <form onSubmit={enrol} className="card mb-4 flex flex-wrap items-end gap-3">
        <label className="field min-w-[12rem] flex-1">
          Add student (matricule)
          <input
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            required
            placeholder="SWE/24/0016"
          />
        </label>
        <button className="btn btn-secondary" type="submit" disabled={busy}>
          Add to class
        </button>
      </form>
      {message ? <p className="mb-3 text-sm text-[var(--ok)]">{message}</p> : null}
      {error ? <p className="mb-3 text-[var(--accent)]">{error}</p> : null}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">
                {row.student.matricule} · {row.student.firstName} {row.student.lastName}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {row.status}
                {row.officialTotal != null ? ` · ${row.officialTotal}` : ""}
                {row.currentVersion?.similarityHits &&
                row.currentVersion.similarityHits.length > 0
                  ? " · similarity flag"
                  : ""}
              </p>
            </div>
            <Link className="btn btn-secondary" href={`/lecturer/exercises/${id}/mark/${row.id}`}>
              Open
            </Link>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No submissions yet.</li>
        ) : null}
      </ul>
    </Shell>
  );
}
