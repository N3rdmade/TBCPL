import Image from "next/image";
import { LatestCommitPill } from "./latest-commit-pill";
import { LiveUsers } from "./live-users";
import { FlagIcon } from "./flag-icon";

interface Stat {
  label: string;
  value: number | string;
}

interface Props {
  regionFlag?: string;
  regionName?: string;
  stats?: Stat[];
}

export function Hero({ regionFlag, regionName, stats }: Props) {
  return (
    <section
      className="relative mb-6 overflow-hidden rounded-2xl border md:mb-8 md:rounded-3xl"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--accent) 16%, transparent), transparent 55%), var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative grid items-center gap-6 px-5 py-8 md:px-10 md:py-12 lg:grid-cols-[1.4fr_1fr]">
        {/* LEFT: title + tagline */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TBCPL" width={44} height={44} className="h-10 w-10 rounded-xl md:h-11 md:w-11" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--accent)]">The Best Couch Potato List</div>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
                Your streaming{" "}
                <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--fg)] to-[var(--accent)] bg-clip-text text-transparent">
                  everything
                </span>
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm text-[var(--fg-muted)] md:text-base">
            Curated streaming sites, instant fuzzy search, multi-region support.
            {regionName && (
              <>
                {" "}Showing{" "}
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--fg)]">
                  {regionFlag && <FlagIcon code={regionFlag} size={16} />}
                  {regionName}
                </span>
                .
              </>
            )}
          </p>

          {/* Mobile-only: stats + pills stay on left so they don't get hidden */}
          <div className="lg:hidden">
            {stats && stats.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border px-3 py-2 text-center"
                    style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
                  >
                    <div className="text-lg font-extrabold">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LatestCommitPill />
              <LiveUsers />
            </div>
          </div>
        </div>

        {/* RIGHT: stats + live data */}
        <aside className="hidden flex-col gap-3 lg:flex">
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border px-3 py-2.5 text-center"
                  style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
                >
                  <div className="text-2xl font-extrabold tabular-nums">{s.value}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <LatestCommitPill />
            <LiveUsers />
          </div>
        </aside>
      </div>
    </section>
  );
}
