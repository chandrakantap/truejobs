import type { SearchParams } from "@/lib/jobs";

export default function SearchBox({
  defaults = {},
  big = false,
}: {
  defaults?: SearchParams;
  big?: boolean;
}) {
  const input = `w-full rounded-lg border border-zinc-300 bg-background px-4 ${
    big ? "py-4 text-lg" : "py-2.5"
  } outline-none focus:border-emerald-600 dark:border-zinc-700`;
  return (
    <form action="/jobs" className="flex w-full flex-col gap-3 sm:flex-row">
      <input
        name="q"
        defaultValue={defaults.q}
        placeholder="Job title, skill or company"
        className={input}
        aria-label="Search jobs"
      />
      <input
        name="location"
        defaultValue={defaults.location}
        placeholder="Location"
        className={`${input} sm:max-w-56`}
        aria-label="Location"
      />
      <button
        type="submit"
        className={`rounded-lg bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-700 ${
          big ? "py-4 text-lg" : "py-2.5"
        }`}
      >
        Search
      </button>
    </form>
  );
}
