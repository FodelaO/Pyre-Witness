/** Serves the labeled, openly licensed photos used in the proof overview. */
import { DATASET_ROOT, loadDataset } from "../../../../../eval/dataset";
import { readDatasetImage } from "../../../../../eval/image";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { items } = await loadDataset();
  const sample = items.find((item) => item.id === id);
  if (sample?.input.kind !== "photo") return new Response("Image unavailable", { status: 404 });
  try {
    const { bytes, mimeType } = await readDatasetImage(DATASET_ROOT, sample.input.file);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": mimeType, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("Image unavailable", { status: 404 });
  }
}
