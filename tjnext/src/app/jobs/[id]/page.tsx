import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApplyButton from "@/components/ApplyButton";
import Badge from "@/components/Badge";
import CompanyLogo from "@/components/CompanyLogo";
import JobCard from "@/components/JobCard";
import { getJob, similarJobs, timeAgo } from "@/lib/jobs";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const job = getJob((await params).id);
  return { title: job ? `${job.title} at ${job.company} · truejobs.tech` : "Job not found" };
}

export default async function JobPage({ params }: Props) {
  const job = getJob((await params).id);
  if (!job) notFound();
  const timeline = [
    ["Last verified", timeAgo(job.lastVerified), "Still listed on the source"],
    ["First detected", timeAgo(job.firstSeen), "Discovered on the company's ATS"],
  ];
  const facts: [string, string][] = [
    ["Location", job.location],
    ["Job type", job.type],
    ["Seniority", job.seniority],
    ["Salary", job.salary ?? "Not disclosed"],
  ];
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28 lg:pb-8">
        <nav className="mb-5 text-sm text-muted">
          <Link href="/" className="hover:text-brand">Home</Link> /{" "}
          <Link href="/jobs" className="hover:text-brand">Jobs</Link> /{" "}
          <span className="text-foreground">{job.title}</span>
        </nav>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <CompanyLogo name={job.company} size={64} />
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">{job.title}</h1>
                <p className="mt-1 text-muted">
                  <span className="font-medium text-foreground">{job.company}</span> · {job.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.remote && <Badge tone="brand">Remote</Badge>}
                  <Badge>{job.type}</Badge>
                  <Badge>{job.seniority}</Badge>
                  {job.salary && <Badge tone="green">{job.salary}</Badge>}
                </div>
              </div>
            </div>
            <div className="hidden w-48 lg:block">
              <ApplyButton url={job.applyUrl} ats={job.ats} full />
              <p className="mt-2 text-center text-xs text-muted">Opens on {job.ats}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">About the role</h2>
              <p className="mt-3 leading-relaxed text-muted">{job.description}</p>
              <h2 className="mt-8 text-lg font-semibold">What you&apos;ll need</h2>
              <ul className="mt-3 space-y-2">
                {job.requirements.map((r) => (
                  <li key={r} className="flex gap-3 text-muted">
                    <span className="mt-0.5 text-brand">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
              <h2 className="mt-8 text-lg font-semibold">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.tags.map((t) => (
                  <Link key={t} href={`/jobs?q=${encodeURIComponent(t)}`}>
                    <Badge tone="brand">{t}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold">Job overview</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-semibold">Job signals</h2>
              <p className="mt-1 text-xs text-muted">Evidence about where this job came from</p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Badge tone="green">✓ Direct source</Badge>
                  <span className="text-muted">{job.ats}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge tone="green">● Active</Badge>
                  <span className="text-muted">No repost detected</span>
                </li>
              </ul>
              <ol className="mt-4 space-y-4 border-l border-border pl-4">
                {timeline.map(([t, when, note]) => (
                  <li key={t} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                    <p className="text-sm font-medium">{t} · {when}</p>
                    <p className="text-xs text-muted">{note}</p>
                  </li>
                ))}
              </ol>
              <a href={job.careersUrl} target="_blank" rel="noopener noreferrer" className="mt-5 block text-sm font-medium text-brand hover:underline">
                Visit {job.company} careers ↗
              </a>
            </section>
          </aside>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Similar jobs</h2>
          <div className="grid gap-4">
            {similarJobs(job).map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 p-3 backdrop-blur lg:hidden">
        <ApplyButton url={job.applyUrl} ats={job.ats} full />
      </div>
      <Footer />
    </>
  );
}
