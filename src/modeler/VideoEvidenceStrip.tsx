/** Creates optional thumbnails from timestamped frames in the local upload. */
"use client";

import { useEffect, useState } from "react";
import { citedSeconds } from "./observations";
import type { ObservedItem } from "./types";

interface Frame {
  locator: string;
  image: string;
}

function waitForMedia(video: HTMLVideoElement, event: "loadeddata" | "seeked", signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    function finish(error?: unknown) {
      signal.removeEventListener("abort", aborted);
      video.removeEventListener(event, ready);
      video.removeEventListener("error", failed);
      if (error) reject(error);
      else resolve();
    }
    const ready = () => finish();
    const failed = () => finish(new Error("Video could not be decoded."));
    const aborted = () => finish(signal.reason);
    video.addEventListener(event, ready, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
  });
}

export function VideoEvidenceStrip({ file, items }: { file: File; items: ObservedItem[] }) {
  const [frames, setFrames] = useState<Frame[]>([]);
  useEffect(() => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(9_000)]);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const locators = [...new Set(items.flatMap(({ evidence }) => evidence.map(({ locator }) => locator)))].sort().slice(0, 6);

    async function capture() {
      if (!ctx) return;
      const loaded = waitForMedia(video, "loadeddata", signal);
      video.src = url;
      await loaded;
      if (!video.videoWidth || !video.videoHeight) return;
      canvas.width = 144;
      canvas.height = Math.max(1, Math.round(144 * video.videoHeight / video.videoWidth));
      for (const locator of locators) {
        const seconds = citedSeconds(locator);
        if (seconds === undefined || seconds >= video.duration) continue;
        signal.throwIfAborted();
        if (Math.abs(video.currentTime - seconds) > 0.01) {
          const seeked = waitForMedia(video, "seeked", signal);
          video.currentTime = seconds;
          await seeked;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL("image/jpeg", 0.8);
        setFrames((prior) => [...prior, { locator, image }]);
      }
    }
    void capture().catch(() => {});
    return () => {
      controller.abort();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
  }, [file, items]);

  if (!frames.length) return null;
  return (
    <ul className="pw-model-frames" aria-label="Cited video frames">
      {frames.map(({ locator, image }) => (
        <li key={locator}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Frame sampled from this browser's local file. */}
          <img src={image} alt={`Walkthrough frame at ${locator}`} />
          <span className="pw-mono">{locator}</span>
        </li>
      ))}
    </ul>
  );
}
