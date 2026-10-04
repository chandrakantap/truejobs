export default function ApplyButton({ url, ats }: { url: string; ats: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700"
      title={`Apply on ${ats}`}
    >
      Apply ↗
    </a>
  );
}
