"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export const THEMES = [
  { id: "purple-dark", label: "Purple Dark", swatch: "#8b5cf6" },
  { id: "midnight", label: "Midnight", swatch: "#38bdf8" },
  { id: "synthwave", label: "Synthwave", swatch: "#ff38b8" },
  { id: "paper", label: "Paper", swatch: "#7c3aed" },
  { id: "terminal", label: "Terminal", swatch: "#00ff66" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="purple-dark"
      themes={THEMES.map((t) => t.id)}
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    />
  );
}
