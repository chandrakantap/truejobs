import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBox from "@/components/SearchBox";
import JobCard from "@/components/JobCard";
import { CATEGORIES, POPULAR_SEARCHES, jobStats, recentJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

const FEATURES = [
  ["🔗", "Direct from the source", "Every listing links to the company's own career page or ATS — no recruiters, no re-posts."],
  ["⏱", "Freshness you can see", "First-seen and last-verified timestamps show how old a job really is."],
  ["🧾", "Transparent signals", "Source, status and history — evidence, not an opaque 'real or fake' score."],
];

export default function Home() {
  const jobs = recentJobs(6);
  const stats = jobStats();
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="hero-bg absolute inset-0 -z-10 opacity-60" />
          <div className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {stats.last24h} new jobs detected in the last 24 hours
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Tech jobs you can <span className="text-brand">actually trust</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
              Fresh engineering roles pulled straight from company career sites and ATS platforms.
              Know where a job came from, how old it is, and apply directly.
            </p>
            <div className="mx-auto mt-10 max-w-3xl">
              <SearchBox big />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted">Popular:</span>
              {POPULAR_SEARCHES.map((s) => (
                <Link
                  key={s}
                  href={`/jobs?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-border bg-surface px-3 py-1 transition hover:border-brand hover:text-brand"
                >
                  {s}
                </Link>
              ))}
            </div>
            <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
              {[
                [stats.total, "Open jobs"],
                [stats.companies, "Companies"],
                [stats.remote, "Remote roles"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dd className="text-3xl font-bold">{n}</dd>
                  <dt className="text-sm text-muted">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent jobs</h2>
              <p className="text-sm text-muted">Freshly detected on company career sites</p>
            </div>
            <Link href="/jobs" className="text-sm font-medium text-brand hover:underline">View all jobs →</Link>
          </div>
          <div className="grid gap-4">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="mb-6 text-2xl font-bold">Browse by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((c) => (
              <Link
                key={c.label}
                href={`/jobs?q=${encodeURIComponent(c.q)}`}
                className="rounded-xl border border-border bg-surface p-4 text-center text-sm font-medium transition hover:border-brand hover:text-brand hover:shadow-sm"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold">Why truejobs.tech</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {FEATURES.map(([icon, title, body]) => (
                <div key={title} className="rounded-2xl border border-border bg-background p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-xl">{icon}</div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
