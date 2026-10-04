import Link from "next/link";
import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";
import JobCard from "@/components/JobCard";
import { recentJobs, searchJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default function Home() {
  const jobs = recentJobs(6);
  const last24h = searchJobs({ days: 1 }).length;
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="bg-zinc-50 py-20 dark:bg-zinc-900">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Know where a job came from before you apply
            </h1>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Software engineering jobs straight from company career sites and
              ATS platforms — fresh, verified, no recruiter spam.
            </p>
            <div className="mt-8">
              <SearchBox big />
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              <strong>{last24h}</strong> new jobs detected in the last 24 hours
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">Recent jobs</h2>
            <Link href="/jobs" className="text-sm text-emerald-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
