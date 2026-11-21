/** Mounts the animated twin on the client because it depends on browser state. */
"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("./AppShell"), {
  ssr: false,
  loading: () => <div className="pw-shell-loading pw-mono">PYRE WITNESS</div>,
});

export default function ClientRoot() {
  return <AppShell />;
}
