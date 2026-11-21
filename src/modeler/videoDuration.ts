/** Reads duration from MP4/MOV movie headers or seekable WebM segment metadata. */

function isoBox(view: DataView, start: number, end: number, wanted: string) {
  for (let offset = start; offset + 8 <= end;) {
    let size = view.getUint32(offset);
    const kind = String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset + 4, 4));
    let header = 8;
    if (size === 1) {
      header = 16;
      if (offset + header > end) return;
      size = Number(view.getBigUint64(offset + 8));
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || size > end - offset) return;
    if (kind === wanted) return { start: offset + header, end: offset + size };
    offset += size;
  }
}

function isoDuration(view: DataView): number | undefined {
  const movie = isoBox(view, 0, view.byteLength, "moov");
  if (!movie) return;
  const header = isoBox(view, movie.start, movie.end, "mvhd");
  if (!header || header.end <= header.start) return;
  const version = view.getUint8(header.start);
  if (version === 0 && header.end - header.start >= 20) {
    return view.getUint32(header.start + 16) / view.getUint32(header.start + 12);
  }
  if (version === 1 && header.end - header.start >= 32) {
    return Number(view.getBigUint64(header.start + 24)) / view.getUint32(header.start + 20);
  }
}

function ebmlInteger(view: DataView, offset: number, end: number, isSize: boolean) {
  if (offset >= end) return;
  const head = view.getUint8(offset);
  if (head === 0) return;
  const width = 8 - Math.floor(Math.log2(head));
  if (offset + width > end || (!isSize && width > 4)) return;
  let value = isSize ? head & (0xff >> width) : head;
  let unknown = isSize && value === (0xff >> width);
  for (let index = 1; index < width; index += 1) {
    const byte = view.getUint8(offset + index);
    value = value * 256 + byte;
    unknown &&= byte === 255;
  }
  return { value, end: offset + width, unknown };
}

function* ebmlElements(view: DataView, start: number, end: number) {
  for (let offset = start; offset < end;) {
    const id = ebmlInteger(view, offset, end, false);
    if (!id) return;
    const size = ebmlInteger(view, id.end, end, true);
    if (!size) return;
    const next = size.unknown ? end : size.end + size.value;
    if (next > end) return;
    yield { id: id.value, start: size.end, end: next };
    offset = next;
  }
}

function ebmlElement(view: DataView, start: number, end: number, wanted: number) {
  for (const element of ebmlElements(view, start, end)) {
    if (element.id === wanted) return element;
  }
}

function webmDuration(view: DataView): number | undefined {
  if (view.byteLength < 4 || view.getUint32(0) !== 0x1a45dfa3) return;
  const segment = ebmlElement(view, 0, view.byteLength, 0x18538067);
  if (!segment) return;
  const info = ebmlElement(view, segment.start, segment.end, 0x1549a966);
  if (!info) return;
  let scale = 1_000_000;
  let duration: number | undefined;
  for (const { id, start, end } of ebmlElements(view, info.start, info.end)) {
    if (id === 0x2ad7b1 && end - start <= 8) {
      scale = 0;
      for (let offset = start; offset < end; offset += 1) scale = scale * 256 + view.getUint8(offset);
    }
    if (id === 0x4489 && end - start === 4) duration = view.getFloat32(start);
    if (id === 0x4489 && end - start === 8) duration = view.getFloat64(start);
  }
  if (duration !== undefined) return duration * scale / 1_000_000_000;
}

export function videoDuration(bytes: ArrayBuffer, mime: string): number | undefined {
  const view = new DataView(bytes);
  const seconds = mime === "video/webm" ? webmDuration(view) : isoDuration(view);
  return seconds !== undefined && Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}
