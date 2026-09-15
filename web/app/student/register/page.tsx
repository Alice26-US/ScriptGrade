"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { api, apiForm } from "@/lib/api";
import { homePath } from "@/lib/portal";

type Faculty = {
  id: string;
  name: string;
  departments: { id: string; name: string }[];
};
type Campus = { id: string; code: string; name: string };

export default function StudentRegisterPage() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [fullName, setFullName] = useState("");
  const [matricule, setMatricule] = useState("");
  const [universityEmail, setUniversityEmail] = useState("");
  const [campusId, setCampusId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programme, setProgramme] = useState("");
  const [level, setLevel] = useState("");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Faculty[]>("/api/catalog/faculties"),
      api<Campus[]>("/api/catalog/campuses"),
    ])
      .then(([f, c]) => {
        setFaculties(f);
        setCampuses(c);
      })
      .catch(() => undefined);
  }, []);

  const departments = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<{ maskedEmail?: string; otp?: string }>("/api/auth/register/start", {
        method: "POST",
        body: JSON.stringify({ matricule, universityEmail }),
      });
      setInfo(
        res.otp
          ? `Activation code: ${res.otp}`
          : `A code was sent to ${res.maskedEmail}.`,
      );
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start registration");
    } finally {
      setBusy(false);
    }
  }

  async function complete(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/register/verify", {
        method: "POST",
        body: JSON.stringify({
          matricule,
          otp,
          universityEmail,
          password,
          fullName,
          campusId,
          facultyId,
          departmentId,
          programme,
          level,
          academicYear,
        }),
      });
      if (photo) {
        try {
          await apiForm("/api/auth/photo", photo);
        } catch {
          // optional
        }
      }
      window.location.href = homePath("STUDENT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame portal="student" title="Student registration">
      <form onSubmit={step === "form" ? sendCode : complete} className="space-y-4">
        <label className="field">
          Full name
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={step === "otp"}
          />
        </label>
        <label className="field">
          Matricule
          <input
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            required
            disabled={step === "otp"}
            placeholder="SWE/24/0016"
          />
        </label>
        <label className="field">
          University email
          <input
            type="email"
            value={universityEmail}
            onChange={(e) => setUniversityEmail(e.target.value)}
            required
            readOnly={step === "otp"}
            className={step === "otp" ? "bg-[#f7f3eb]" : undefined}
          />
        </label>
        <label className="field">
          Campus
          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            required
            disabled={step === "otp"}
          >
            <option value="">Select campus</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Faculty
          <select
            value={facultyId}
            required
            disabled={step === "otp"}
            onChange={(e) => {
              setFacultyId(e.target.value);
              setDepartmentId("");
            }}
          >
            <option value="">Select faculty</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Department
          <select
            value={departmentId}
            required
            disabled={step === "otp" || !facultyId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Programme
          <input
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            required
            disabled={step === "otp"}
          />
        </label>
        <label className="field">
          Level
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            required
            disabled={step === "otp"}
          />
        </label>
        <label className="field">
          Academic year
          <input
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            required
            disabled={step === "otp"}
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
            disabled={step === "otp"}
          />
        </label>
        <label className="field">
          Profile photo (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={step === "otp"}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        {step === "otp" ? (
          <label className="field">
            Activation code
            <input value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </label>
        ) : null}
        {info ? <p className="text-sm text-[var(--ok)]">{info}</p> : null}
        {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
        <button className="btn w-full" type="submit" disabled={busy}>
          {step === "form" ? "Continue" : "Create account"}
        </button>
        <p className="text-sm text-[var(--muted)]">
          Already registered? <Link href="/student/login">Login</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
