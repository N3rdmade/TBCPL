"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function hexToRgb01(hex: string): [number, number, number] {
  const m = hex.trim().replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return [0.1, 0.1, 0.1];
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function parseCssColor(raw: string, fallback: [number, number, number]): [number, number, number] {
  const s = raw.trim();
  if (!s) return fallback;
  if (s.startsWith("#")) return hexToRgb01(s);
  const rgba = s.match(/rgba?\(([^)]+)\)/i);
  if (rgba) {
    const parts = rgba[1].split(",").map((p) => parseFloat(p));
    if (parts.length >= 3) return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
  }
  return fallback;
}

function readThemeColor(): [number, number, number] {
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue("--accent");
  return parseCssColor(accent, [0.1, 0.1, 0.1]);
}

export function WaveShaderBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    // Mobile devices skip the shader entirely — a static themed gradient is used instead.
    // The shader was too heavy on low-end Android and offered marginal visual value at that size.
    const mq = window.matchMedia("(min-width: 769px)");
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const isMobile = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: "low-power" });
      // Cap DPR on mobile to stay light
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      // Style canvas so it fills the fixed container
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
    } catch (err) {
      console.error("WebGL not supported", err);
      return;
    }

    // Log context loss so we can diagnose if mobile Safari kills it
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      console.warn("WebGL context lost", e);
    });

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const startTime = performance.now();
    let pausedAt = 0;
    let pausedTotal = 0;

    const vertexShader = `
      varying vec2 vTextureCoord;
      void main() {
        vTextureCoord = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uScale;
      varying vec2 vTextureCoord;

      // Value noise + fBM for smooth organic blobs
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 3; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = (2.0 * vTextureCoord * iResolution - iResolution.xy) / min(iResolution.x, iResolution.y);
        uv *= uScale;
        float t = iTime * 0.08;

        // Independent 2D flow vectors — bounded oscillation so the field's flow
        // magnitude stays constant over time (previously multiplied by t, which
        // made the animation appear to accelerate as the page stayed open).
        // A small linear drift is added so the field still travels visually.
        vec2 drift = vec2(0.15, 0.10) * t;
        vec2 flow1 = vec2(cos(t * 0.7), sin(t * 0.9)) + drift;
        vec2 flow2 = vec2(sin(t * 1.1 + 1.7), cos(t * 0.6 + 3.4)) + drift * 0.7;
        vec2 flow3 = vec2(cos(t * 0.5 + 2.3), sin(t * 1.3 + 4.1)) + drift * 1.2;

        vec2 q = vec2(
          fbm(uv + flow1),
          fbm(uv + flow2 + vec2(5.2, 1.3))
        );
        float f = fbm(uv + 4.0 * q + flow3);

        // Rim highlights: derivative of f
        float rim = abs(fract(f * 4.0) - 0.5) * 2.0;
        rim = pow(1.0 - rim, 3.5);

        // Base blob shading (dark valleys, mid highlights)
        float body = smoothstep(0.15, 0.9, f);

        vec3 dark = uColor * 0.05;
        vec3 mid  = uColor * 0.55;
        vec3 hot  = uColor * 1.15;

        vec3 col = mix(dark, mid, body);
        col += hot * rim * 0.9;

        // Vignette to keep edges deep
        float vig = smoothstep(1.4, 0.4, length(uv));
        col *= mix(0.35, 1.0, vig);

        col *= uIntensity;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const themeColor = readThemeColor();
    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Vector3(...themeColor) },
      uIntensity: { value: isMobile ? 1.3 : 1.0 },
      uScale: { value: isMobile ? 0.55 : 1.0 },
    };

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      uniforms.iResolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);
    onResize();

    // Pause when tab hidden — accumulate hidden time so the animation doesn't jump on return
    let paused = document.hidden;
    if (paused) pausedAt = performance.now();
    const onVis = () => {
      if (document.hidden) {
        pausedAt = performance.now();
        paused = true;
      } else {
        pausedTotal += performance.now() - pausedAt;
        paused = false;
      }
    };
    document.addEventListener("visibilitychange", onVis);

    // Update color live when theme changes
    const mo = new MutationObserver(() => {
      const [r, g, b] = readThemeColor();
      uniforms.uColor.value.set(r, g, b);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });

    // Throttle framerate: mobile → 30fps, desktop → uncapped
    const frameInterval = isMobile ? 1 / 30 : 0;
    let acc = 0;
    let lastT = 0;
    renderer.setAnimationLoop(() => {
      if (paused) return;
      const t = (performance.now() - startTime - pausedTotal) / 1000;
      const dt = t - lastT;
      lastT = t;
      if (frameInterval > 0) {
        acc += dt;
        if (acc < frameInterval) return;
        acc = 0;
      }
      uniforms.iTime.value = t;
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      mo.disconnect();
      renderer.setAnimationLoop(null);
      const canvas = renderer.domElement;
      canvas.parentNode?.removeChild(canvas);
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    };
  }, [enabled]);

  if (enabled === false) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(120% 80% at 20% 0%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%), radial-gradient(100% 70% at 100% 100%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 55%)",
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 opacity-50"
      style={{ zIndex: 0 }}
    />
  );
}
