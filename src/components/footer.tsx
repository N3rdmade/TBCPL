import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="mt-20 border-t"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--fg-muted)] md:flex-row md:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/about" className="hover:text-[var(--fg)]">About</Link>
          <Link href="/request" className="hover:text-[var(--fg)]">Request</Link>
          <Link href="/dmca" className="hover:text-[var(--fg)]">DMCA</Link>
          <a href="https://github.com/N3rdmade/TBCPL/" target="_blank" rel="noreferrer" className="hover:text-[var(--fg)]">GitHub</a>
        </div>
        <div className="flex flex-col items-center gap-2 text-center md:items-end md:text-right">
          <div>Curated with 💜 by the TBCPL Team</div>
          <div className="text-xs opacity-70">© {new Date().getFullYear()} TBCPL. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
