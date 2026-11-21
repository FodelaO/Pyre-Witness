/** Renders the light inline emphasis agents write (bold, italic, code) as text, never as raw markers or HTML. */
import type { ReactNode } from "react";

export type InlineSegment = { kind: "text" | "strong" | "em" | "code"; text: string };

// Bold first so `**x**` is never read as two italics; underscores stay literal (tags like plc_cabinet).
const INLINE = /\*\*(?=\S)([^*\n]*?\S)\*\*|`([^`\n]+)`|\*(?=\S)([^*\n]*?\S)\*/g;

export function inlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) });
    const [, strong, code, em] = match;
    segments.push(strong !== undefined ? { kind: "strong", text: strong }
      : code !== undefined ? { kind: "code", text: code } : { kind: "em", text: em });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

export default function ChatText({ text }: { text: string }) {
  return inlineSegments(text).map(({ kind, text }, index): ReactNode => {
    if (kind === "strong") return <strong key={index}>{text}</strong>;
    if (kind === "em") return <em key={index}>{text}</em>;
    if (kind === "code") return <code key={index}>{text}</code>;
    return text;
  });
}
