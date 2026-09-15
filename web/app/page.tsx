import Link from "next/link";
import { Crest } from "@/components/crest";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--parchment)]">
      <header className="topbar">
        <div className="flex items-center gap-3">
          <Crest size={34} />
          <span>
            <span className="block font-display text-[15px] font-semibold text-[#efe9da]">
              Saint Louis Institute
            </span>
            <span className="block text-[11px] text-[#9aa6b5]">Cameroon</span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 py-16">
        <p className="text-center text-[13px] font-medium text-[var(--gold)]">ScriptGrade</p>
        <h1 className="mt-3 text-center font-display text-3xl font-medium text-[var(--navy-900)] sm:text-4xl">
          Choose your portal
        </h1>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <section className="card portal-card">
            <p className="text-[13px] font-semibold text-[var(--crimson-700)]">Student sign in</p>
            <h2 className="mt-3 font-display text-2xl font-medium text-[var(--navy-900)]">
              Student Portal
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Matriculation number and password</p>
            <div className="actions">
              <Link className="btn" href="/student/login">
                Login
              </Link>
              <Link className="btn btn-secondary" href="/student/register">
                Register
              </Link>
            </div>
          </section>
          <section className="card portal-card">
            <p className="text-[13px] font-semibold text-[var(--navy-700)]">Faculty sign in</p>
            <h2 className="mt-3 font-display text-2xl font-medium text-[var(--crimson-900)]">
              Lecturer Portal
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">University email and password</p>
            <div className="actions">
              <Link className="btn btn-crimson" href="/lecturer/login">
                Login
              </Link>
              <Link className="btn btn-secondary" href="/lecturer/register">
                Register
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="px-5 py-5 text-center text-xs text-[var(--muted)]">
        <Link href="/admin/login" className="hover:text-[var(--ink)]">
          Admin
        </Link>
      </footer>
    </div>
  );
}
