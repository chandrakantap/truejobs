import Link from "next/link";
import { Logo } from "./Header";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted">
            Tech jobs sourced directly from company career sites and ATS platforms. Know before you apply.
          </p>
        </div>
        <div className="flex gap-12 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Browse</span>
            <Link href="/jobs" className="text-muted hover:text-brand">All jobs</Link>
            <Link href="/jobs?remote=true" className="text-muted hover:text-brand">Remote jobs</Link>
            <Link href="/jobs?days=7" className="text-muted hover:text-brand">Last 7 days</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Popular</span>
            <Link href="/jobs?q=java" className="text-muted hover:text-brand">Java jobs</Link>
            <Link href="/jobs?q=node.js" className="text-muted hover:text-brand">Node.js jobs</Link>
            <Link href="/jobs?q=react" className="text-muted hover:text-brand">React jobs</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} truejobs.tech
      </div>
    </footer>
  );
}
