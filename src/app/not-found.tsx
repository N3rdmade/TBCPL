import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center md:px-6">
      <div className="text-7xl font-extrabold" style={{ color: "var(--accent)" }}>404</div>
      <h1 className="mt-3 text-2xl font-bold">Lost in the stream</h1>
      <p className="mt-2 text-[var(--fg-muted)]">
        We couldn&apos;t find that page. Try the home page or use search (⌘K).
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full px-6 py-3 font-semibold"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        Back home
      </Link>
    </main>
  );
}
