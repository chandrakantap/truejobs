import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ApplyButton from "@/components/ApplyButton";
import { getJob, timeAgo } from "@/lib/jobs";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const job = getJob((await params).id);
  return { title: job ? `${job.title} at ${job.company} · truejobs.tech` : "Job not found" };
}

export default async function JobPage({ params }: Props) {
  const job = getJob((await params).id);
  if (!job) notFound();
  const signals: [string, string][] = [
    ["Source", `${job.company} careers (${job.ats})`],
    ["First detected", timeAgo(job.firstSeen)],
    ["Last verified", timeAgo(job.lastVerified)],
    ["Status", "Active"],
    ["Seniority", job.seniority],
  ];
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link href="/jobs" className="text-sm text-zinc-500 hover:text-foreground">
          ← Back to jobs
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {job.company} · {job.location}
              {job.salary ? ` · ${job.salary}` : ""}
            </p>
          </div>
          <ApplyButton url={job.applyUrl} ats={job.ats} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {job.tags.map((t) => (
            <span key={t} className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-800">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_16rem]">
          <div>
            <h2 className="text-lg font-semibold">About the role</h2>
            <p className="mt-2 leading-relaxed">{job.description}</p>
            <h2 className="mt-6 text-lg font-semibold">Requirements</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {job.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div className="mt-8">
              <ApplyButton url={job.applyUrl} ats={job.ats} />
            </div>
          </div>
          <aside className="h-fit rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <h2 className="mb-3 font-semibold">Job signals</h2>
            <dl className="space-y-2">
              {signals.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <a href={job.careersUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-emerald-600 hover:underline">
              Company careers site ↗
            </a>
          </aside>
        </div>
      </main>
    </>
  );
}
