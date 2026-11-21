/** Serve the phone sender over LAN without a Next development socket. */
import { CAPTURE_JPEG_QUALITY, CAPTURE_LONG_EDGE, MAX_CAPTURE_PHOTOS } from "@/capture/image";
import { HANDOFF_NOTE_MAX, isHandoffCode } from "@/handoff/types";

export function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("s")?.toUpperCase() ?? "";
  const code = isHandoffCode(value) ? value : "";

  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#070b10">
  <meta name="robots" content="noindex,nofollow">
  <title>Send photos · Pyre Witness</title>
  <link rel="stylesheet" href="/capture/assets/phone.css">
  <script type="module" src="/capture/assets/phone.mjs"></script>
</head>
<body>
  <main class="pw-phone-viewport">
    <section class="pw-phone-panel" data-code="${code}" data-max-photos="${MAX_CAPTURE_PHOTOS}"
      data-long-edge="${CAPTURE_LONG_EDGE}" data-quality="${CAPTURE_JPEG_QUALITY}">
      <header class="pw-phone-header">
        <div><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3l4 7M4 8l8 0M4 16l4-7M12 21l-4-7m12 2h-8m8-8-4 7"/></svg> Pyre Witness</div>
        <h1>Send photos</h1>
      </header>
      ${code ? `<form class="pw-phone-form">
        <div class="pw-phone-actions">
          <input id="phone-camera" type="file" accept="image/*" capture="environment" hidden disabled>
          <input id="phone-library" type="file" accept="image/*" multiple hidden disabled>
          <button id="take-photo" type="button" disabled>
            <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></svg>
            Take photo
          </button>
          <button id="choose-photos" type="button" disabled>
            <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 5"/><circle cx="15" cy="8" r="1"/></svg>
            Choose photos
          </button>
        </div>
        <div class="pw-phone-photos">
          <ul aria-label="Capture photos"></ul>
          <span id="photo-count" role="status">0 / ${MAX_CAPTURE_PHOTOS}</span>
        </div>
        <label class="pw-phone-note">
          <span>Note <span class="pw-phone-optional">optional</span></span>
          <textarea name="note" rows="2" maxlength="${HANDOFF_NOTE_MAX}" disabled></textarea>
        </label>
        <p id="send-error" class="pw-phone-error" role="alert" hidden></p>
        <button id="send-photos" type="submit" class="pw-phone-send" disabled>
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 8 16l-5-5L22 2 13 21l-5-5"/></svg>
          <span>Send to laptop</span>
        </button>
      </form>
      <div class="pw-phone-sent" role="status" hidden>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>
        <p>Continue on the laptop.</p>
        <button id="send-more" type="button">Send more</button>
      </div>
      <noscript><p class="pw-phone-status">Enable JavaScript to send photos.</p></noscript>` :
        '<p class="pw-phone-status">Scan the capture QR code on the laptop.</p>'}
    </section>
  </main>
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}
