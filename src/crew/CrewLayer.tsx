/** Composes the event-backed crew, work cues, and callouts in the floor coordinate system. */
"use client";

import { useId, useMemo, type CSSProperties } from "react";
import { useRunStore } from "@/pipeline/runStore";
import { areaAt, areaById, distance } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import Avatar from "./Avatar";
import Bubble from "./Bubble";
import CrewOffice from "./CrewOffice";
import { crewAvatar, useCrewStore } from "./crewStore";
import { avatarBounds, avatarScale, calloutGap, clearLeader, collides, equipmentBounds, placeCallout, placeFloorLabel, placePatrolCallout, roomTitleBands, type Box } from "./floorLayout";
import { deskPosition, deskScale, isDesk } from "./officeLayout";
import { useIdlePatrol } from "./patrol";
import { CapturePreview, EvidenceCard, useScoutLanding } from "./ScoutEvidence";
import { CREW, CREW_ORDER, type CrewId } from "./types";
import { useCrewViewport } from "./useCrewViewport";
import { ArchitectureOverlay, HandoffPulse, InspectionOverlay } from "./WorkOverlay";

const BUBBLE_ORDER: CrewId[] = ["chief", "architect", "scout", "inspector"];
const palette = (id: CrewId): CSSProperties => ({ "--crew-color": `var(${CREW[id].colorVar})` } as CSSProperties);

export default function CrewLayer() {
  useIdlePatrol();
  const idPrefix = useId();
  const twin = useTwinStore((state) => state.twin);
  const selectedId = useTwinStore((state) => state.selectedId);
  const { plant } = twin;
  const office = areaById(twin, "crew_office");
  const avatars = useCrewStore((state) => state.avatars);
  const visuals = useCrewStore((state) => state.visuals);
  const handoffs = useCrewStore((state) => state.handoffs);
  const phase = useCrewStore((state) => state.phase);
  const dismiss = useCrewStore((state) => state.dismissBriefing);
  const thumbnail = useRunStore((state) => state.captureThumbnail);
  const placedAssetId = useRunStore((state) => state.placedAssetId);
  const { ref, viewport, card, chrome, labels, inverse } = useCrewViewport(plant.canvas, selectedId);
  const scale = inverse;
  const picture = visuals.scout?.effect.kind === "capture" ? thumbnail : null;
  const evidence = visuals.scout?.effect.kind === "evidence" ? visuals.scout.effect : undefined;
  useScoutLanding(ref, placedAssetId, evidence, visuals.scout?.at);

  const portraitScale = avatarScale(inverse);
  const seatedScale = office ? avatarScale(inverse, deskScale(office)) : portraitScale;
  const occupied: Box[] = card ? [card, ...chrome] : [...chrome];
  const protectedLabels = useMemo(() => [...roomTitleBands(twin.areas), ...labels], [twin.areas, labels]);
  const clearanceMask = `${idPrefix}-crew-label-clearance`;
  const callout = (anchor: { x: number; y: number }, size: { w: number; h: number }, preferLeft = false) =>
    placeCallout(anchor, size, viewport, occupied, scale, preferLeft, protectedLabels);
  const added = placedAssetId ? twin.assets.find(({ id }) => id === placedAssetId) : undefined;
  if (added) occupied.push(equipmentBounds(added, scale));
  const deskAway = new Set<CrewId>();
  const crew = CREW_ORDER.map((id) => {
    const avatar = crewAvatar(id, avatars);
    const end = avatar.walk?.end.point ?? avatar.point;
    const seat = deskPosition(id, plant.building, office);
    const parked = !avatar.walking && distance(avatar.point, seat) < 1;
    const desk = parked || (avatar.walking && (isDesk(avatar.point, plant.building, office) || isDesk(end, plant.building, office)));
    const size = desk ? seatedScale : portraitScale;
    occupied.push(avatarBounds(end, size));
    if (!parked && office) {
      deskAway.add(id);
      occupied.push(avatarBounds(seat, seatedScale));
    }
    return { id, avatar, end, size, desk };
  });
  const scout = crew.find(({ id }) => id === "scout")!;
  const chief = crew.find(({ id }) => id === "chief")!;
  if (picture) {
    const { x, y } = scout.end;
    occupied.push({ x: x + 36 * scout.size, y: y - 107 * scout.size, w: 91 * scout.size, h: 108 * scout.size });
  }
  const evidenceBox = evidence?.chips.length && phase !== "idle" && chief.avatar.speech?.kind !== "briefing" && !scout.avatar.speech?.attention
    ? callout(scout.end, { w: 278 * scale, h: Math.min(197, 39 + evidence.chips.length * 24) * scale })
    : null;
  if (evidenceBox) occupied.push(evidenceBox);

  const check = visuals.inspector?.effect;
  let checkLabel: Box | null = null;
  if (check?.kind === "check" && check.passed) {
    const room = areaAt(twin, check.at.x, check.at.y)?.bounds;
    const w = 144 * scale;
    const preferredX = check.at.x + 18 * scale;
    const x = room && room.w >= w + 8 * scale ? Math.min(preferredX, room.x + room.w - w - 8 * scale) : preferredX;
    checkLabel = placeFloorLabel({ x, y: check.at.y - 12 * scale, w, h: 24 * scale },
      check.at, viewport, [...occupied, ...protectedLabels], scale, room);
  }
  if (checkLabel) occupied.push(checkLabel);

  const proposal = visuals.architect?.effect;
  let proposalLabel: Box | null = null;
  if (proposal?.kind === "proposal") {
    const room = areaById(twin, proposal.area)?.bounds;
    const preferred = {
      x: room ? room.x + 12 : proposal.to.x,
      y: (room ? room.y + room.h : proposal.to.y) - 25 * scale,
      w: 158 * scale, h: 18 * scale,
    };
    // Give the verdict first choice, then try the placement caption just beneath it.
    if (checkLabel && collides(preferred, checkLabel, 4 * scale)) {
      preferred.y = checkLabel.y + checkLabel.h + 4.5 * scale;
    }
    proposalLabel = placeFloorLabel(preferred, proposal.to, viewport, [...occupied, ...protectedLabels], scale, room);
  }
  if (proposalLabel) occupied.push(proposalLabel);

  return (
    <g ref={ref} className="pw-crew-layer" aria-label="AI crew" pointerEvents="none">
      <defs>
        <mask id={clearanceMask} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse"
          x={viewport.x} y={viewport.y} width={viewport.w} height={viewport.h}>
          <rect x={viewport.x} y={viewport.y} width={viewport.w} height={viewport.h} fill="white" />
          {protectedLabels.map(({ x, y, w, h }, index) => <rect key={index} x={x} y={y} width={w} height={h} fill="black" />)}
        </mask>
      </defs>
      {/* Walks may cross a room threshold. Keep the floor labels readable during the crossing. */}
      <g mask={`url(#${clearanceMask})`}>
        <CrewOffice room={office} building={plant.building} away={deskAway} scale={seatedScale} idPrefix={idPrefix} />
        {proposal && <ArchitectureOverlay effect={proposal} twin={twin} marker={`${idPrefix}-recommendation`} label={proposalLabel} scale={scale} />}
        {visuals.inspector && <InspectionOverlay key={visuals.inspector.at} displayed={visuals.inspector} scale={scale} label={checkLabel} />}
        {handoffs.map((handoff) => <HandoffPulse key={handoff.id} handoff={handoff} />)}
        {crew.map(({ id, avatar, size, desk }) => (
          <Avatar key={id} member={CREW[id]} avatar={avatar} idPrefix={idPrefix} scale={size} desk={desk}
            preview={id === "scout" && picture ? <CapturePreview thumbnail={picture} /> : undefined} />
        ))}
      </g>
      {evidence && evidenceBox && <g style={palette("scout")}><EvidenceCard key={visuals.scout?.at} effect={evidence} box={evidenceBox} scale={scale} /></g>}
      {BUBBLE_ORDER.map((id) => {
        const { avatar, end, size } = crew.find((member) => member.id === id)!;
        if (!avatar.speech || (id === "scout" && evidenceBox)) return null;
        const patrol = avatar.speech.kind === "patrol";
        if (patrol && avatar.walking) return null;
        const pinned = avatar.speech.kind === "briefing";
        const maxWidth = patrol ? 150 : pinned ? 400 : avatar.speech.kind === "thought" ? 334 : 226;
        const w = Math.min(maxWidth * scale, viewport.w - 26 * scale);
        const h = (patrol ? 31 : pinned ? 137 : 67) * scale;
        const box = patrol
          ? placePatrolCallout(end, { w, h }, viewport, occupied, twin.assets.map((asset) => equipmentBounds(asset, scale)), scale, size, protectedLabels)
          : callout(end, { w, h }, pinned || !!picture && id === "scout")
            ?? (pinned ? callout(end, { w: Math.min(w, 360 * scale), h: 112 * scale }, true) : null);
        if (!box) return null;
        const leader = clearLeader(end, box, protectedLabels, scale);
        // A step card at a far edge with no leader reads as a stray notice: the dock card already carries that status.
        if (!leader && !pinned && !patrol && calloutGap(end, box) > 220 * scale) return null;
        occupied.push(box);
        return <g key={id} style={palette(id)}><Bubble anchor={end} box={box} scale={scale} avatar={avatar} member={CREW[id]} dismiss={dismiss}
          showLeader={leader} /></g>;
      })}
    </g>
  );
}
