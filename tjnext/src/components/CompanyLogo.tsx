const GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-400",
  "from-sky-500 to-blue-600",
  "from-amber-500 to-yellow-400",
  "from-fuchsia-500 to-pink-500",
];

export default function CompanyLogo({ name, size = 48 }: { name: string; size?: number }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-bold text-white shadow-sm ${GRADIENTS[hash % GRADIENTS.length]}`}
    >
      {name[0]}
    </div>
  );
}
