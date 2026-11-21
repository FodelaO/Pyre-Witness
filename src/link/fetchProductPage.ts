/**
 * STUB — server-side product page fetch for link captures. Implemented by the link-fetch task.
 * Must stay server-only (never import from client components).
 */
import type { LinkSnapshot } from "@/pipeline/types";

export async function fetchProductPage(url: string): Promise<LinkSnapshot> {
  void url;
  throw new Error("Product link fetch is not implemented yet");
}
