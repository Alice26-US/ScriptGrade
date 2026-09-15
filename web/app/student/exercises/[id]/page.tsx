"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { Shell } from "@/components/shell";
import { api, apiForm } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { DraftPage, loadDraft, saveDraft } from "@/lib/idb";

type Exercise = {
  id: string;
  title: string;
  prompt: string;
  language: string;
  minWords: number;
  maxPages: number;
  minPages: number;
  status: string;
  closesAt: string;
  createdAt?: string;
  timezone: string;
  maxScore: string;
  owner?: { firstName: string; lastName: string };
  offering?: { course?: { code: string; title: string } };
};

type Mine = { id?: string; studentFacing: string; releasedAt?: string | null };
type Other = {
  id: string;
  title: string;
  status: string;
  closesAt?: string;
  offering?: { course?: { code: string; title: string } };
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(iso?: string) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    if (!iso) return;
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) {
        setLabel("00:00:00");
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLabel(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return label;
}

export default function StudentExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ex, setEx] = useState<Exercise | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);
  const [others, setOthers] = useState<Other[]>([]);
  const [pages, setPages] = useState<DraftPage[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remaining = useCountdown(ex?.closesAt);

  useEffect(() => {
    api<Exercise>(`/api/exercises/${id}`)
      .then(setEx)
      .catch((e: Error) => setError(e.message));
    api<Mine>(`/api/exercises/${id}/submission`)
      .then(setMine)
      .catch(() => undefined);
    api<Other[]>("/api/exercises")
      .then((list) => setOthers(list.filter((e) => e.id !== id)))
      .catch(() => undefined);
    loadDraft(id).then(setPages);
  }, [id]);

  async function persist(next: DraftPage[]) {
    setPages(next);
    await saveDraft(id, next);
    if (navigator.onLine) {
      for (const p of next) {
        try {
          await apiForm(`/api/exercises/${id}/drafts/${p.slot}`, p.blob);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files || !ex) return;
    const next = [...pages];
    for (const file of Array.from(files)) {
      if (next.length >= ex.maxPages) break;
      const blob = await compressImage(file);
      next.push({ slot: next.length + 1, blob, mime: blob.type });
    }
    await persist(next.map((p, i) => ({ ...p, slot: i + 1 })));
  }

  function remove(index: number) {
    persist(pages.filter((_, i) => i !== index).map((p, i) => ({ ...p, slot: i + 1 })));
  }

  async function submit() {
    if (!ex) return;
    if (pages.length < ex.minPages) {
      setError(`Need at least ${ex.minPages} page(s)`);
      return;
    }
    if (!confirmed) {
      setError("Confirm that this is your own work and every page uploaded correctly.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Uploading…");
    try {
      const reservation = await api<{ versionId: string }>(`/api/exercises/${id}/reserve`, {
        method: "POST",
        body: JSON.stringify({ slots: pages.map((p) => p.slot) }),
      });
      for (const page of pages) {
        const uploaded = await apiForm<{ quality: string }>(
          `/api/versions/${reservation.versionId}/pages/${page.slot}`,
          page.blob,
        );
        if (uploaded.quality !== "OK") {
          setError(`Page ${page.slot} failed quality (${uploaded.quality}). Recapture that slot only.`);
          setBusy(false);
          setStatus("");
          return;
        }
      }
      await api(`/api/versions/${reservation.versionId}/complete`, { method: "POST" });
      setStatus("Submitted successfully");
      const sub = await api<Mine>(`/api/exercises/${id}/submission`);
      setMine(sub);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  const due = ex ? new Date(ex.closesAt) : null;
  const ownerName = ex?.owner
    ? `${ex.owner.firstName} ${ex.owner.lastName}`.trim()
    : null;

  const otherFlags = useMemo(() => {
    return others.map((item) => {
      const hrs = item.closesAt ? (new Date(item.closesAt).getTime() - Date.now()) / 3600000 : 99;
      const flag =
        item.status === "SUBMITTED" || item.status === "GRADED" || item.status === "RELEASED"
          ? "done"
          : hrs < 72
            ? "urgent"
            : "ontrack";
      return { ...item, flag, hrs };
    });
  }, [others]);

  if (!ex && !error) return <Shell>Loading…</Shell>;

  return (
    <Shell>
      <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="mb-1.5 text-[12.5px] text-[var(--ink-400)]">
            <b className="text-[var(--muted)]">Submit work</b>
            {ex?.offering?.course ? ` — ${ex.offering.course.title}` : null}
          </p>

          {error && !ex ? <p className="text-[var(--crimson-700)]">{error}</p> : null}

          {ex ? (
            <div className="assign-card relative mb-6 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--paper)] px-7 py-7">
              <div className="absolute bottom-0 left-0 top-0 w-1 bg-[linear-gradient(180deg,var(--crimson-700),var(--navy-700))]" />
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <div>
                  <p className="mb-2 text-[12.5px] font-semibold text-[var(--crimson-700)]">
                    {ex.offering?.course
                      ? `${ex.offering.course.code} · ${ex.offering.course.title}`
                      : ex.language}
                  </p>
                  <h1 className="font-display text-2xl font-medium text-[var(--navy-900)]">{ex.title}</h1>
                  {ownerName ? (
                    <p className="mt-2 text-[13.5px] text-[var(--muted)]">
                      Set by <b className="text-[var(--ink)]">{ownerName}</b>
                    </p>
                  ) : null}
                </div>
                <div className="min-w-[132px] rounded-[10px] border border-[#e3c3c6] bg-[var(--crimson-050)] px-5 py-3.5 text-center">
                  <div className="text-[11px] font-semibold tracking-wide text-[var(--crimson-700)]">
                    TIME REMAINING
                  </div>
                  <div className="mt-1 font-mono text-[22px] font-medium text-[var(--crimson-900)]">
                    {remaining}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--muted)]">
                    Due {due?.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-7 border-t border-[var(--line)] pt-5">
                <div>
                  <div className="text-[11px] text-[var(--ink-400)]">Format required</div>
                  <div className="text-[13.5px] font-semibold">Photos of handwritten pages</div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-400)]">Word / page limit</div>
                  <div className="text-[13.5px] font-semibold">
                    {ex.minPages}–{ex.maxPages} pages
                    {ex.minWords ? ` · min ${ex.minWords} words` : ""}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--ink-400)]">Status</div>
                  <div className="text-[13.5px] font-semibold">{mine?.studentFacing ?? "not submitted"}</div>
                </div>
              </div>
              <article className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">
                {ex.prompt}
              </article>
            </div>
          ) : null}

          <div className="mb-6 flex flex-wrap items-center gap-2 text-[13px] text-[var(--ink-400)]">
            <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--navy-900)] text-[11.5px] text-white">
                1
              </span>
              Read brief
            </span>
            <span className="h-px w-9 bg-[var(--line)]" />
            <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--navy-900)] text-[11.5px] text-white">
                2
              </span>
              Scan & upload
            </span>
            <span className="h-px w-9 bg-[var(--line)]" />
            <span className="flex items-center gap-2">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#e3dcc9] text-[11.5px] text-[var(--muted)]">
                3
              </span>
              Confirm & submit
            </span>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-7">
            <h2 className="font-display text-lg font-medium text-[var(--navy-900)]">
              Upload your scanned essay
            </h2>
            <p className="mb-5 mt-1 text-[13.5px] text-[var(--muted)]">
              Use your phone camera or a scanner app. Make sure every page is in order and legible
              before uploading.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <button type="button" className="dropzone w-full" onClick={() => inputRef.current?.click()}>
              <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[10px] border border-[var(--line)] bg-[var(--paper)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F" strokeWidth="1.6">
                  <path d="M12 3v12M7 8l5-5 5 5" />
                  <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </div>
              <h4 className="text-[15px] font-semibold text-[var(--navy-900)]">Drag your scan here, or</h4>
              <p className="mt-1.5 text-[13px] text-[var(--muted)]">
                Accepted: JPG, PNG, WebP — up to {ex?.maxPages ?? 10} pages
              </p>
              <span className="btn mt-4 inline-flex">Browse files</span>
              <p className="mt-3.5 text-[11.5px] text-[var(--ink-400)]">
                Tip: the Camera app document scan mode gives the cleanest result
              </p>
            </button>

            {pages.map((p, i) => (
              <div
                key={p.slot}
                className="mt-4 flex items-center gap-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-4 py-3.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(p.blob)}
                  alt={`Page ${p.slot}`}
                  className="h-12 w-9 rounded-sm object-cover"
                />
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold">Page {p.slot}</div>
                  <div className="text-xs text-[var(--muted)]">{p.mime}</div>
                </div>
                <span className="badge-ok rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
                  Ready
                </span>
                <button
                  type="button"
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-[var(--line)] text-[var(--ink-400)]"
                  onClick={() => remove(i)}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="mt-5 flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="accent-[var(--navy-700)]"
                />
                This is my own work and every page has uploaded correctly
              </label>
              <button
                className="btn btn-crimson"
                type="button"
                disabled={busy || pages.length === 0}
                onClick={() => void submit()}
              >
                {busy ? "Submitting…" : "Submit essay"}
              </button>
            </div>
            {status ? <p className="mt-3 text-sm text-[var(--ok)]">{status}</p> : null}
            {error && ex ? <p className="mt-3 text-sm text-[var(--crimson-700)]">{error}</p> : null}
            {mine?.releasedAt && mine.id ? (
              <Link className="mt-3 inline-block text-sm font-semibold text-[var(--gold)]" href={`/student/results/${mine.id}`}>
                View released results →
              </Link>
            ) : null}
          </div>
        </div>

        <aside>
          <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-5 pb-2 pt-5">
            <h3 className="mb-4 font-display text-[15.5px] font-semibold text-[var(--navy-900)]">
              Your other assignments
            </h3>
            {otherFlags.length === 0 ? (
              <p className="py-3 text-sm text-[var(--muted)]">No other published exercises.</p>
            ) : (
              otherFlags.map((item) => (
                <Link
                  key={item.id}
                  href={`/student/exercises/${item.id}`}
                  className="flex items-center justify-between gap-2.5 border-t border-[var(--line)] py-3 first:border-t-0"
                >
                  <div>
                    <div className="text-[13px] font-semibold">{item.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                      {item.offering?.course?.code ?? item.status}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
                      item.flag === "urgent"
                        ? "badge-urgent"
                        : item.flag === "done"
                          ? "badge-ok"
                          : "badge"
                    }`}
                  >
                    {item.flag === "urgent" ? "Urgent" : item.flag === "done" ? "Submitted" : "On track"}
                  </span>
                </Link>
              ))
            )}
          </div>
          <div className="rounded-xl bg-[var(--navy-900)] p-5 text-[#efe9da]">
            <h4 className="font-display text-[15px] font-semibold text-white">Scan not uploading?</h4>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#b9c2cf]">
              If a page is rejected, recapture that page only. Keep photos sharp, upright, and under the
              page limit.
            </p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
