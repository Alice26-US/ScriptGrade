"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { api, apiForm } from "@/lib/api";

type Faculty = {
  id: string;
  name: string;
  departments: { id: string; name: string }[];
};

type Campus = { id: string; name: string };

type Profile = {
  role: "STUDENT" | "LECTURER" | "ADMIN";
  fullName?: string;
  matricule?: string;
  universityEmail?: string;
  email?: string;
  campus?: string | null;
  faculty?: string | null;
  department?: string | null;
  programme?: string | null;
  level?: string | null;
  academicYear?: string | null;
  campusId?: string | null;
  facultyId?: string | null;
  departmentId?: string | null;
  photoUrl?: string | null;
  canEdit?: { password: boolean; photo: boolean; details?: boolean };
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--line)] py-3 sm:flex-row sm:justify-between">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [fullName, setFullName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programme, setProgramme] = useState("");
  const [level, setLevel] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const departments = useMemo(
    () => faculties.find((f) => f.id === facultyId)?.departments ?? [],
    [faculties, facultyId],
  );

  function applyProfile(me: Profile) {
    setProfile(me);
    setFullName(me.fullName ?? "");
    setCampusId(me.campusId ?? "");
    setFacultyId(me.facultyId ?? "");
    setDepartmentId(me.departmentId ?? "");
    setProgramme(me.programme ?? "");
    setLevel(me.level ?? "");
    setAcademicYear(me.academicYear ?? "");
  }

  async function load() {
    const me = await api<Profile>("/api/auth/me");
    applyProfile(me);
  }

  useEffect(() => {
    Promise.all([
      api<Profile>("/api/auth/me"),
      api<Faculty[]>("/api/catalog/faculties"),
      api<Campus[]>("/api/catalog/campuses"),
    ])
      .then(([me, list, campusList]) => {
        applyProfile(me);
        setFaculties(list);
        setCampuses(campusList);
      })
      .catch((e: Error) => {
        setError(e.message);
        window.location.href = "/";
      });
  }, []);

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const me = await api<Profile>("/api/auth/complete-profile", {
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
      applyProfile(me);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: String(fd.get("currentPassword")),
          newPassword: String(fd.get("newPassword")),
        }),
      });
      setMessage("Password updated.");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  async function changePhoto(file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiForm("/api/auth/photo", file);
      await load();
      setMessage("Photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <Shell>
        <p>{error || "Loading…"}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--navy)]">
        My profile
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {profile.role === "STUDENT"
          ? "Matricule cannot be changed. You can update your other details, password and photo."
          : profile.role === "LECTURER"
            ? "University email cannot be changed. You can update your name, faculty, department, password and photo."
            : "Administrator account."}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="card text-center">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt=""
              className="mx-auto h-36 w-36 rounded-full object-cover"
            />
          ) : (
            <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-[#efe7d8] text-2xl font-semibold text-[var(--navy)]">
              {(profile.fullName ?? "?").slice(0, 1)}
            </div>
          )}
          {profile.canEdit?.photo ? (
            <label className="btn btn-secondary mt-4 cursor-pointer text-sm">
              Change photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void changePhoto(file);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>

        <dl className="card">
          <Row label="Full name" value={profile.fullName} />
          {profile.role === "STUDENT" ? (
            <>
              <Row label="Matricule" value={profile.matricule} />
              <Row label="University email" value={profile.universityEmail} />
              <Row label="Campus" value={profile.campus} />
              <Row label="Faculty" value={profile.faculty} />
              <Row label="Department" value={profile.department} />
              <Row label="Programme" value={profile.programme} />
              <Row label="Level" value={profile.level} />
              <Row label="Academic year" value={profile.academicYear} />
            </>
          ) : null}
          {profile.role === "LECTURER" ? (
            <>
              <Row label="University email" value={profile.universityEmail ?? profile.email} />
              <Row label="Campus" value={profile.campus} />
              <Row label="Faculty" value={profile.faculty} />
              <Row label="Department" value={profile.department} />
            </>
          ) : null}
          {profile.role === "ADMIN" ? (
            <Row label="Email" value={profile.email} />
          ) : null}
        </dl>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--ok)]">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-[var(--accent)]">{error}</p> : null}

      {profile.canEdit?.details ? (
        <form onSubmit={saveDetails} className="card mt-6 max-w-md space-y-3">
          <h2 className="font-semibold">Update details</h2>
          <label className="field">
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>
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
            Department
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
          {profile.role === "STUDENT" ? (
            <>
              <label className="field">
                Programme
                <input
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  required
                />
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
          <button className="btn" type="submit" disabled={busy}>
            Save details
          </button>
        </form>
      ) : null}

      {profile.canEdit?.password ? (
        <form onSubmit={changePassword} className="card mt-6 max-w-md space-y-3">
          <h2 className="font-semibold">Change password</h2>
          <label className="field">
            Current password
            <input name="currentPassword" type="password" required minLength={8} />
          </label>
          <label className="field">
            New password
            <input name="newPassword" type="password" required minLength={8} />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            Save password
          </button>
        </form>
      ) : null}
    </Shell>
  );
}
