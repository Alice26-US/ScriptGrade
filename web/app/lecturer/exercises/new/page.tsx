"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";

type Offering = {
  id: string;
  label: string;
  offeringKey: string;
  course?: { code: string; title: string } | null;
};

export default function NewExercisePage() {
  const copy = t();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<Offering[]>("/api/offerings")
      .then((rows) => setOfferings(Array.isArray(rows) ? rows : []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const offeringId = String(fd.get("offeringId") ?? "");
    if (!offeringId) {
      setError("Select a class offering.");
      return;
    }
    const maxScore = 20;
    const body = {
      offeringId,
      title: String(fd.get("title")),
      prompt: String(fd.get("prompt")),
      language: String(fd.get("language")),
      maxScore,
      minWords: Number(fd.get("minWords") || 0),
      maxPages: Number(fd.get("maxPages") || 10),
      minPages: 1,
      opensAt: new Date(String(fd.get("opensAt"))).toISOString(),
      closesAt: new Date(String(fd.get("closesAt"))).toISOString(),
      graceSeconds: Number(fd.get("graceSeconds") || 1800),
      criteria: [
        { name: "Content / understanding", maxPoints: 8, kind: "NORMAL", sortOrder: 1 },
        { name: "Structure", maxPoints: 5, kind: "NORMAL", sortOrder: 2 },
        { name: "Evidence / research", maxPoints: 4, kind: "NORMAL", sortOrder: 3 },
        {
          name: "Spelling / language",
          maxPoints: 3,
          kind: "SPELLING",
          sortOrder: 4,
          spellingDeduction: 0.25,
          spellingFloor: 0,
        },
      ],
      bands: [
        { minScore: 0, maxScore: 10, labelEn: "F", labelFr: "Insuffisant" },
        { minScore: 10, maxScore: 12, labelEn: "D", labelFr: "Passable" },
        { minScore: 12, maxScore: 14, labelEn: "C", labelFr: "Assez bien" },
        { minScore: 14, maxScore: 16, labelEn: "B", labelFr: "Bien" },
        { minScore: 16, maxScore: 20, labelEn: "A", labelFr: "Très bien" },
      ],
    };
    try {
      const created = await api<{ id: string }>("/api/exercises", {
        method: "POST",
        body: JSON.stringify(body),
      });
      window.location.href = `/lecturer/exercises/${created.id}/mark`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    }
  }

  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const local = (d: Date) => d.toISOString().slice(0, 16);

  function offeringLabel(o: Offering) {
    if (o.label) return o.label;
    const code = o.course?.code;
    const title = o.course?.title;
    return [o.offeringKey, code, title].filter(Boolean).join(" — ") || "Class offering";
  }

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-semibold">{copy.newExercise}</h1>
      <form onSubmit={onSubmit} className="card max-w-2xl space-y-3">
        <label className="field">
          Offering
          <select name="offeringId" required disabled={!loaded || offerings.length === 0}>
            <option value="">
              {loaded && offerings.length === 0 ? "No classes available" : "Select a class"}
            </option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {offeringLabel(o)}
              </option>
            ))}
          </select>
        </label>
        {loaded && offerings.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            There is no class offering for your campus and faculty yet. An administrator
            must create the course offering (University data) or assign you to a class.
          </p>
        ) : null}
        <label className="field">
          Title
          <input name="title" required />
        </label>
        <label className="field">
          Prompt (topic)
          <textarea name="prompt" rows={5} required />
        </label>
        <label className="field">
          Language
          <select name="language">
            <option value="EN">English</option>
            <option value="FR">French</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Opens
            <input type="datetime-local" name="opensAt" defaultValue={local(now)} required />
          </label>
          <label className="field">
            Closes
            <input type="datetime-local" name="closesAt" defaultValue={local(later)} required />
          </label>
          <label className="field">
            Min words
            <input type="number" name="minWords" defaultValue={0} min={0} />
          </label>
          <label className="field">
            Max pages (≤10)
            <input type="number" name="maxPages" defaultValue={10} min={1} max={10} />
          </label>
          <label className="field">
            Grace seconds (0–3600)
            <input type="number" name="graceSeconds" defaultValue={1800} min={0} max={3600} />
          </label>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Default /20 analytic rubric: Content 8, Structure 5, Evidence 4, Spelling 3
          (−0.25 per undismissed error). Frozen on publish.
        </p>
        {error ? <p className="text-[var(--accent)]">{error}</p> : null}
        <button className="btn" type="submit" disabled={!loaded || offerings.length === 0}>
          Save draft
        </button>
      </form>
    </Shell>
  );
}
