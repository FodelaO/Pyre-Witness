/** Renders small, linked original capture previews and truthful text or URL samples. */
import Image from "next/image";
import { FileText, Link2 } from "lucide-react";

export function EvidenceThumb({ id, kind, label, text, source, credit }: {
  id: string; kind: "photo" | "text" | "link"; label: string; text?: string; source?: string; credit?: string;
}) {
  if (kind === "photo") return (
    <a className="pw-judge-thumb pw-judge-photo" href={source || `/proof/capture-image/${encodeURIComponent(id)}`}
      title={credit ? `${label} · ${credit}` : label} aria-label={`Source photo for ${label}`}>
      <Image src={`/proof/capture-image/${encodeURIComponent(id)}`} alt={label} fill unoptimized sizes="(max-width: 640px) 28vw, 100px" />
    </a>
  );
  const Tag = source ? "a" : "div";
  const Icon = kind === "link" ? Link2 : FileText;
  return <Tag href={source || undefined} className="pw-judge-thumb pw-judge-input-sample" title={text ?? label}>
    <Icon size={14} aria-hidden /><span>{text ?? label}</span>
  </Tag>;
}
