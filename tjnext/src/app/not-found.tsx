import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-24 text-center">
        <p className="text-5xl font-bold text-brand">404</p>
        <h1 className="mt-3 text-2xl font-bold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-muted">The job may have been closed or removed.</p>
        <Link href="/jobs" className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900">
          Browse jobs
        </Link>
      </main>
      <Footer />
    </>
  );
}
