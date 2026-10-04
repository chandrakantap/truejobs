import Link from "next/link";
import type { SearchParams } from "@/lib/jobs";

const SENIORITY = ["Junior", "Mid", "Senior", "Staff", "Manager"];
const DATES = [
  [1, "Last 24 hours"],
  [3, "Last 3 days"],
  [7, "Last 7 days"],
  [30, "Last 30 days"],
] as const;

export default function FilterSidebar({ params }: { params: SearchParams }) {
  const group = "border-t border-border pt-4";
  const label = "flex cursor-pointer items-center gap-2 py-1 text-sm";
  return (
    <form action="/jobs" className="rounded-2xl border border-border bg-surface p-5">
      {params.q && <input type="hidden" name="q" value={params.q} />}
      {params.location && <input type="hidden" name="location" value={params.location} />}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        <Link href="/jobs" className="text-xs text-brand hover:underline">Reset</Link>
      </div>
      <label className={`${label} mb-4`}>
        <input type="checkbox" name="remote" value="true" defaultChecked={params.remote} className="accent-[var(--brand)]" />
        Remote only
      </label>
      <fieldset className={group}>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Seniority</legend>
        {SENIORITY.map((s) => (
          <label key={s} className={label}>
            <input type="radio" name="seniority" value={s} defaultChecked={params.seniority?.toLowerCase() === s.toLowerCase()} className="accent-[var(--brand)]" />
            {s}
          </label>
        ))}
      </fieldset>
      <fieldset className={`${group} mt-4`}>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Date posted</legend>
        {DATES.map(([d, l]) => (
          <label key={d} className={label}>
            <input type="radio" name="days" value={d} defaultChecked={params.days === d} className="accent-[var(--brand)]" />
            {l}
          </label>
        ))}
      </fieldset>
      <button className="mt-5 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover dark:text-slate-900">
        Apply filters
      </button>
    </form>
  );
}
