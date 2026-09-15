"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { RoleGate } from "@/components/role-gate";
import type { Me } from "@/components/shell";
import { api } from "@/lib/api";
import {
  SETUP_STEPS,
  downloadCsv,
  type SetupCounts,
  type SetupStep,
} from "@/lib/setup-steps";

type ImportResult = {
  successCount: number;
  errorCount: number;
  errors: { line: number; message: string }[];
};

type Lecturer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  hasPassword: boolean;
  onboardingCompletedAt?: string | null;
};

type StudentRow = {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  universityEmail: string | null;
  onboardingCompletedAt: string | null;
};

type AcademicCatalog = {
  courses: { id: string; code: string; title: string }[];
  terms: { id: string; code: string; name: string }[];
  campuses: { id: string; name: string }[];
  programmes: { id: string; name: string }[];
  lecturers: { id: string; email: string; firstName: string; lastName: string }[];
  offerings: { id: string; label: string }[];
};

export default function AdminPage() {
  const [setup, setSetup] = useState<SetupCounts | null>(null);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [demoLogins, setDemoLogins] = useState<{
    note?: string;
  } | null>(null);
  const [academic, setAcademic] = useState<AcademicCatalog | null>(null);
  const [section, setSection] = useState("dashboard");
  const [me, setMe] = useState<Me | null>(null);

  async function refresh() {
    const [s, l, st, a] = await Promise.all([
      api<SetupCounts>("/api/admin/setup"),
      api<Lecturer[]>("/api/admin/lecturers"),
      api<StudentRow[]>("/api/admin/students"),
      api<AcademicCatalog>("/api/admin/academic"),
    ]);
    setSetup(s);
    setLecturers(l);
    setStudents(st);
    setAcademic(a);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => undefined);
  }, []);

  async function loadDemo() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{
        ok: boolean;
        howToLogin: {
          note?: string;
        };
      }>("/api/admin/setup/demo", { method: "POST" });
      setDemoLogins(res.howToLogin);
      setMessage("Sample university loaded. Use the logins below.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo import failed");
    } finally {
      setBusy(false);
    }
  }

  async function upload(step: SetupStep, file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await api<ImportResult>(`/api/admin/import/${step.kind}`, {
        method: "POST",
        body,
      });
      if (res.errorCount) {
        setError(
          `${step.title}: ${res.successCount} rows saved, ${res.errorCount} failed. ${res.errors[0]?.message ?? ""}`,
        );
      } else {
        setMessage(`${step.title}: ${res.successCount} rows saved.`);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetOnboarding(kind: "students" | "lecturers", id: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/api/admin/${kind}/${id}/reset-onboarding`, { method: "POST" });
      setMessage("Onboarding reset. They will complete their profile on next login.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset onboarding");
    } finally {
      setBusy(false);
    }
  }

  async function setPassword(id: string, password: string) {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/lecturers/${id}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setMessage("Lecturer password saved. They can log in with their email.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set password");
    } finally {
      setBusy(false);
    }
  }

  const doneSteps = setup
    ? SETUP_STEPS.filter((s) => (setup[s.countKey] as number) > 0).length
    : 0;

  return (
    <RoleGate role="ADMIN">
    <AdminShell me={me} section={section} onSection={setSection}>
      {section === "dashboard" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Lecturers", value: setup?.lecturers ?? "—", action: "lecturers", cta: "Manage Lecturers", tone: "red" },
              { label: "Total Students", value: setup?.students ?? "—", action: "students", cta: "Students", tone: "blue" },
              { label: "Active Assignments", value: setup?.offerings ?? "—", action: "assignments", cta: "Edit Assignments", tone: "green" },
              { label: "Courses", value: setup?.courses ?? "—", action: "assignments", cta: "Classes", tone: "red" },
            ].map((card) => (
              <div key={card.label} className="flex items-center justify-between rounded-md border border-[#cfd8e6] bg-white px-4 py-4 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-[#1a4f8b]">{card.label}</p>
                  <p className="font-display text-4xl font-semibold text-[#123a6b]">{card.value}</p>
                </div>
                <button
                  type="button"
                  className={`rounded px-3 py-1.5 text-xs font-semibold text-white ${
                    card.tone === "green" ? "bg-[#3c8c4a]" : card.tone === "blue" ? "bg-[#1a4f8b]" : "bg-[#c0392b]"
                  }`}
                  onClick={() => setSection(card.action)}
                >
                  {card.cta}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-md border border-[#cfd8e6] bg-white">
              <h2 className="bg-[#1a4f8b] px-4 py-2.5 text-sm font-semibold text-white">Lecturer Management</h2>
              <div className="p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <button type="button" className="rounded bg-[#1a4f8b] px-3 py-2 text-xs font-semibold text-white" onClick={() => setSection("lecturers")}>
                    View lecturers
                  </button>
                  <button type="button" className="rounded bg-[#1a4f8b] px-3 py-2 text-xs font-semibold text-white" onClick={() => setSection("assignments")}>
                    Assign courses
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="text-[#1a4f8b]">
                    <tr>
                      <th className="py-2">Name</th>
                      <th>Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lecturers.slice(0, 6).map((lec) => (
                      <tr key={lec.id} className="border-t border-[#edf0f5]">
                        <td className="py-2">{lec.firstName} {lec.lastName}</td>
                        <td>{lec.email}</td>
                        <td>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${lec.hasPassword ? "bg-[#3c8c4a]" : "bg-[#c0392b]"}`}>
                            {lec.hasPassword ? "Active" : "No password"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {lecturers.length === 0 ? (
                      <tr><td colSpan={3} className="py-3 text-[var(--muted)]">No lecturers yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="overflow-hidden rounded-md border border-[#cfd8e6] bg-white">
              <h2 className="bg-[#1a4f8b] px-4 py-2.5 text-sm font-semibold text-white">Student Management</h2>
              <div className="p-4">
                <button type="button" className="mb-3 rounded bg-[#1a4f8b] px-3 py-2 text-xs font-semibold text-white" onClick={() => setSection("students")}>
                  View all students
                </button>
                <table className="w-full text-left text-sm">
                  <thead className="text-[#1a4f8b]">
                    <tr>
                      <th className="py-2">Name</th>
                      <th>ID Number</th>
                      <th>Enrollment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 6).map((s) => (
                      <tr key={s.id} className="border-t border-[#edf0f5]">
                        <td className="py-2">{s.firstName} {s.lastName}</td>
                        <td>{s.matricule}</td>
                        <td>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${s.onboardingCompletedAt ? "bg-[#3c8c4a]" : "bg-[#c0392b]"}`}>
                            {s.onboardingCompletedAt ? "Enrolled" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 ? (
                      <tr><td colSpan={3} className="py-3 text-[var(--muted)]">No students yet.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {section === "import" ? (
      <div className="card mt-2 border-[var(--accent)]/30">
        <h2 className="font-semibold">Easiest path: load the sample university</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          This fills campuses, programmes and a sample class. Students and lecturers
          register themselves — they are not imported.
        </p>
        <button className="btn mt-4" type="button" disabled={busy} onClick={loadDemo}>
          {busy ? "Loading…" : "Load sample university"}
        </button>
        {demoLogins?.note ? (
          <p className="mt-4 text-sm text-[var(--muted)]">{demoLogins.note}</p>
        ) : null}
      </div>
      ) : null}

      {section === "assignments" ? (
      <div className="card mt-2">
        <h2 className="font-semibold">Classes (offerings)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Lecturers pick from these when they create an exercise. Create a course,
          a term, then a class offering on a campus.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {(academic?.offerings ?? []).map((o) => (
            <li key={o.id}>{o.label}</li>
          ))}
          {academic && academic.offerings.length === 0 ? (
            <li className="text-[var(--muted)]">No class offerings yet.</li>
          ) : null}
        </ul>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void (async () => {
              setBusy(true);
              setError("");
              try {
                await api("/api/admin/courses", {
                  method: "POST",
                  body: JSON.stringify({
                    code: String(fd.get("courseCode")),
                    title: String(fd.get("courseTitle")),
                  }),
                });
                setMessage("Course saved.");
                e.currentTarget.reset();
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save course");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="field">
            Course code
            <input name="courseCode" required placeholder="SWE301" />
          </label>
          <label className="field">
            Course title
            <input name="courseTitle" required placeholder="Web Development" />
          </label>
          <button className="btn btn-secondary sm:col-span-2" type="submit" disabled={busy}>
            Save course
          </button>
        </form>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void (async () => {
              setBusy(true);
              setError("");
              try {
                await api("/api/admin/terms", {
                  method: "POST",
                  body: JSON.stringify({
                    code: String(fd.get("termCode")),
                    name: String(fd.get("termName")),
                  }),
                });
                setMessage("Academic term saved.");
                e.currentTarget.reset();
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save term");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="field">
            Term code
            <input name="termCode" required placeholder="2026S1" />
          </label>
          <label className="field">
            Term name
            <input name="termName" required placeholder="2026/2027" />
          </label>
          <button className="btn btn-secondary sm:col-span-2" type="submit" disabled={busy}>
            Save term
          </button>
        </form>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void (async () => {
              setBusy(true);
              setError("");
              try {
                await api("/api/admin/offerings", {
                  method: "POST",
                  body: JSON.stringify({
                    courseId: String(fd.get("courseId")),
                    termId: String(fd.get("termId")),
                    campusId: String(fd.get("campusId")),
                    programmeId: String(fd.get("programmeId")),
                    level: String(fd.get("level")),
                    group: String(fd.get("group") || ""),
                  }),
                });
                setMessage("Class offering saved. Lecturers on that campus and faculty can use it.");
                e.currentTarget.reset();
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save offering");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="field">
            Course
            <select name="courseId" required>
              <option value="">Select course</option>
              {(academic?.courses ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Term
            <select name="termId" required>
              <option value="">Select term</option>
              {(academic?.terms ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Campus
            <select name="campusId" required>
              <option value="">Select campus</option>
              {(academic?.campuses ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Programme
            <select name="programmeId" required>
              <option value="">Select programme</option>
              {(academic?.programmes ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Level
            <input name="level" required placeholder="HND 2" />
          </label>
          <label className="field">
            Group (optional)
            <input name="group" placeholder="A" />
          </label>
          <button className="btn sm:col-span-2" type="submit" disabled={busy}>
            Save class offering
          </button>
        </form>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const offeringId = String(fd.get("offeringId"));
            const lecturerId = String(fd.get("lecturerId"));
            void (async () => {
              setBusy(true);
              setError("");
              try {
                await api(`/api/admin/offerings/${offeringId}/lecturers`, {
                  method: "POST",
                  body: JSON.stringify({ lecturerId }),
                });
                setMessage("Lecturer assigned to the class.");
                e.currentTarget.reset();
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not assign lecturer");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="field">
            Assign offering
            <select name="offeringId" required>
              <option value="">Select class</option>
              {(academic?.offerings ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Lecturer
            <select name="lecturerId" required>
              <option value="">Select lecturer</option>
              {(academic?.lecturers ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName} ({l.email})
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary sm:col-span-2" type="submit" disabled={busy}>
            Assign lecturer
          </button>
        </form>
      </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-[var(--ok)]">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-[var(--accent)]">{error}</p> : null}

      {section === "import" ? (
      <>
      <p className="mt-10 text-sm font-medium text-[var(--navy)]">
        Setup progress: {doneSteps} / {SETUP_STEPS.length} lists
      </p>

      <ol className="mt-4 space-y-4">
        {SETUP_STEPS.map((step) => {
          const count = setup ? (setup[step.countKey] as number) : 0;
          return (
            <li key={step.kind} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="badge">{count > 0 ? `Saved · ${count}` : `Step ${step.n}`}</p>
                  <h3 className="mt-2 font-semibold">
                    {step.n}. {step.title}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
                    {step.inPlainEnglish}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => downloadCsv(`${step.kind}.csv`, step.example)}
                  >
                    Download example CSV
                  </button>
                  <label className="btn cursor-pointer">
                    Upload this list
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(step, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[#f7f3eb] p-3 text-xs text-[var(--navy)]">
                {step.example}
              </pre>
            </li>
          );
        })}
      </ol>
      </>
      ) : null}

      {section === "lecturers" ? (
      <>
      <h2 className="mt-4 text-lg font-semibold text-[var(--navy)]">
        Lecturer passwords
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Lecturers register themselves. You can reset a password here if needed.
      </p>
      <ul className="mt-4 space-y-3">
        {lecturers.map((lec) => (
          <li key={lec.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {lec.firstName} {lec.lastName}
              </p>
              <p className="text-sm text-[var(--muted)]">{lec.email}</p>
            </div>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const password = String(new FormData(e.currentTarget).get("password") ?? "");
                void setPassword(lec.id, password);
              }}
            >
              <input
                name="password"
                type="password"
                minLength={8}
                placeholder={lec.hasPassword ? "Replace password" : "Set password"}
                className="rounded-lg border border-[var(--line)] px-3 py-2"
                required
              />
              <button className="btn btn-navy" type="submit" disabled={busy}>
                Save
              </button>
            </form>
          </li>
        ))}
        {lecturers.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">
            No lecturers yet. They register themselves in the app.
          </li>
        ) : null}
      </ul>
      </>
      ) : null}

      {section === "students" ? (
      <>
      <h2 className="mt-4 text-lg font-semibold text-[var(--navy)]">
        Onboarding status
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Resetting onboarding makes that person complete their profile again on
        the next login. It does not delete the account or change the password.
      </p>
      <ul className="mt-4 space-y-3">
        {students.map((s) => (
          <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {s.matricule} · {s.firstName} {s.lastName}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Student · {s.onboardingCompletedAt ? "Profile completed" : "Not completed"}
              </p>
            </div>
            {s.onboardingCompletedAt ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => void resetOnboarding("students", s.id)}
              >
                Reset onboarding
              </button>
            ) : null}
          </li>
        ))}
        {lecturers.map((lec) => (
          <li key={lec.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {lec.firstName} {lec.lastName}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Lecturer · {lec.email} ·{" "}
                {lec.onboardingCompletedAt ? "Profile completed" : "Not completed"}
              </p>
            </div>
            {lec.onboardingCompletedAt ? (
              <button
                className="btn btn-secondary"
                type="button"
                disabled={busy}
                onClick={() => void resetOnboarding("lecturers", lec.id)}
              >
                Reset onboarding
              </button>
            ) : null}
          </li>
        ))}
        {students.length === 0 && lecturers.length === 0 ? (
          <li className="text-sm text-[var(--muted)]">No people imported yet.</li>
        ) : null}
      </ul>
      </>
      ) : null}
    </AdminShell>
    </RoleGate>
  );
}
