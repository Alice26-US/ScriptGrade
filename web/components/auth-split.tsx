"use client";

import { useEffect, useState } from "react";
import { Crest } from "@/components/crest";
import { api } from "@/lib/api";

type Campus = { id: string; name: string };

export function AuthSplit({
  variant,
  kicker,
  headline,
  blurb,
  children,
}: {
  variant: "student" | "lecturer" | "admin";
  kicker: string;
  headline: string;
  blurb: string;
  children: React.ReactNode;
}) {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  useEffect(() => {
    api<Campus[]>("/api/catalog/campuses")
      .then(setCampuses)
      .catch(() => undefined);
  }, []);

  const isFaculty = variant === "lecturer";
  const identity = (
    <aside
      className={`relative flex flex-col justify-between overflow-hidden px-8 py-10 text-[#efe9da] md:w-[42%] md:px-14 md:py-16 ${
        isFaculty
          ? "bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.04),transparent_40%),linear-gradient(200deg,var(--crimson-900),var(--crimson-700))] md:order-2"
          : "bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.04),transparent_40%),linear-gradient(165deg,var(--navy-900),var(--navy-700))]"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 48px)",
        }}
      />
      <div className={`relative z-10 flex items-center gap-4 ${isFaculty ? "md:flex-row-reverse md:text-right" : ""}`}>
        <Crest />
        <div>
          <p className="font-display text-[17px] font-semibold leading-tight">Saint Louis Institute</p>
          <p className={`mt-0.5 text-xs ${isFaculty ? "text-[#d9b9ac]" : "text-[#b9ae95]"}`}>
            {isFaculty ? "Faculty & Lecturer Portal" : variant === "admin" ? "Administrator" : "Cameroon · higher studies"}
          </p>
        </div>
      </div>
      <div className={`relative z-10 mt-10 ${isFaculty ? "md:text-right" : ""}`}>
        <p className="mb-4 text-[13px] font-medium text-[var(--gold)]">{kicker}</p>
        <h1
          className={`font-display text-[30px] font-medium leading-[1.18] text-[#f7f3e9] md:text-[40px] ${
            isFaculty ? "md:ml-auto md:max-w-[11ch]" : "max-w-[10ch]"
          }`}
        >
          {headline}
        </h1>
        <p
          className={`mt-5 max-w-[36ch] text-[15px] leading-relaxed ${
            isFaculty ? "text-[#e3c6be] md:ml-auto" : "text-[#c7bfa9]"
          }`}
        >
          {blurb}
        </p>
      </div>
      <div className="relative z-10 mt-10 hidden md:block">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-px flex-1 bg-[rgb(185_138_46/0.35)]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
          <div className="h-px flex-1 bg-[rgb(185_138_46/0.35)]" />
        </div>
        {isFaculty ? (
          <div className="flex justify-between gap-4">
            <div className="flex-1 text-right">
              <div className="font-display text-[26px] font-medium">{campuses.length || "—"}</div>
              <div className="mt-1 text-xs text-[#d9b9ac]">Campuses</div>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs text-[#8e8770]">Campuses on this network</p>
            {campuses.length === 0 ? (
              <p className="text-sm text-[#d6ceb7]">Loading campuses…</p>
            ) : (
              campuses.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between border-t border-white/10 py-2.5 text-[13.5px] text-[#d6ceb7]"
                >
                  <span>{c.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {!isFaculty ? identity : null}
      <main className="flex flex-1 items-center justify-center px-6 py-10 md:px-12">{children}</main>
      {isFaculty ? identity : null}
    </div>
  );
}
