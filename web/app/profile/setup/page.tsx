"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { api, apiForm } from "@/lib/api";
import { homePath } from "@/lib/portal";

type Faculty = {
  id: string;
  name: string;
  departments: { id: string; name: string }[];
};

type Campus = { id: string; name: string };

type Me = {
  role: "STUDENT" | "LECTURER" | "ADMIN";
  fullName?: string;
  matricule?: string;
  universityEmail?: string;
  email?: string;
  campusId?: string | null;
  facultyId?: string | null;
  departmentId?: string | null;
  programme?: string | null;
  level?: string | null;
  academicYear?: string | null;
  profileComplete?: boolean;
};

export default function ProfileSetupPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [fullName, setFullName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programme, setProgramme] = useState("");
  const [level, setLevel] = useState("");
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Me>("/api/auth/me"),
      api<Faculty[]>("/api/catalog/faculties"),
      api<Campus[]>("/api/catalog/campuses"),
    ])
      .then(([user, list, campusList]) => {
        setMe(user);
        setFaculties(list);
        setCampuses(campusList);
        if (user.profileComplete) window.location.href = homePath(user.role);
        if (user.role === "LECTURER") {
          setFullName(user.fullName ?? "");
          setCampusId(user.campusId ?? "");
          setFacultyId(user.facultyId ?? "");
          setDepartmentId(user.departmentId ?? "");
        }
      })
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  const departments = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/complete-profile", {
        method: "POST",
        body: JSON.stringify({
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
          // Photo is optional.
        }
      }
      window.location.href = homePath(me?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--navy)]">
        Complete your profile
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        Asked only once. After you save, you will go to the dashboard and will not see this
        form again.
      </p>
      <form onSubmit={onSubmit} className="card mt-6 max-w-lg space-y-4">
        {me?.role === "STUDENT" ? (
          <>
            <label className="field">
              Matricule
              <input value={me.matricule ?? ""} readOnly className="bg-[#f7f3eb]" />
            </label>
            {me.universityEmail ? (
              <label className="field">
                University email
                <input value={me.universityEmail} readOnly className="bg-[#f7f3eb]" />
              </label>
            ) : null}
          </>
        ) : (
          <label className="field">
            University email
            <input value={me?.universityEmail ?? me?.email ?? ""} readOnly className="bg-[#f7f3eb]" />
          </label>
        )}
        <label className="field">
          Campus
          <select value={campusId} required onChange={(e) => setCampusId(e.target.value)}>
            <option value="">Select campus</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Full name
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder={me?.role === "LECTURER" ? "Dr. John Doe" : "Alice Ndankam"}
          />
        </label>
        <label className="field">
          Faculty
          <select
            value={facultyId}
            required
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
          Department / sub-field
          <select
            value={departmentId}
            required
            disabled={!facultyId}
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
        {me?.role === "STUDENT" ? (
          <>
            <label className="field">
              Programme
              <input value={programme} onChange={(e) => setProgramme(e.target.value)} required />
            </label>
            <label className="field">
              Level
              <input value={level} onChange={(e) => setLevel(e.target.value)} required />
            </label>
            <label className="field">
              Academic year
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                required
              />
            </label>
          </>
        ) : null}
        <label className="field">
          Profile photo (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        {error ? <p className="text-sm text-[var(--accent)]">{error}</p> : null}
        <button className="btn" type="submit" disabled={busy}>
          Save and continue
        </button>
      </form>
    </Shell>
  );
}
