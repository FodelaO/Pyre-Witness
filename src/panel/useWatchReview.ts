/** Coordinates the watch shortcut with the review tabs and responsive drawer. */
"use client";

import { useState } from "react";
import type { LensMode } from "@/layers/lensStore";

export function useWatchReview(initialMode: LensMode) {
  const [watchOpen, setWatchOpen] = useState(initialMode === "data");
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [watchReveal, setWatchReveal] = useState(0);

  function toggleShortcut({ narrow, drawerOpen, captureOpen }: { narrow: boolean; drawerOpen: boolean; captureOpen: boolean }) {
    const open = !watchOpen || captureOpen || (narrow && !drawerOpen);
    if (open) setWatchReveal((n) => n + 1);
    setReviewsOpen(open);
    setWatchOpen(open);
    return { open, drawerOpen: open && narrow };
  }

  return { watchOpen, setWatchOpen, reviewsOpen, setReviewsOpen, watchReveal, toggleShortcut };
}
