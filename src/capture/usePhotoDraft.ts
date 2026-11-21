/** Keep a bounded photo draft shared by the desktop card and phone form. */
import { useRef, useState } from "react";
import type { CaptureImage } from "@/pipeline/types";
import { MAX_CAPTURE_PHOTOS, prepareCaptureImage } from "./image";

export interface DraftPhoto {
  id: number;
  image: CaptureImage;
}

export function usePhotoDraft() {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const current = useRef<DraftPhoto[]>([]);
  const nextId = useRef(0);
  const pending = useRef<symbol | null>(null);

  function update(photos: DraftPhoto[]) {
    current.current = photos;
    setPhotos(photos);
  }

  function append(images: readonly CaptureImage[]) {
    update([...current.current, ...images.map((image) => ({ id: ++nextId.current, image }))]);
  }

  async function prepare(sources: readonly (File | HTMLVideoElement)[]) {
    if (pending.current || sources.length === 0) return;
    const room = MAX_CAPTURE_PHOTOS - current.current.length;
    if (room <= 0) {
      setError("Remove a photo to add another.");
      return;
    }

    const batch = Symbol();
    pending.current = batch;
    setPreparing(true);
    setError("");
    const images: CaptureImage[] = [];
    let skipped = false;
    for (const source of sources.slice(0, room)) {
      try {
        images.push(await prepareCaptureImage(source));
      } catch {
        skipped = true;
      }
      if (pending.current !== batch) return;
    }

    append(images);
    pending.current = null;
    setPreparing(false);
    if (skipped) setError("Could not read a photo. Try a JPEG or PNG.");
    else if (sources.length > room) setError("Up to three photos fit in a capture.");
  }

  function addPrepared(images: readonly CaptureImage[]) {
    if (pending.current || current.current.length + images.length > MAX_CAPTURE_PHOTOS) return false;
    append(images);
    setError("");
    return true;
  }

  function clear() {
    pending.current = null;
    update([]);
    setPreparing(false);
    setError("");
  }

  function remove(id: number) {
    update(current.current.filter((photo) => photo.id !== id));
    setError("");
  }

  return { photos, preparing, error, prepare, addPrepared, clear, remove };
}
