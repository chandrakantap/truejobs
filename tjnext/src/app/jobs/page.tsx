import Link from "next/link";
import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import JobCard from "@/components/JobCard";
import { parseSearchParams, searchJobs } from "@/lib/jobs";

export const metadata = { title: "Search jobs · truejobs.tech" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseSearchParams(await searchParams);
  const jobs = searchJobs(params);
  const filters = [
    params.remote && "Remote",
    params.seniority,
    params.days && `Last ${params.days} day${params.days > 1 ? "s" : ""}`,
  ].filter(Boolean);
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <SearchBox defaults={params} />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} found
          </h1>
          {filters.map((f) => (
            <span key={String(f)} className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs text-emerald-800">
              {f}
            </span>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-4">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
          {jobs.length === 0 && (
            <p className="text-zinc-500">
              No jobs match your search.{" "}
              <Link href="/jobs" className="text-emerald-600 underline">
                Clear filters
              </Link>
            </p>
          )}
        </div>
      </main>
    </>
  );
}
