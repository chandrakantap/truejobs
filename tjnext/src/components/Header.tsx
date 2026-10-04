import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          true<span className="text-emerald-600">jobs</span>.tech
        </Link>
        <nav className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/jobs" className="hover:text-foreground">All jobs</Link>
          <Link href="/jobs?remote=true" className="hover:text-foreground">Remote</Link>
          <Link href="/jobs?days=1" className="hover:text-foreground">Last 24h</Link>
        </nav>
      </div>
    </header>
  );
}
