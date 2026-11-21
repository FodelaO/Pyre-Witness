/** Standalone review route for the optional 3D view of the live twin (same stores as the app). */
import type { Metadata } from "next";
import Review3D from "./Review3D";

export const metadata: Metadata = { title: "3D View · Pyre Witness" };

export default function View3DPage() {
  return <Review3D />;
}
