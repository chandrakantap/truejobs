import type { SearchParams } from "@/lib/jobs";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
const PinIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
);

export default function SearchBox({ defaults = {}, big = false }: { defaults?: SearchParams; big?: boolean }) {
  const field = `flex flex-1 items-center gap-3 px-4 text-muted focus-within:text-brand ${big ? "py-4" : "py-3"}`;
  const input = "w-full bg-transparent text-foreground outline-none placeholder:text-muted";
  return (
    <form
      action="/jobs"
      className="flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-indigo-500/5 sm:flex-row sm:items-center sm:p-1.5"
    >
      <label className={field}>
        <SearchIcon />
        <input name="q" defaultValue={defaults.q} placeholder="Job title, skill or company" className={input} />
      </label>
      <div className="hidden h-8 w-px bg-border sm:block" />
      <label className={`${field} border-t border-border sm:border-0 sm:max-w-64`}>
        <PinIcon />
        <input name="location" defaultValue={defaults.location} placeholder="City, country or remote" className={input} />
      </label>
      <button
        type="submit"
        className={`bg-brand font-semibold text-white transition hover:bg-brand-hover dark:text-slate-900 sm:rounded-xl ${big ? "px-8 py-4" : "px-6 py-3"}`}
      >
        Search jobs
      </button>
    </form>
  );
}
