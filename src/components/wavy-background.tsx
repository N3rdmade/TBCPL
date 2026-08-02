"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

interface Props {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
}

function readThemeColors(): string[] {
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue("--accent").trim();
  const glow = cs.getPropertyValue("--accent-glow").trim();
  const borderStrong = cs.getPropertyValue("--border-strong").trim();
  const fg = cs.getPropertyValue("--fg").trim();
  const bgElev = cs.getPropertyValue("--bg-elev").trim();
  return [accent, glow, borderStrong, accent, fg || bgElev].filter(Boolean);
}

export function WavyBackground({
  children,
  className,
  containerClassName,
  colors,
  waveWidth = 50,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<string[]>(colors ?? []);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome"),
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const noise = createNoise3D();
    const stepSpeed = speed === "slow" ? 0.001 : 0.002;

    colorsRef.current = colors ?? readThemeColors();

    let w = 0;
    let h = 0;
    let nt = 0;
    let raf = 0;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.filter = `blur(${blur}px)`;
    };

    const drawWave = (n: number) => {
      nt += stepSpeed;
      const palette = colorsRef.current;
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth;
        ctx.strokeStyle = palette[i % palette.length];
        for (let x = 0; x < w; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x, y + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = backgroundFill ?? "transparent";
      if (backgroundFill) ctx.fillRect(0, 0, w, h);
      else ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = waveOpacity;
      drawWave(5);
      raf = requestAnimationFrame(render);
    };

    resize();
    render();

    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    const mo = colors
      ? null
      : new MutationObserver(() => {
          colorsRef.current = readThemeColors();
        });
    mo?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"],
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo?.disconnect();
    };
  }, [colors, blur, speed, waveOpacity, waveWidth, backgroundFill]);

  return (
    <div ref={wrapperRef} className={cn("relative", containerClassName)}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0"
        style={isSafari ? { filter: `blur(${blur}px)` } : undefined}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}
