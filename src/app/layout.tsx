import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GoFundMeBanner } from "@/components/gofundme-banner";
import { SafetyToast } from "@/components/safety-toast";
import { CommandPaletteProvider } from "@/components/command-palette";
import { RegionContextProvider } from "@/components/region-context";
import { getRegions, buildSearchIndex, DEFAULT_REGION_CODE } from "@/lib/data";

const geistSans = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://tbcpl.lol"),
  title: {
    default: "TBCPL — The Best Couch Potato List",
    template: "%s · TBCPL",
  },
  description:
    "A curated, regional list of free streaming sites — movies, TV shows, anime, manga, live TV, sports and more. Fast fuzzy search, multi-region, no ads on us.",
  applicationName: "TBCPL",
  keywords: [
    "streaming sites",
    "free movies",
    "free tv shows",
    "anime streaming",
    "manga reader",
    "live tv",
    "sports streams",
    "fmhy alternative",
    "best streaming list",
    "tbcpl",
  ],
  authors: [{ name: "TBCPL Team", url: "https://tbcpl.lol" }],
  creator: "TBCPL Team",
  publisher: "TBCPL",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "TBCPL",
    title: "TBCPL — The Best Couch Potato List",
    description:
      "A curated, regional list of free streaming sites — movies, anime, manga, live TV and more.",
    url: "https://tbcpl.lol",
    locale: "en_US",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "TBCPL — The Best Couch Potato List",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TBCPL — The Best Couch Potato List",
    description:
      "Curated streaming sites for movies, anime, manga, live TV and more — fast fuzzy search, multi-region.",
    images: ["/banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "entertainment",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const regions = await getRegions();
  const searchIndex = await buildSearchIndex(DEFAULT_REGION_CODE);

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <RegionContextProvider regions={regions} current={DEFAULT_REGION_CODE}>
            <CommandPaletteProvider initialIndex={searchIndex} regions={regions}>
              <GoFundMeBanner />
              <Navbar />
              <div className="relative z-10">{children}</div>
              <Footer />
              <SafetyToast />
            </CommandPaletteProvider>
          </RegionContextProvider>
        </ThemeProvider>

        <Script id="llvpn-ads" strategy="afterInteractive">
          {`(function(s){s.dataset.zone='10657401',s.src='https://llvpn.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
        </Script>

        <Script src="https://www.googletagmanager.com/gtag/js?id=G-TD8F20DS4V" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-TD8F20DS4V');`}
        </Script>
      </body>
    </html>
  );
}
