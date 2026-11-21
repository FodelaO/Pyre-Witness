/** Presents a timed crew announcement or a pinned, dismissible Chief briefing. */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Point } from "@/twin/geometry";
import type { AvatarState } from "./crewStore";
import { leaderEnd, type Box } from "./floorLayout";
import type { CrewMember } from "./types";
import { useCalloutScroll } from "./useCalloutScroll";

function duration(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

function Elapsed({ at }: { at: number }) {
  const time = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const tick = () => { if (time.current) time.current.textContent = duration(Date.now() - at); };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [at]);
  return <span ref={time} className="pw-crew-bubble-time" aria-label="Elapsed time" />;
}

export default function Bubble({ anchor, box, scale, avatar, member, dismiss, showLeader = true }: {
  anchor: Point;
  box: Box;
  scale: number;
  avatar?: AvatarState;
  member: CrewMember;
  dismiss: () => void;
  showLeader?: boolean;
}) {
  const speech = avatar?.speech;
  const pinned = speech?.kind === "briefing";
  const body = useCalloutScroll<HTMLDivElement>(pinned);
  if (!avatar || !speech?.text.trim()) return null;
  const { speechEngine, speechStartedAt, speechLatencyMs } = avatar;
  const thought = speech.kind === "thought";
  const patrol = speech.kind === "patrol";
  const heading = pinned ? "Chief briefing" : patrol ? "idle patrol" : member.name;
  const end = leaderEnd(anchor, box, scale);

  return (
    <g className="pw-crew-bubble" data-kind={speech.kind} data-status={avatar.status} data-attention={speech.attention || undefined} aria-label={`${heading} · ${speech.text}`}>
      {showLeader && <line className="pw-crew-bubble-line" x1={anchor.x} y1={anchor.y} x2={end.x} y2={end.y} />}
      <g transform={`translate(${box.x} ${box.y}) scale(${scale})`}>
        <foreignObject width={box.w / scale} height={box.h / scale}>
          <div ref={body} className="pw-crew-bubble-card">
            <div className="pw-crew-bubble-header">
              <strong>{heading}</strong>
              {!patrol && <span>{speechEngine ?? member.engine}</span>}
              {speechStartedAt != null ? <Elapsed at={speechStartedAt} />
                : speechLatencyMs != null && <span className="pw-crew-bubble-time">{duration(speechLatencyMs)}</span>}
              {pinned && <button type="button" onClick={dismiss} aria-label="Dismiss Chief briefing" title="Dismiss briefing"><X size={15} /></button>}
            </div>
            <div key={thought ? speech.text : speech.kind} className="pw-crew-bubble-copy" title={speech.text} tabIndex={pinned ? 0 : undefined}>{speech.text}</div>
          </div>
        </foreignObject>
      </g>
    </g>
  );
}
