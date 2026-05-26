import Image from "next/image";
import type { Metadata } from "next";

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.73.5.64 5.59.64 11.86c0 5.01 3.25 9.26 7.77 10.76.57.1.78-.25.78-.55v-2.02c-3.16.69-3.83-1.36-3.83-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.52-.29-5.17-1.26-5.17-5.61 0-1.24.45-2.25 1.18-3.04-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.75.11 3.04.74.79 1.18 1.8 1.18 3.04 0 4.36-2.66 5.32-5.19 5.6.41.36.78 1.06.78 2.13v3.16c0 .3.21.66.79.55 4.51-1.5 7.76-5.75 7.76-10.76C23.36 5.59 18.27.5 12 .5z" />
    </svg>
  );
}

export const metadata: Metadata = { title: "About" };

const TEAM = [
  {
    name: "Hellhorde",
    role: "Founder & Curator",
    avatar: "https://avatars.githubusercontent.com/u/161110729?v=4",
    bio: "Passionate about making entertainment accessible to everyone. Constantly hunting for the best streaming sites to add to the collection.",
    github: "https://github.com/N3rdmade/",
  },
  {
    name: "R",
    role: "Maintainer",
    avatar: "https://avatars.githubusercontent.com/u/84559232?v=4",
    bio: "Helping maintain and improve TBCPL to keep it running smoothly for the community.",
    github: "https://github.com/rishabnotfound",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">About TBCPL</h1>
        <p className="mt-2 text-[var(--fg-muted)]">The story behind the list 💜</p>
      </header>

      <section className="tbcpl-card mb-10 p-8">
        <h2 className="mb-3 text-xl font-bold">Our Mission</h2>
        <p className="mb-3 text-[var(--fg-muted)]">
          Welcome to <strong className="text-[var(--fg)]">TheBestCouchPotatoList (TBCPL)</strong> — your guide to free
          streaming entertainment. We curate the most comprehensive collection of streaming sites across movies, TV
          shows, anime, manga, and live TV.
        </p>
        <p className="text-[var(--fg-muted)]">
          The mission is simple: help you discover quality entertainment without sifting through countless websites.
          Movie buff, anime fan, manga reader, sports fan — we&apos;ve got you covered.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">The Team</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEAM.map((m) => (
            <div key={m.name} className="tbcpl-card flex flex-col items-center p-8 text-center">
              <Image
                src={m.avatar}
                alt={m.name}
                width={110}
                height={110}
                className="mb-5 rounded-full ring-2"
                style={{ boxShadow: "0 0 15px var(--accent-glow)" }}
                unoptimized
              />
              <h3 className="text-lg font-bold">{m.name}</h3>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">{m.role}</p>
              <p className="mt-3 text-sm text-[var(--fg-muted)]">{m.bio}</p>
              <a
                href={m.github}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                <GithubIcon size={18} />
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
