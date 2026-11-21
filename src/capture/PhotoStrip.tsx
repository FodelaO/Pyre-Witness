/** Three stable thumbnail slots with accessible remove controls. */
import Image from "next/image";
import { X } from "lucide-react";
import { MAX_CAPTURE_PHOTOS, captureImageUrl } from "./image";
import type { DraftPhoto } from "./usePhotoDraft";

export default function PhotoStrip({ photos, onRemove, disabled }: {
  photos: DraftPhoto[];
  onRemove: (id: number) => void;
  disabled: boolean;
}) {
  return (
    <ul className="pw-capture-thumbnails" aria-label="Capture photos">
      {Array.from({ length: MAX_CAPTURE_PHOTOS }, (_, index) => {
        const photo = photos[index];
        if (!photo) return <li key={`empty-${index}`} className="pw-capture-empty-thumb" aria-hidden="true" />;

        return (
          <li key={photo.id} className="pw-capture-thumbnail">
            <Image alt={`Photo ${index + 1}`} src={captureImageUrl(photo.image)} unoptimized fill sizes="80px" />
            <button type="button" aria-label={`Remove photo ${index + 1}`} title={`Remove photo ${index + 1}`}
              onClick={() => onRemove(photo.id)} disabled={disabled}>
              <X size={12} aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
