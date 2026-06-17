export const DEFAULT_REGION_CLIENT = "USA";

export const CATEGORY_META: Record<
  string,
  { label: string; icon: string; blurb: string }
> = {
  movies: { label: "Movies & Shows", icon: "🎬", blurb: "Streaming sites for movies and TV." },
  anime: { label: "Anime", icon: "🌸", blurb: "Anime streaming and aggregators." },
  manga: { label: "Manga", icon: "📚", blurb: "Manga readers and libraries." },
  livetv: { label: "Live TV & Sports", icon: "📺", blurb: "Live channels and sports streams." },
  paid: { label: "Paid", icon: "💳", blurb: "Paid & Legal Alternative" },
  apps: { label: "Apps", icon: "📱", blurb: "Native apps and APKs." },
};
