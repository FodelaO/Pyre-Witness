/** Review route for all of the Pyre Witness equipment symbols. */
import type { Metadata } from "next";
import Gallery from "@/equipment/Gallery";

export const metadata: Metadata = { title: "Equipment gallery · Pyre Witness" };

export default function GalleryPage() {
  return <Gallery />;
}
