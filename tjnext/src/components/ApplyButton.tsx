export default function ApplyButton({
  url,
  ats,
  full = false,
}: {
  url: string;
  ats: string;
  full?: boolean;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Apply on ${ats}`}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover dark:text-slate-900 ${full ? "w-full" : ""}`}
    >
      Apply now
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 17 17 7M8 7h9v9" /></svg>
    </a>
  );
}
