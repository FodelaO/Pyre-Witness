/** Packs Purdue levels, network zones, and asset cards into a pane-sized diagram. */
import type { Point } from "@/twin/geometry";
import { PURDUE_LEVELS, type Asset, type EntryPoint, type PurdueLevel, type Twin } from "@/twin/types";

export interface Box extends Point {
  w: number;
  h: number;
}

export interface Band {
  level: PurdueLevel;
  y: number;
  h: number;
}

export interface Zone extends Box {
  name: string;
  first: number;
  last: number;
  lower: boolean;
  /** Extra width available above the production columns, when those lanes are free. */
  head?: { w: number; bottom: number };
}

export interface AssetCard extends Box {
  asset: Asset;
  mini: boolean;
}

export interface FieldGroup extends Box {
  zone: string;
  count: number;
  expanded: boolean;
}

export interface EntryCard extends Box {
  entry: EntryPoint;
  external: boolean;
}

export interface Anchor extends Box {
  zone?: string;
  level?: PurdueLevel;
}

export interface PurdueLayout {
  width: number;
  height: number;
  railWidth: number;
  diagramRight: number;
  compact: boolean;
  bands: Band[];
  zones: Zone[];
  cards: AssetCard[];
  fieldGroups: FieldGroup[];
  entries: EntryCard[];
  anchors: ReadonlyMap<string, Anchor>;
}

export interface NetworkDrop extends Box {
  area: string;
  level: PurdueLevel;
}

interface ZoneContents {
  name: string;
  first: number;
  last: number;
  rows: Map<PurdueLevel, Asset[]>;
  lane: number;
  span: number;
  headSpan: number;
}

const LOWER_START = PURDUE_LEVELS.findIndex(({ level }) => level === 2);
const TOP = PURDUE_LEVELS[0].level;
const LEVEL_INDEX = new Map(PURDUE_LEVELS.map(({ level }, index) => [level, index]));

function collectZones(twin: Twin): ZoneContents[] {
  const zones = new Map<string, ZoneContents>();
  function getZone(name: string, index: number) {
    let zone = zones.get(name);
    if (!zone) {
      zone = { name, first: index, last: index, rows: new Map(), lane: 0, span: 1, headSpan: 1 };
      zones.set(name, zone);
    }
    zone.first = Math.min(zone.first, index);
    zone.last = Math.max(zone.last, index);
    return zone;
  }

  for (const asset of twin.assets) {
    const { area, level } = asset.network;
    const index = LEVEL_INDEX.get(level);
    if (index === undefined) continue;
    const zone = getZone(area, index);
    const row = zone.rows.get(level) ?? [];
    row.push(asset);
    zone.rows.set(level, row);
  }

  // A conduit can name a Purdue band as its external endpoint even if there is no asset there.
  for (const { from, to } of twin.conduits) {
    for (const name of [from, to]) {
      if (zones.has(name)) continue;
      const index = PURDUE_LEVELS.findIndex((band) => band.name === name);
      if (index >= 0) getZone(name, index);
    }
  }
  return Array.from(zones.values());
}

function assignLanes(zones: ZoneContents[]): number {
  const lower = zones.filter((zone) => zone.last >= LOWER_START).sort((a, b) =>
    Math.min(a.first, LOWER_START) - Math.min(b.first, LOWER_START),
  );
  const upper = zones.filter((zone) => zone.last < LOWER_START).sort((a, b) => a.first - b.first);
  const lanes: Pick<ZoneContents, "first" | "last">[][] = lower.map((zone, lane) => {
    zone.lane = lane;
    return [zone];
  });
  const free = (lane: Pick<ZoneContents, "first" | "last">[], zone: Pick<ZoneContents, "first" | "last">) =>
    lane.every((other) => other.last < zone.first || other.first > zone.last);

  for (const zone of upper) {
    const lane = lanes.findIndex((contents) => free(contents, zone));
    zone.lane = lane < 0 ? lanes.length : lane;
    if (lane < 0) lanes.push([zone]);
    else lanes[lane].push(zone);
  }
  for (const zone of upper) {
    for (let lane = zone.lane + 1; lanes[lane] && free(lanes[lane], zone); lane++) {
      zone.span++;
      lanes[lane].push(zone);
    }
  }
  for (const zone of lower) {
    if (zone.first >= LOWER_START) continue;
    const head = { first: zone.first, last: LOWER_START - 1 };
    for (let lane = zone.lane + 1; lanes[lane] && free(lanes[lane], head); lane++) {
      zone.headSpan++;
      lanes[lane].push(head);
    }
  }
  return Math.max(1, lanes.length);
}

const GRID_GAP = 5;
const MINI_HEIGHT = 24;
const GROUP_HEIGHT = 27;
const HEADER = 25;
const ROW_PAD = 12;
const MIN_BAND_HEIGHT: Record<PurdueLevel, number> = {
  5: 73, 4: 99, 3.5: 104, 3: 99, 2: 97, 1: 98, 0: 72,
};

function grid(count: number, width: number, minWidth: number, maxWidth: number, height: number): Box[] {
  const columns = Math.max(1, Math.min(count, Math.floor((width + GRID_GAP) / (minWidth + GRID_GAP))));
  const pitch = Math.min((width + GRID_GAP) / columns, maxWidth + 22);
  const w = Math.min(maxWidth, pitch - GRID_GAP);
  return Array.from({ length: count }, (_, index) => {
    const inRow = Math.min(columns, count - Math.floor(index / columns) * columns);
    return {
      x: (width - (inRow - 1) * pitch - w) / 2 + (index % columns) * pitch,
      y: Math.floor(index / columns) * (height + GRID_GAP),
      w,
      h: height,
    };
  });
}

export function buildPurdueLayout(
  twin: Twin,
  viewportWidth: number,
  expanded: ReadonlySet<string> = new Set(),
  revealed: ReadonlySet<string> = new Set(),
): PurdueLayout {
  const compact = viewportWidth < 850;
  const railWidth = compact ? 86 : 137;
  const left = railWidth + (compact ? 6 : 14);
  const remote = twin.entryPoints.filter(({ kind }) => kind === "internet" || kind === "remote");
  const side = twin.entryPoints.filter((entry) => !remote.includes(entry));
  const rightPad = side.length ? (compact ? 31 : 46) : (compact ? 9 : 14);
  const laneGap = compact ? 5 : 11;
  const zonePad = compact ? 4 : 9;
  const nodeHeight = compact ? 34 : 42;
  const contents = collectZones(twin);
  const lanes = assignLanes(contents);
  const width = Math.max(viewportWidth, left + lanes * 48 + (lanes - 1) * laneGap + rightPad);
  const laneWidth = (width - left - rightPad - (lanes - 1) * laneGap) / lanes;
  const diagramRight = width - rightPad;
  const remoteZone = contents.find((zone) => zone.name === PURDUE_LEVELS[0].name && zone.first === 0)
    ?? contents.find((zone) => zone.first === 0);
  const minNodeWidth = compact ? 47 : 50;
  const maxNodeWidth = compact ? 74 : 92;
  const bands: Band[] = [];
  const cards: AssetCard[] = [];
  const fieldGroups: FieldGroup[] = [];
  const entries: EntryCard[] = [];
  const anchors = new Map<string, Anchor>();
  let y = 0;

  for (const [index, { level }] of PURDUE_LEVELS.entries()) {
    let bandHeight = MIN_BAND_HEIGHT[level];
    const remoteGrid = !remoteZone && level === TOP
      ? grid(remote.length, diagramRight - left, 115, 166, 27)
      : [];
    remoteGrid.forEach((box, i) => {
      entries.push({ ...box, x: left + box.x, y: y + 12 + box.y, entry: remote[i], external: true });
      bandHeight = Math.max(bandHeight, 24 + box.y + box.h);
    });

    for (const zone of contents) {
      if (index < zone.first || index > zone.last) continue;
      const rowAssets = zone.rows.get(level) ?? [];
      const fields = level === 0 ? rowAssets.filter((asset) => asset.origin === "seed") : [];
      const assets = level === 0 ? rowAssets.filter((asset) => asset.origin === "added") : rowAssets;
      const isExpanded = expanded.has(zone.name);
      const topEntries = level === TOP && zone === remoteZone ? remote : [];
      const zx = left + zone.lane * (laneWidth + laneGap);
      const span = index < LOWER_START ? Math.max(zone.span, zone.headSpan) : zone.span;
      const zw = span * (laneWidth + laneGap) - laneGap;
      const inner = zw - zonePad * 2;
      let rowY = ROW_PAD + (index === zone.first ? HEADER : 0);
      const placeGrid = (boxes: Box[], place: (box: Box, i: number) => void) => {
        boxes.forEach((box, i) => place({ ...box, x: zx + zonePad + box.x, y: y + rowY + box.y }, i));
        const last = boxes.at(-1);
        if (last) rowY += last.y + last.h + GRID_GAP;
      };

      placeGrid(grid(topEntries.length, inner, 104, 159, 26), (box, i) =>
        entries.push({ ...box, entry: topEntries[i], external: true }),
      );
      placeGrid(grid(assets.length, inner, minNodeWidth, maxNodeWidth, nodeHeight), (box, i) => {
        const asset = assets[i];
        cards.push({ ...box, asset, mini: false });
        anchors.set(asset.id, { ...box, zone: zone.name, level });
      });
      if (fields.length > 0) {
        const visibleFields = isExpanded ? fields : fields.filter((asset) => revealed.has(asset.id));
        const w = Math.min(inner, 100);
        const group = { x: zx + (zw - w) / 2, y: y + rowY, w, h: GROUP_HEIGHT };
        fieldGroups.push({ ...group, zone: zone.name, count: fields.length, expanded: isExpanded });
        for (const asset of fields) anchors.set(asset.id, { ...group, zone: zone.name, level });
        rowY += GROUP_HEIGHT + GRID_GAP;
        placeGrid(grid(visibleFields.length, inner, 46, 80, MINI_HEIGHT), (box, i) => {
          const asset = visibleFields[i];
          cards.push({ ...box, asset, mini: true });
          anchors.set(asset.id, { ...box, zone: zone.name, level });
        });
        if (!visibleFields.length) rowY += MINI_HEIGHT + GRID_GAP;
      }
      if (rowY > ROW_PAD + (index === zone.first ? HEADER : 0)) {
        bandHeight = Math.max(bandHeight, rowY + ROW_PAD - GRID_GAP);
      }
    }
    bands.push({ level, y, h: bandHeight });
    y += bandHeight;
  }

  const sideTop = bands[3].y;
  side.forEach((entry, index) => {
    const size = compact ? 21 : 25;
    entries.push({
      x: diagramRight + (rightPad - size) / 2,
      y: sideTop + (y - sideTop) * (index + 0.5) / side.length - size / 2,
      w: size,
      h: size,
      entry,
      external: false,
    });
  });
  for (const { entry, external, ...box } of entries) {
    anchors.set(entry.id, { ...box, level: external ? TOP : undefined });
  }

  const zones = contents.map(({ name, lane, span, headSpan, first, last }) => {
    const yy = bands[first].y + 5;
    return {
      name, first, last, lower: last >= LOWER_START,
      x: left + lane * (laneWidth + laneGap),
      y: yy,
      w: span * (laneWidth + laneGap) - laneGap,
      h: bands[last].y + bands[last].h - 5 - yy,
      head: headSpan > span ? {
        w: headSpan * (laneWidth + laneGap) - laneGap,
        bottom: bands[LOWER_START].y - 5,
      } : undefined,
    };
  }).sort((a, b) => a.first - b.first || a.x - b.x);

  return { width, height: y, railWidth, diagramRight, compact, bands, zones, cards, fieldGroups, entries, anchors };
}

export function zoneWidthAt(zone: Zone, y: number): number {
  return zone.head && y < zone.head.bottom + 5 ? zone.head.w : zone.w;
}

export function networkDropAt(layout: PurdueLayout, point: Point, currentArea: string): NetworkDrop | undefined {
  if (point.x < layout.railWidth + 5 || point.x >= layout.diagramRight) return undefined;
  const index = layout.bands.findIndex(({ y, h }) => point.y >= y && point.y < y + h);
  if (index < 0) return undefined;
  const band = layout.bands[index];
  const containsX = (zone: Zone) => point.x >= zone.x && point.x < zone.x + zoneWidthAt(zone, point.y);
  const occupied = layout.zones.filter(({ first, last }) => first <= index && index <= last);
  const zone = occupied.find(containsX)
    ?? (index >= LOWER_START ? layout.zones.find((zone) => zone.lower && containsX(zone)) : undefined);
  if (!zone && occupied.length > 0) return undefined;
  const x = zone?.x ?? layout.railWidth + 6;
  return {
    x,
    y: band.y + 6,
    w: zone ? zoneWidthAt(zone, point.y) : layout.diagramRight - x,
    h: band.h - 12,
    area: zone?.name ?? currentArea,
    level: band.level,
  };
}
