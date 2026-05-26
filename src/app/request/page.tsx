import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Request a Site" };

const LOOK_FOR = [
  "Working, active sites",
  "Good content library",
  "User-friendly interface",
  "Mobile compatibility",
  "Minimal intrusive ads",
];

const AVOID = [
  "Broken or offline sites",
  "Excessive pop-ups / malware",
  "Scam or phishing sites",
  "Paid sites (exceptions apply)",
];

export default function RequestPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Request a Site</h1>
        <p className="mt-2 text-[var(--fg-muted)]">Help us grow the collection.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="tbcpl-card p-6 md:p-8">
          <h2 className="mb-4 text-lg font-bold">Submit your request</h2>
          <RequestForm />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold">Submission guidelines</h2>
          <div className="tbcpl-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold" style={{ color: "var(--success)" }}>
              <CheckCircle2 size={16} /> We look for
            </h3>
            <ul className="space-y-1.5 text-sm text-[var(--fg-muted)]">
              {LOOK_FOR.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--success)" }} />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="tbcpl-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-semibold" style={{ color: "var(--danger)" }}>
              <XCircle size={16} /> We avoid
            </h3>
            <ul className="space-y-1.5 text-sm text-[var(--fg-muted)]">
              {AVOID.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--danger)" }} />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
