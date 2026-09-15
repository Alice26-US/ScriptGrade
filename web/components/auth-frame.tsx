"use client";

import { AuthSplit } from "@/components/auth-split";

type Portal = "student" | "lecturer" | "admin";

const copy: Record<
  Portal,
  { kicker: string; headline: string; blurb: string; variant: "student" | "lecturer" | "admin" }
> = {
  student: {
    variant: "student",
    kicker: "Student Portal",
    headline: "Your essays, submitted on time, every time.",
    blurb: "Create your account with your university matricule, then submit scanned handwritten work.",
  },
  lecturer: {
    variant: "lecturer",
    kicker: "For lecturers",
    headline: "Set the brief. Set the date. Let the portal do the chasing.",
    blurb: "Register with your university email to create exercises and mark scanned essays.",
  },
  admin: {
    variant: "admin",
    kicker: "Administrator",
    headline: "University records and class setup.",
    blurb: "Sign in to manage lecturers, students, and class offerings.",
  },
};

export function AuthFrame({
  portal,
  title,
  children,
}: {
  portal: Portal;
  title: string;
  children: React.ReactNode;
}) {
  const meta = copy[portal];
  return (
    <AuthSplit variant={meta.variant} kicker={meta.kicker} headline={meta.headline} blurb={meta.blurb}>
      <div className="w-full max-w-[440px]">
        <div
          className={`mb-3.5 inline-flex items-center gap-2 text-[13px] font-semibold ${
            portal === "lecturer" ? "text-[var(--navy-700)]" : "text-[var(--crimson-700)]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              portal === "lecturer" ? "bg-[var(--navy-700)]" : "bg-[var(--crimson-700)]"
            }`}
          />
          {title}
        </div>
        {children}
      </div>
    </AuthSplit>
  );
}
