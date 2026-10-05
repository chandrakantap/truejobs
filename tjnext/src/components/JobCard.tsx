import Link from "next/link";
import { isNewJob, timeAgo, type Job } from "@/lib/jobs";
import ApplyButton from "./ApplyButton";
import Badge from "./Badge";
import CompanyLogo from "./CompanyLogo";

export default function JobCard({ job }: { job: Job }) {
  const isNew = isNewJob(job.firstSeen);
  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-brand/50 hover:shadow-md sm:flex-row sm:items-center">
      <CompanyLogo name={job.company} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/jobs/${job.id}`} className="text-base font-semibold group-hover:text-brand">
            {job.title}
          </Link>
          {isNew && <Badge tone="green">● New</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          <span className="font-medium text-foreground">{job.company}</span> · {job.location}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {job.remote && <Badge tone="brand">Remote</Badge>}
          <Badge>{job.type}</Badge>
          <Badge>{job.seniority}</Badge>
          {job.salary && <Badge tone="green">{job.salary}</Badge>}
          {job.tags.slice(0, 3).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Posted {timeAgo(job.firstSeen)} · Verified {timeAgo(job.lastVerified)} · via {job.ats}
        </p>
      </div>
      <div className="flex shrink-0 gap-2 sm:flex-col">
        <ApplyButton url={job.applyUrl} ats={job.ats} />
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-brand-soft hover:text-brand"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
