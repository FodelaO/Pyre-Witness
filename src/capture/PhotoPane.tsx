/** Pairs the desktop photo draft with a camera, phone or file picker. */
import type { ReactNode } from "react";
import { QrCode, Upload } from "lucide-react";
import CameraPreview from "./CameraPreview";
import { MAX_CAPTURE_PHOTOS } from "./image";
import PhotoStrip from "./PhotoStrip";
import type { usePhotoDraft } from "./usePhotoDraft";

export default function PhotoPane({ draft, cameraAttempt, phonePreview, onTogglePhone, onUpload, onRemove, children }: {
  draft: ReturnType<typeof usePhotoDraft>;
  cameraAttempt: number;
  phonePreview: ReactNode;
  onTogglePhone: () => void;
  onUpload: () => void;
  onRemove: (id: number) => void;
  children: ReactNode;
}) {
  const canAdd = !draft.preparing && draft.photos.length < MAX_CAPTURE_PHOTOS;

  return (
    <>
      {phonePreview ?? (
        <CameraPreview key={cameraAttempt} autoStart={cameraAttempt > 0} disabled={draft.preparing}
          canShoot={canAdd} onShot={(video) => void draft.prepare([video])} />
      )}
      <div className="pw-capture-photo-tools">
        <button type="button" onClick={onUpload} disabled={!canAdd}><Upload size={14} aria-hidden /> Upload</button>
        <button type="button" onClick={onTogglePhone} aria-expanded={!!phonePreview}><QrCode size={14} aria-hidden /> Phone</button>
        <span className="pw-capture-count" role="status" aria-label={draft.photos.length + " of " + MAX_CAPTURE_PHOTOS + " photos"}>
          {draft.photos.length}/{MAX_CAPTURE_PHOTOS}
        </span>
      </div>
      <div className="pw-capture-photo-rail">
        <PhotoStrip photos={draft.photos} onRemove={onRemove} disabled={draft.preparing} />
        <span className="pw-capture-photo-hint" role="status">{draft.preparing ? "Preparing…" : "Drop or paste"}</span>
      </div>
      {draft.error && <div className="pw-capture-field-error" role="alert">{draft.error}</div>}
      {children}
    </>
  );
}
