/** Standalone pipeline lens review on the Line 3 digital twin. */
import type { Metadata } from "next";
import LensReview from "@/layers/LensReview";

export const metadata: Metadata = { title: "Pipeline Lens · Pyre Witness" };

export default function LensPage() {
  return <LensReview />;
}
