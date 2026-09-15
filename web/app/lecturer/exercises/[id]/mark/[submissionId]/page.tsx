"use client";

import { use, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

type Page = { slot: number; url: string | null; quality: string };
type Spell = { id: string; token: string; suggestion?: string; status: string };
type Score = { criterionId: string; proposed: string; abstained: boolean; evidence?: string };
type ReviewFlag = { code: string; message: string; criterionId?: string };
type Sub = {
  id: string;
  status: string;
  officialTotal: string | null;
  officialLetterEn: string | null;
  student: { matricule: string; firstName: string; lastName: string };
  exercise?: { criteria: { id: string; name: string; maxPoints: string }[] };
  scores: { criterionId: string; score: string; criterion: { name: string; maxPoints: string } }[];
  feedback: { remarks: string; strengths: string; weaknesses: string; suggestions: string } | null;
  currentVersion?: {
    pages: Page[];
    spelling: Spell[];
    wordCount?: { estimated: number; minWords: number; belowMin: boolean; confidence: string };
    aiProposal?: {
      overallScore?: string | number | null;
      confidence?: string | null;
      strengths: string;
      weaknesses: string;
      suggestions: string;
      abstainNotes?: string;
      needsLecturerReview?: boolean;
      reviewFlags?: ReviewFlag[] | null;
      provider?: string;
      model?: string;
      criteria: Score[];
    };
    similarityHits: { textScore: string; imageScore: string; peerVersionId: string }[];
  };
};

export default function MarkOnePage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { submissionId } = use(params);
  const copy = t();
  const [sub, setSub] = useState<Sub | null>(null);
  const [error, setError] = useState("");
  const [remarks, setRemarks] = useState("");

  async function load() {
    const data = await api<Sub>(`/api/submissions/${submissionId}`);
    setSub(data);
    setRemarks(data.feedback?.remarks ?? "");
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [submissionId]);

  async function act(path: string, body?: unknown) {
    await api(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    await load();
  }

  if (!sub) {
    return (
      <Shell>
        <p>{error || "Loading…"}</p>
      </Shell>
    );
  }

  const wc = sub.currentVersion?.wordCount;

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-semibold">
        {sub.student.matricule} · {sub.student.firstName} {sub.student.lastName}
      </h1>
      <p className="mb-4 text-sm text-[var(--muted)]">
        {sub.status}
        {sub.officialTotal != null
          ? ` · ${sub.officialTotal} (${sub.officialLetterEn ?? ""})`
          : ""}
      </p>
      {error ? <p className="text-[var(--accent)]">{error}</p> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <button className="btn" type="button" onClick={() => act(`/api/submissions/${sub.id}/start-review`)}>
          {copy.startReview}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => act(`/api/submissions/${sub.id}/apply-proposal`)}>
          {copy.applyProposal}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => act(`/api/submissions/${sub.id}/finalize`)}>
          {copy.finalize}
        </button>
        <button className="btn" type="button" onClick={() => act(`/api/submissions/${sub.id}/release`)}>
          {copy.release}
        </button>
      </div>

      {wc?.belowMin ? (
        <p className="mb-3 rounded border border-[var(--warn)] bg-white px-3 py-2 text-sm">
          Word-count flag: ~{wc.estimated} words (min {wc.minWords}) — {wc.confidence} confidence.
          Not an automatic deduction.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {sub.currentVersion?.pages.map((p) => (
            <figure key={p.slot} className="card">
              <figcaption className="mb-2 text-sm">
                Page {p.slot} · {p.quality}
              </figcaption>
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={`Page ${p.slot}`} className="w-full rounded" />
              ) : null}
            </figure>
          ))}
        </div>
        <div className="space-y-3">
          <section className="card space-y-2">
            <h2 className="font-medium">Rubric (sum is the only total)</h2>
            {(sub.scores.length
              ? sub.scores.map((s) => ({
                  id: s.criterionId,
                  name: s.criterion.name,
                  maxPoints: s.criterion.maxPoints,
                  score: s.score,
                }))
              : (sub.exercise?.criteria ?? []).map((c) => ({
                  id: c.id,
                  name: c.name,
                  maxPoints: c.maxPoints,
                  score: "0",
                }))
            ).map((s) => (
              <label key={s.id} className="field">
                {s.name} / {s.maxPoints}
                <input
                  type="number"
                  step="0.25"
                  defaultValue={Number(s.score)}
                  onBlur={(e) =>
                    act(`/api/submissions/${sub.id}/criteria/${s.id}`, {
                      score: Number(e.target.value),
                      reason: "lecturer edit",
                    })
                  }
                />
              </label>
            ))}
          </section>
          <section className="card space-y-2">
            <h2 className="font-medium">{copy.spelling}</h2>
            {(sub.currentVersion?.spelling ?? []).map((sp) => (
              <div key={sp.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <u>{sp.token}</u>
                  {sp.suggestion ? ` → ${sp.suggestion}` : ""} · {sp.status}
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => act(`/api/spelling/${sp.id}`, { status: "DISMISSED" })}>
                    {copy.dismiss}
                  </button>
                  <button type="button" onClick={() => act(`/api/spelling/${sp.id}`, { status: "CONFIRMED" })}>
                    {copy.confirm}
                  </button>
                </span>
              </div>
            ))}
          </section>
          <section className="card space-y-2">
            <h2 className="font-medium">Feedback (student sees this after release)</h2>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() =>
                act(`/api/submissions/${sub.id}/feedback`, {
                  remarks,
                  strengths: sub.currentVersion?.aiProposal?.strengths,
                  weaknesses: sub.currentVersion?.aiProposal?.weaknesses,
                  suggestions: sub.currentVersion?.aiProposal?.suggestions,
                })
              }
            >
              Save remarks
            </button>
            {sub.currentVersion?.aiProposal ? (
              <div className="space-y-2 text-sm text-[var(--muted)]">
                <p>
                  AI proposal ({sub.currentVersion.aiProposal.provider}/
                  {sub.currentVersion.aiProposal.model}) — not shown to the student
                  until you release.
                </p>
                <p>
                  Proposed total: {sub.currentVersion.aiProposal.overallScore ?? "—"} ·
                  confidence {sub.currentVersion.aiProposal.confidence ?? "—"}
                  {sub.currentVersion.aiProposal.needsLecturerReview
                    ? " · flagged for lecturer review"
                    : ""}
                </p>
                {sub.currentVersion.aiProposal.abstainNotes ? (
                  <p>Notes: {sub.currentVersion.aiProposal.abstainNotes}</p>
                ) : null}
                {(sub.currentVersion.aiProposal.reviewFlags ?? []).map((flag) => (
                  <p key={`${flag.code}-${flag.message}`}>
                    {flag.code}: {flag.message}
                  </p>
                ))}
                <p className="whitespace-pre-wrap">
                  Strengths: {sub.currentVersion.aiProposal.strengths}
                </p>
                <p className="whitespace-pre-wrap">
                  Weaknesses: {sub.currentVersion.aiProposal.weaknesses}
                </p>
                <p className="whitespace-pre-wrap">
                  Suggestions: {sub.currentVersion.aiProposal.suggestions}
                </p>
                {sub.currentVersion.aiProposal.criteria.map((c) => (
                  <p key={c.criterionId}>
                    Criterion {c.criterionId.slice(-6)}: {c.proposed}
                    {c.abstained ? " (abstained)" : ""}
                    {c.evidence ? ` — ${c.evidence}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
          {(sub.currentVersion?.similarityHits.length ?? 0) > 0 ? (
            <section className="card">
              <h2 className="font-medium">{copy.similarity}</h2>
              <ul className="text-sm">
                {sub.currentVersion!.similarityHits.map((h) => (
                  <li key={h.peerVersionId}>
                    text {h.textScore} · image {h.imageScore}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="card space-y-2">
            <h2 className="font-medium">{copy.returnScript}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                act(`/api/submissions/${sub.id}/return`, {
                  reason: String(fd.get("reason")),
                  personalDueAt: new Date(String(fd.get("due"))).toISOString(),
                });
              }}
              className="space-y-2"
            >
              <input name="reason" placeholder="Reason (required)" required />
              <input type="datetime-local" name="due" required />
              <button className="btn btn-secondary" type="submit">
                Return
              </button>
            </form>
          </section>
        </div>
      </div>
    </Shell>
  );
}
