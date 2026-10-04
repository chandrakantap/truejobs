import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white">✓</span>
      truejobs<span className="text-muted font-medium">.tech</span>
    </Link>
  );
}

export default function Header() {
  const link = "rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-brand-soft hover:text-brand";
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/jobs" className={link}>Jobs</Link>
          <Link href="/jobs?remote=true" className={`${link} hidden sm:block`}>Remote</Link>
          <Link href="/jobs?days=1" className={`${link} hidden sm:block`}>New today</Link>
          <Link
            href="/jobs"
            className="ml-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover dark:text-slate-900"
          >
            Find jobs
          </Link>
        </nav>
      </div>
    </header>
  );
}
