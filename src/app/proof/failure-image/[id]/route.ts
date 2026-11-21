/** Serves images belonging to failure cases in the latest public proof report. */
import path from "node:path";
import { readDatasetImage } from "../../../../../eval/image";
import { readProofReport } from "@/proof/reportSource";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const proof = await readProofReport();
  const file = proof.state === "ready" ? proof.report.failures.find((item) => item.id === id)?.file : undefined;
  if (!file) return new Response("Image unavailable", { status: 404 });

  try {
    const image = await readDatasetImage(path.join(process.cwd(), "eval", "dataset"), file);
    return new Response(new Uint8Array(image.bytes), {
      headers: { "Content-Type": image.mimeType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Image unavailable", { status: 404 });
  }
}
