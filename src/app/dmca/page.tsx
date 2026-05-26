import type { Metadata } from "next";
import { CheckCircle2, Mail } from "lucide-react";

export const metadata: Metadata = { title: "DMCA Policy" };

const STEPS = [
  { n: 1, title: "Review", body: "We review all valid DMCA requests submitted via email." },
  { n: 2, title: "Verify", body: "We verify that all required information is included." },
  { n: 3, title: "Action", body: "We remove links to infringing content when appropriate." },
  { n: 4, title: "Notify", body: "We notify you of the action taken on your request." },
];

const REQUIREMENTS = [
  { title: "Description of Copyrighted Work", body: "A description of the copyrighted work that you claim is being infringed." },
  { title: "Location of Infringing Material", body: "The URL(s) or location of the material you claim is infringing, with enough detail to locate it." },
  { title: "Your Contact Information", body: "Your name, title (if acting as an agent), address, telephone number, and email address." },
  { title: "Good Faith Statement", body: "\"I have a good faith belief that the use of the copyrighted material I am complaining of is not authorized by the copyright owner, its agent, or the law.\"" },
  { title: "Accuracy Statement", body: "\"The information in this notice is accurate and, under penalty of perjury, I am the owner, or authorized to act on behalf of the owner.\"" },
  { title: "Legal Accountability Statement", body: "\"I understand that I am subject to legal action upon submitting a DMCA request without solid proof.\"" },
  { title: "Signature", body: "An electronic or physical signature of the copyright owner or an authorized agent." },
];

export default function DmcaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">DMCA Policy</h1>
        <p className="mt-2 text-[var(--fg-muted)]">Copyright Takedown Requests 🛡️</p>
      </header>

      <section className="tbcpl-card mb-8 p-6 md:p-8">
        <h2 className="mb-3 text-lg font-bold">DMCA Overview</h2>
        <p className="mb-3 text-[var(--fg-muted)]">
          We take intellectual property rights seriously and comply with the Digital Millennium Copyright Act (DMCA).
          If you believe content linked from our site infringes your copyright, follow the procedure below.
        </p>
        <p className="text-[var(--fg-muted)]">
          <strong className="text-[var(--fg)]">Please Note:</strong> TBCPL is a directory service that provides links
          to third-party sites. We do not host, store, or control any content.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">How We Handle DMCA Requests</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="tbcpl-card p-5 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                {s.n}
              </div>
              <h3 className="font-bold" style={{ color: "var(--accent)" }}>{s.title}</h3>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-bold">DMCA Request Requirements</h2>
        <div className="tbcpl-card divide-y p-2" style={{ borderColor: "var(--border)" }}>
          {REQUIREMENTS.map((r) => (
            <div key={r.title} className="flex items-start gap-3 p-4" style={{ borderColor: "var(--border)" }}>
              <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-[var(--fg-muted)]">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="tbcpl-card p-8 text-center">
        <h2 className="mb-2 text-lg font-bold">Submit DMCA Request</h2>
        <p className="mb-5 text-[var(--fg-muted)]">Please send your DMCA takedown notice to:</p>
        <a
          href="mailto:contact@tbcpl.lol"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          <Mail size={16} /> contact@tbcpl.lol
        </a>
        <p className="mt-5 text-xs italic text-[var(--fg-muted)]">
          We will promptly investigate and take appropriate action in accordance with the DMCA.
        </p>
      </section>
    </main>
  );
}
