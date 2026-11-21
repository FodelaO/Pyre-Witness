/** Standalone review of the live crew and transcript on the production plant floor. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import CrewReview from "./CrewReview";
import "@/shell/instruments.css";
import "@/floor/floor.css";
import "@/layers/lens.css";
import "@/layers/dataLayers.css";
import "@/crew/crew.css";
import "./crewReview.css";

export const metadata: Metadata = { title: "Crew Review · Pyre Witness" };

const reviewSheets = [
  "src/app/globals.css", "src/shell/instruments.css", "src/floor/floor.css",
  "src/layers/lens.css", "src/layers/dataLayers.css", "src/crew/crew.css",
  "src/crew/crewDock.css", "src/crew/crewActivityFeed.css", "src/transcript/transcript.css",
  "src/app/crew-review/crewReview.css",
];

export default function CrewReviewPage() {
  // During concurrent dev edits, Tailwind can serve another sheet under a cached CSS URL.
  // Render the same plain CSS for this review route so a bad dev chunk cannot hide the crew.
  const css = process.env.NODE_ENV === "development"
    ? reviewSheets.map((file) => readFileSync(join(process.cwd(), file), "utf8").replace(/^@import [^\n]+;\s*/gm, "")).join("\n")
    : null;
  return <>{css && <style>{css}</style>}<CrewReview /></>;
}
