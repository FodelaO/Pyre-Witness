"use client";

/**
 * Client-only mount of the app. The twin is animated SVG driven by browser state, so we skip
 * server rendering entirely (no hydration mismatches from animation, time or randomness).
 */
import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("./AppShell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-dvw items-center justify-center bg-pw-bg">
      <span className="pw-mono text-xs tracking-[0.3em] text-pw-faint">PYRE WITNESS</span>
    </div>
  ),
});

export default function ClientRoot() {
  return <AppShell />;
}
