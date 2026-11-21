/** The handset UI is a standalone HTML document, with no Next development runtime. */
const paths = {
  shield: '<path d="M12 2 4 5v6c0 6 3 9 8 11 5-2 8-5 8-11V5l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  broadcast: '<circle cx="12" cy="12" r="1.5"/><path d="M8 8a5.7 5.7 0 0 0 0 8m8 0a5.7 5.7 0 0 0 0-8M5 5a9.9 9.9 0 0 0 0 14m14 0a9.9 9.9 0 0 0 0-14"/>',
  phone: '<path d="M6 2h3l2 5-2 2c1 3 3 5 6 6l2-2 5 2v3c0 2-1 3-3 3C11 20 4 13 3 5c0-2 1-3 3-3Z"/>',
  bell: '<path d="M17 9a5 5 0 0 0-10 0c0 5-3 5-3 7h16c0-2-3-2-3-7ZM10 20a2 2 0 0 0 4 0"/>',
  headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2M3 14h4v6H5l-2-2zm18 0h-4v6h2l2-2z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  audio: '<path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4"/>',
} as const;

function icon(name: keyof typeof paths, size: number, hidden = false) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" data-icon="${name}"${hidden ? " hidden" : ""}>${paths[name]}</svg>`;
}

export function phoneMarkup(code: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#070b10">
  <meta name="robots" content="noindex,nofollow">
  <title>On-call · Pyre Witness</title>
  <link rel="stylesheet" href="/call/assets/phoneCall.css">
  <script type="module" src="/call/assets/phoneBrowser.mjs"></script>
</head>
<body>
<main class="pw-call" data-code="${code}">
  <div class="pw-call-inner">
    <header class="pw-call-head">
      <span>${icon("shield", 20)} PYRE WITNESS</span><span>${icon("broadcast", 14)} On-call line</span>
    </header>
    <section class="pw-call-hero" aria-label="Call status">
      <div class="pw-call-signal" id="signal">${icon("bell", 31)}${icon("phone", 31, true)}${icon("headphones", 31, true)}${icon("check", 31, true)}</div>
      <div class="pw-call-caller" id="caller">CHIEF · LINE 3</div>
      <h1 id="headline" aria-live="polite">${code ? "Connecting phone" : "Call link unavailable"}</h1>
      <div class="pw-call-where" id="where" hidden><strong id="tag"></strong><span id="room"></span></div>
      <div class="pw-call-severity" id="severity" hidden>
        <span id="loss-wrap"><strong id="loss"></strong> est.</span><span id="finding"></span>
      </div>
      <div class="pw-call-assumed" id="assumed" hidden>assumed (simulated plant)</div>
      <div class="pw-call-assumed" id="keep-open" hidden>Keep this tab open.</div>
      <time class="pw-call-time" id="call-time" hidden></time>
    </section>
    <div class="pw-call-notice" id="connection-error" role="status" hidden></div>
    <div class="pw-call-notice" id="operation-error" role="status" hidden></div>
    <button class="pw-call-button pw-call-primary" id="enable" type="button" hidden>${icon("bell", 20)} <span>Enable ringer</span></button>
    <a class="pw-call-button pw-call-primary pw-call-dial" id="dial" hidden>${icon("phone", 21)}<span id="dial-label"></span></a>
    <div class="pw-call-muted pw-call-dial-receipt" id="dial-receipt" hidden>Call placed from the paired phone · no carrier integration</div>
    <div class="pw-call-incoming-actions" id="incoming" hidden>
      <button class="pw-call-button pw-call-secondary" id="answer" type="button">${icon("headphones", 20)} Answer</button>
      <button class="pw-call-quiet" id="enable-incoming" type="button">${icon("bell", 16)} Enable ringer</button>
    </div>
    <section class="pw-call-briefing" id="briefing" aria-label="Chief briefing and response" hidden>
      <div class="pw-call-briefing-head">
        <span>${icon("audio", 17)} Chief audio</span>
        <span class="pw-call-muted" id="generating" role="status" hidden>Generating…</span>
        <button type="button" class="pw-call-quiet" id="play">Play audio</button>
      </div>
      <div class="pw-call-muted" id="audio-error" role="status" hidden>Chief audio unavailable. Read the script.</div>
      <div class="pw-call-script" id="script"></div>
      <div class="pw-call-response" id="response">
        <button class="pw-call-button pw-call-primary" id="approve" type="button">${icon("shield", 19)} <span>Approve action</span></button>
        <span class="pw-call-action" id="action"></span>
        <div class="pw-call-notice" id="approval-error" role="status" hidden>The proposed action changed on the desktop.</div>
        <button class="pw-call-button pw-call-secondary" id="acknowledge" type="button">${icon("check", 20)} Acknowledge</button>
      </div>
    </section>
    <noscript><div class="pw-call-notice">Enable JavaScript to connect the call.</div></noscript>
  </div>
</main>
</body>
</html>`;
}
