/**
 * Mount-ready 3D stage. Renders nothing while 2D is selected; loads the WebGL view lazily when
 * 3D is switched on; on any error it falls back to 2D with a one-line notice. The 2D product
 * never depends on this file.
 */
"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, type ReactNode } from "react";
import { useSimStore } from "@/sim/simStore";
import { SIMULATION_NOTICE, useView3DStore } from "./view3dStore";
import "./view3d.css";

const Plant3D = dynamic(() => import("./Plant3D"), {
  ssr: false,
  loading: () => <div className="pw3d-loading pw-mono">3D VIEW</div>,
});

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    useView3DStore.getState().fail(error.message);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Notice({ text }: { text: string }) {
  const clear = useView3DStore((state) => state.clearNotice);
  useEffect(() => {
    const timer = window.setTimeout(clear, 7000);
    return () => window.clearTimeout(timer);
  }, [clear]);
  return <div className="pw3d-notice pw-mono" role="status">{text}</div>;
}

export default function View3DStage() {
  const enabled = useView3DStore((state) => state.enabled);
  const notice = useView3DStore((state) => state.notice);
  // Simulation overlays (incident effects, timeline stages) are drawn on the 2D floor only: while a
  // scenario is loaded the view is 2D, with a one-line notice instead of a 3D plant where nothing happens.
  const simulating = useSimStore((state) => state.activeScenario !== null);
  useEffect(() => {
    if (enabled && simulating) useView3DStore.getState().showIn2D(SIMULATION_NOTICE);
  }, [enabled, simulating]);
  if (!enabled) return notice ? <Notice text={notice} /> : null;
  return (
    <div className="pw3d-stage">
      <Boundary>
        <Plant3D />
      </Boundary>
    </div>
  );
}
