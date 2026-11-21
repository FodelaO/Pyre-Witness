/** Displays the real capture and reveals evidence before the captured floor symbol lands. */
import { useLayoutEffect, type CSSProperties, type RefObject } from "react";
import { ScanLine } from "lucide-react";
import type { CaptureImage } from "@/pipeline/types";
import type { Box } from "./floorLayout";
import type { CrewVisual } from "./director";
import { useCalloutScroll } from "./useCalloutScroll";

type Evidence = Extract<CrewVisual, { kind: "evidence" }>;
const spacing = (count: number) => Math.min(125, 880 / Math.max(1, count));

export function CapturePreview({ thumbnail }: { thumbnail: CaptureImage }) {
  return (
    <g className="pw-crew-capture-float" transform="translate(36 -107)" aria-label="Scout reading the captured image">
      <rect width={91} height={108} rx={6} />
      <image href={`data:${thumbnail.mimeType};base64,${thumbnail.dataBase64}`} x={6} y={6} width={79} height={78} preserveAspectRatio="xMidYMid meet" />
      <ScanLine x={8} y={90} size={12} />
      <text x={25} y={100}>Capture</text>
    </g>
  );
}

export function EvidenceCard({ effect, box, scale }: { effect: Evidence; box: Box; scale: number }) {
  const list = useCalloutScroll<HTMLUListElement>();
  return (
    <g className="pw-crew-evidence" transform={`translate(${box.x} ${box.y}) scale(${scale})`}>
      <foreignObject width={box.w / scale} height={box.h / scale}>
        <div className="pw-crew-evidence-card" aria-label="Scout perception evidence">
          <strong>{effect.device}</strong>
          <ul ref={list}>
            {effect.chips.map(({ kind, text }, index) => (
              <li key={index} title={text} style={{ "--crew-evidence-delay": `${90 + spacing(effect.chips.length) * index}ms` } as CSSProperties}>
                <b>{kind}</b><span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </foreignObject>
    </g>
  );
}

export function useScoutLanding(root: RefObject<SVGGElement | null>, assetId: string | null, evidence: Evidence | undefined, at: number | undefined) {
  useLayoutEffect(() => {
    if (!assetId || !evidence || at === undefined || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const asset = root.current?.parentElement?.querySelector(`[data-floor-asset="${CSS.escape(assetId)}"] .pw-floor-symbol`);
    if (!asset?.animate) return;
    const delay = evidence.chips.length ? 150 + spacing(evidence.chips.length) * evidence.chips.length : 0;
    const elapsed = Math.max(0, performance.now() - at);
    const duration = 480;
    if (elapsed >= delay + duration) return;
    const placement = asset.animate([
      { opacity: 0, transform: "translateY(-38px) scale(.72)" },
      { opacity: 1, transform: "translateY(0px) scale(1)" },
    ], { duration, delay, easing: "cubic-bezier(.16,.9,.34,1)", fill: "backwards" });
    placement.currentTime = elapsed;
    return () => placement.cancel();
  }, [root, assetId, evidence, at]);
}
