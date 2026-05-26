"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Region } from "@/lib/types";

type Ctx = {
  regions: Region[];
  current: string;
};

const RegionCtx = createContext<Ctx | null>(null);

export function RegionContextProvider({
  regions,
  current,
  children,
}: {
  regions: Region[];
  current: string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ regions, current }), [regions, current]);
  return <RegionCtx.Provider value={value}>{children}</RegionCtx.Provider>;
}

export function useRegions() {
  const ctx = useContext(RegionCtx);
  if (!ctx) throw new Error("useRegions outside provider");
  return ctx;
}
