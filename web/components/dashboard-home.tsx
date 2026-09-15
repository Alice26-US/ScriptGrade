"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell, type Me } from "@/components/shell";
import { api } from "@/lib/api";
import type { PortalRole } from "@/lib/portal";
import type { SetupCounts } from "@/lib/setup-steps";

type Exercise = {
  id: string;
  title: string;
  status: string;
  language: string;
  maxScore: string | number;
  offering?: { course?: { code: string; title: string } };
};

export function DashboardHome({ role }: { role: PortalRole }) {
  const [me, setMe] = useState<Me | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [setup, setSetup] = useState<SetupCounts | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(async (user) => {
        setMe(user);
        const list = await api<Exercise[]>("/api/exercises");
        setExercises(list);
        if (user.role === "ADMIN") {
          setSetup(await api<SetupCounts>("/api/admin/setup"));
        }
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const name = me?.fullName ?? me?.firstName ?? me?.matricule ?? me?.email ?? "";
  const ready = setup && setup.offerings > 0 && setup.students > 0 && setup.lecturersReady > 0;

  return (
    <Shell>
      <p className="text-sm text-[var(--muted)]">
        {role === "ADMIN" && "Administrator"}
        {role === "LECTURER" && "Lecturer Portal"}
        {role === "STUDENT" && "Student Portal"}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--navy)]">
        {name ? `Hello, ${name}` : "Dashboard"}
      </h1>
      {error ? <p className="mt-3 text-[var(--accent)]">{error}</p> : null}

      {role === "ADMIN" ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link href="/admin" className="card block hover:border-[var(--accent)]">
            <p className="badge">{ready ? "Ready" : "Do this first"}</p>
            <h2 className="mt-3 font-semibold">University data</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Load campuses, classes and enrolments.
            </p>
            {setup ? (
              <p className="mt-3 text-sm">
                {setup.students} students · {setup.offerings} classes ·{" "}
                {setup.lecturersReady} lecturers with passwords
              </p>
            ) : null}
          </Link>
        </section>
      ) : null}

      {role === "LECTURER" ? (
        <section className="mt-6 flex flex-wrap gap-3">
          <Link className="btn" href="/lecturer/exercises/new">
            Create an exercise
          </Link>
        </section>
      ) : null}

      {role === "STUDENT" ? (
        <p className="mt-4 max-w-2xl text-[var(--muted)]">
          Open an exercise, write on paper, then photograph the pages. You only see
          exercises after the lecturer publishes them for your class.
        </p>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold text-[var(--navy)]">Exercises</h2>
      <ul className="mt-3 space-y-3">
        {exercises.map((ex) => (
          <li key={ex.id} className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">{ex.title}</p>
              <p className="text-sm text-[var(--muted)]">
                {ex.offering?.course?.code} · {ex.status} · {ex.language} · /{ex.maxScore}
              </p>
            </div>
            {role === "STUDENT" ? (
              <Link className="btn btn-secondary" href={`/student/exercises/${ex.id}`}>
                Open
              </Link>
            ) : (
              <Link className="btn btn-secondary" href={`/lecturer/exercises/${ex.id}/mark`}>
                Open marking
              </Link>
            )}
          </li>
        ))}
        {exercises.length === 0 ? (
          <li className="card text-sm text-[var(--muted)]">
            {role === "ADMIN"
              ? "No exercises yet."
              : role === "LECTURER"
                ? "You have no exercises yet. Create one for a class you teach."
                : "No published exercises for your campus, programme and level yet."}
          </li>
        ) : null}
      </ul>
    </Shell>
  );
}
