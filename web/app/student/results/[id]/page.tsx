"use client";

import { use, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";

type Result = {
  released: boolean;
  status?: string;
  total?: string;
  letterEn?: string;
  letterFr?: string;
  maxScore?: string;
  remarks?: string;
  strengths?: string;
  weaknesses?: string;
  suggestions?: string;
  rubric?: { name: string; score: string; maxPoints: string }[];
  spelling?: { token: string; suggestion?: string }[];
};

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    api<Result>(`/api/results/${id}`).then(setData);
  }, [id]);

  if (!data) return <Shell>Loading…</Shell>;
  if (!data.released) {
    return (
      <Shell>
        <p>Status: {data.status ?? "received"}</p>
        <p className="text-sm text-[var(--muted)]">
          Marks and comments appear only after the lecturer releases them.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold">
        {data.total} / {data.maxScore} · {data.letterEn}
      </h1>
      <div className="mt-4 space-y-3">
        <section className="card">
          <h2 className="font-medium">Remarks</h2>
          <p className="whitespace-pre-wrap">{data.remarks}</p>
        </section>
        <section className="card">
          <h2 className="font-medium">Strengths</h2>
          <p className="whitespace-pre-wrap">{data.strengths}</p>
        </section>
        <section className="card">
          <h2 className="font-medium">Weaknesses</h2>
          <p className="whitespace-pre-wrap">{data.weaknesses}</p>
        </section>
        <section className="card">
          <h2 className="font-medium">Suggestions</h2>
          <p className="whitespace-pre-wrap">{data.suggestions}</p>
        </section>
        <section className="card">
          <h2 className="font-medium">Rubric</h2>
          <ul>
            {data.rubric?.map((r) => (
              <li key={r.name}>
                {r.name}: {r.score} / {r.maxPoints}
              </li>
            ))}
          </ul>
        </section>
        {data.spelling ? (
          <section className="card">
            <h2 className="font-medium">Spelling</h2>
            <ul>
              {data.spelling.map((s, i) => (
                <li key={`${s.token}-${i}`}>
                  <u>{s.token}</u>
                  {s.suggestion ? ` → ${s.suggestion}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
