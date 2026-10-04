import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Not found</h1>
        <Link href="/jobs" className="mt-4 inline-block text-emerald-600 underline">Browse jobs</Link>
      </main>
    </>
  );
}
