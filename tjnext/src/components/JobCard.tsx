import Link from "next/link";
import { timeAgo, type Job } from "@/lib/jobs";
import ApplyButton from "./ApplyButton";

export default function JobCard({ job }: { job: Job }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
      <div className="min-w-0">
        <Link href={`/jobs/${job.id}`} className="text-lg font-semibold hover:text-emerald-600">
          {job.title}
        </Link>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {job.company} · {job.location}
          {job.salary ? ` · ${job.salary}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {job.tags.map((t) => (
            <span key={t} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs dark:bg-zinc-800">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          First seen {timeAgo(job.firstSeen)} · via {job.ats}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/jobs/${job.id}`}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium dark:border-zinc-700"
        >
          Details
        </Link>
        <ApplyButton url={job.applyUrl} ats={job.ats} />
      </div>
    </article>
  );
}
