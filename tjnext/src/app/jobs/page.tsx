import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBox from "@/components/SearchBox";
import JobCard from "@/components/JobCard";
import FilterSidebar from "@/components/FilterSidebar";
import { parseSearchParams, searchJobs } from "@/lib/jobs";

export const metadata = { title: "Search jobs · truejobs.tech" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseSearchParams(await searchParams);
  const jobs = searchJobs(params);
  const title = params.q ? `${params.q} jobs` : "All tech jobs";
  return (
    <>
      <Header />
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <SearchBox defaults={params} />
        </div>
      </div>
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <FilterSidebar params={params} />
        </aside>
        <section>
          <div className="mb-5">
            <h1 className="text-2xl font-bold capitalize">{title}</h1>
            <p className="text-sm text-muted">
              {jobs.length} {jobs.length === 1 ? "result" : "results"}
              {params.location ? ` in ${params.location}` : ""} · newest first
            </p>
          </div>
          <div className="grid gap-4">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
            {jobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
                <p className="font-semibold">No jobs match your search</p>
                <p className="mt-1 text-sm text-muted">Try fewer keywords or remove some filters.</p>
                <Link href="/jobs" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
                  Clear all filters
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
