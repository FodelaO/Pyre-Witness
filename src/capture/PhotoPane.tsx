/** Pair the live preview and file picker with the desktop photo draft. */
import { useRef, type ReactNode } from "react";
import { Camera, Smartphone, Upload } from "lucide-react";
import CameraPreview from "./CameraPreview";
import { MAX_CAPTURE_PHOTOS } from "./image";
import PhotoStrip from "./PhotoStrip";
import type { usePhotoDraft } from "./usePhotoDraft";

export default function PhotoPane({ draft, busy, phonePreview, onTogglePhone, onRemove, children }: {
  draft: ReturnType<typeof usePhotoDraft>;
  busy: boolean;
  phonePreview: ReactNode;
  onTogglePhone: () => void;
  onRemove: (id: number) => void;
  children: ReactNode;
}) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const canAdd = !busy && !draft.preparing && draft.photos.length < MAX_CAPTURE_PHOTOS;

  return (
    <>
      {busy ? <div className="pw-capture-preview" aria-hidden="true"><Camera size={20} /></div> : phonePreview ?? (
        <CameraPreview disabled={draft.preparing} canShoot={canAdd} onShot={(video) => void draft.prepare([video])} />
      )}
      <div className="pw-capture-photo-tools">
        <input type="file" ref={uploadRef} accept="image/*" capture="environment" multiple hidden disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (!busy) void draft.prepare(files);
          }} />
        <button type="button" onClick={() => uploadRef.current?.click()} disabled={!canAdd}>
          <Upload size={14} aria-hidden="true" /> Upload
        </button>
        <button type="button" onClick={onTogglePhone} disabled={busy} aria-expanded={!!phonePreview}>
          <Smartphone size={14} aria-hidden="true" /> Phone
        </button>
        <span className="pw-capture-count" role="status" aria-label={`${draft.photos.length} of ${MAX_CAPTURE_PHOTOS} photos`}>
          {draft.photos.length}/{MAX_CAPTURE_PHOTOS}
        </span>
      </div>
      <div className="pw-capture-photo-rail">
        <PhotoStrip photos={draft.photos} onRemove={onRemove} disabled={busy || draft.preparing} />
        <span className="pw-capture-photo-hint" role="status">{draft.preparing ? "Preparing…" : "Drop or paste"}</span>
      </div>
      {draft.error && <div className="pw-capture-field-error" role="alert">{draft.error}</div>}
      {children}
    </>
  );
}
