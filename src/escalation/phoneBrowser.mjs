/** Coordinates the standalone handset controls with the local call relay. */
import { callCommand, fetchDialTarget, listenToCall, randomHex } from "./connection.mjs";
import { PhoneAudio } from "./phoneAudio.mjs";

const page = document.querySelector(".pw-call");
if (page?.dataset.code) attachPhone(page);

function attachPhone(page) {
  const code = page.dataset.code;
  const keyName = `pw:escalation-pair:${code}`;
  let key = randomHex(16);
  try {
    key = sessionStorage.getItem(keyName) ?? key;
    sessionStorage.setItem(keyName, key);
  } catch { /* The open tab can use its in-memory key. */ }

  /** @type {import("./connection.mjs").CallConnection} */
  const connection = { code, key, role: "phone" };
  const audio = new PhoneAudio();
  const element = (id) => document.getElementById(id);
  const show = (id, visible) => { element(id).hidden = !visible; };
  const text = (id, value) => { element(id).textContent = value || ""; };
  const dial = element("dial");
  let snapshot;
  let targetVersion;
  let targetRequest = 0;
  let targetRetry;
  let stopListening;
  let foreground = !document.hidden;
  let awaitingSnapshot = true;
  let dialStarted = false;
  let expiry;
  let enabled = false;
  let connectionError = "";
  let operationError = "";
  let voice = "idle";
  let duration;
  let pending = "";

  function callStatus(call) {
    if (call?.approvedAt) return "Action approved";
    if (call?.acknowledgedAt) return "Acknowledged";
    if (call?.resolvedAt) return "Alert cleared";
    if (call?.answeredAt) return "Chief briefing";
    if (call && (call.dialedAt || dialStarted)) return "Call tapped";
    if (awaitingSnapshot) return connectionError ? "Call link unavailable" : "Connecting phone";
    if (call) return "Incoming call";
    if (snapshot) return "Ready for calls";
    return connectionError ? "Call link unavailable" : "Connecting phone";
  }

  function clearDialTarget() {
    clearTimeout(targetRetry);
    targetRequest++;
    targetVersion = undefined;
    dial.removeAttribute("href");
    text("dial-label", "");
  }

  function syncDialTarget() {
    const call = snapshot?.call;
    const version = call?.destinationVersion;
    if (!version || !foreground || awaitingSnapshot || dialStarted || connectionError || Date.now() >= snapshot.expiresAt) {
      clearDialTarget();
      return;
    }
    if (targetVersion === version) return;
    clearDialTarget();
    targetVersion = version;
    const request = targetRequest;
    void fetchDialTarget(connection, call.alert.id, version).then((target) => {
      if (request !== targetRequest || Date.now() >= snapshot?.expiresAt) return;
      if (!/^tel:\+[1-9]\d{7,14}$/.test(target.href) || typeof target.label !== "string") throw new Error("Invalid destination");
      dial.setAttribute("href", target.href);
      text("dial-label", target.label);
      operationError = "";
      render();
    }).catch(() => {
      if (request !== targetRequest) return;
      clearDialTarget();
      operationError = "Could not load the call destination. Check the phone link.";
      targetRetry = setTimeout(syncDialTarget, 1500);
      render();
    });
  }

  function render() {
    const call = snapshot?.call;
    const alert = call?.alert;
    const answered = !!call?.answeredAt;
    const terminalAt = call?.approvedAt ?? call?.acknowledgedAt ?? call?.resolvedAt;
    const ready = foreground && !awaitingSnapshot;
    const awaitingAnswer = !!call && ready && !answered && !terminalAt;
    const dialed = !!call && (call.dialedAt !== undefined || dialStarted);
    const ringing = awaitingAnswer && !dialed && !connectionError;
    const canDial = !!call && ready && !terminalAt && !dialed && dial.hasAttribute("href");
    const waiting = !!(call?.approvalRequestedAt && !call.approvalUnavailableAt && !terminalAt);
    const approvable = !!(alert?.canApprove && !call.approvalUnavailableAt);
    const ringerReady = enabled && audio.context?.state === "running";
    const loss = alert?.lossText ?? (alert?.loss == null ? "" : `$${alert.loss.toLocaleString("en-US")}`);

    page.dataset.ringing = String(ringing);
    page.dataset.terminal = String(!!terminalAt);
    const icon = terminalAt ? "check" : ringing ? "phone" : answered ? "headphones" : "bell";
    for (const symbol of element("signal").querySelectorAll("[data-icon]")) {
      symbol.toggleAttribute("hidden", symbol.dataset.icon !== icon);
    }
    text("caller", alert?.test ? "TEST SCENARIO · CHIEF" : alert?.kind === "simulation" ? "SIMULATION · CHIEF" : "CHIEF · LINE 3");
    text("headline", callStatus(call));
    show("where", !!alert);
    text("tag", alert?.tag ?? "Plant twin");
    text("room", alert?.room);
    show("room", !!alert?.room);
    show("severity", !!alert);
    show("loss-wrap", !!loss);
    text("loss", loss);
    text("finding", alert?.title);
    show("assumed", !!loss);
    show("keep-open", !!snapshot && !call);
    show("call-time", !!terminalAt);
    if (terminalAt) {
      const when = new Date(terminalAt);
      element("call-time").dateTime = when.toISOString();
      text("call-time", when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }
    show("connection-error", !!connectionError);
    text("connection-error", connectionError);
    show("operation-error", !!operationError);
    text("operation-error", operationError);

    show("enable", !!snapshot && ready && !call);
    element("enable").disabled = ringerReady;
    element("enable").querySelector("span").textContent = ringerReady ? "Ringer enabled" : "Enable ringer";
    show("dial", canDial);
    show("dial-receipt", dialed);
    show("incoming", awaitingAnswer);
    show("enable-incoming", !ringerReady && ringing);
    element("answer").classList.toggle("pw-call-primary", !canDial);
    element("answer").classList.toggle("pw-call-secondary", canDial);
    element("answer").disabled = pending === "answer";
    if (ringerReady && ringing && !pending) audio.ring();
    else audio.stopRing();

    show("briefing", answered);
    text("script", alert?.script);
    show("response", ready && !terminalAt);
    show("approve", approvable);
    show("action", approvable);
    text("action", alert && `Twin update · ${alert.action}`);
    show("approval-error", !!call?.approvalUnavailableAt);
    element("approve").disabled = element("acknowledge").disabled = waiting || !!pending;
    element("approve").querySelector("span").textContent = waiting ? "Waiting for desktop…" : "Approve action";

    show("generating", voice === "loading");
    show("audio-error", voice === "error");
    show("play", voice !== "loading");
    const durationText = duration === undefined ? "" : ` · ${Math.round(duration)} s`;
    const playLabel = voice === "playing" ? `Stop${durationText}`
      : voice === "finished" ? `Replay${durationText}` : voice === "error" ? "Retry audio" : "Play audio";
    text("play", playLabel);

  }

  async function send(type, id) {
    try {
      await callCommand(connection, { type, id });
      return true;
    } catch {
      operationError = "Could not update the call. Check the phone link.";
      render();
      return false;
    }
  }

  async function enableRinger() {
    try {
      await audio.enable();
      enabled = true;
      operationError = "";
    } catch { operationError = "Ringer unavailable. Keep this screen open."; }
    render();
  }

  async function play(alert) {
    voice = "loading";
    render();
    try {
      await audio.speak(alert.id, alert.script, (seconds) => {
        duration = seconds;
        void send("audio-generated", alert.id);
      }, () => { voice = "finished"; render(); });
      voice = "playing";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      voice = "error";
    }
    render();
  }

  async function answer() {
    const alert = snapshot?.call?.alert;
    if (!alert || pending) return;
    const unlock = audio.enable().catch(() => undefined);
    pending = "answer";
    operationError = "";
    render();
    const answered = await send("answer", alert.id);
    pending = "";
    render();
    if (answered) {
      await unlock;
      void play(alert);
    }
  }

  async function respond(type) {
    const alert = snapshot?.call?.alert;
    if (!alert || pending) return;
    pending = type;
    operationError = "";
    render();
    await send(type, alert.id);
    pending = "";
    render();
  }

  element("enable").addEventListener("click", enableRinger);
  element("enable-incoming").addEventListener("click", enableRinger);
  element("answer").addEventListener("click", answer);
  element("approve").addEventListener("click", () => void respond("approve"));
  element("acknowledge").addEventListener("click", () => void respond("acknowledge"));
  dial.addEventListener("click", (event) => {
    const alert = snapshot?.call?.alert;
    if (!alert || !event.isTrusted || !foreground || awaitingSnapshot || dialStarted
      || !dial.hasAttribute("href") || Date.now() >= snapshot.expiresAt) {
      event.preventDefault();
      return;
    }
    // Keep the native anchor navigation in this tap. The relay receipt can arrive separately.
    dialStarted = true;
    audio.stopRing();
    void send("dial", alert.id).then((sent) => {
      if (snapshot?.call?.alert.id !== alert.id) return;
      if (sent) clearDialTarget();
      else { dialStarted = false; syncDialTarget(); }
      render();
    });
  });
  element("play").addEventListener("click", () => {
    const alert = snapshot?.call?.alert;
    if (!alert) return;
    if (voice === "playing") {
      audio.stopSpeech();
      voice = "finished";
      render();
    } else void play(alert);
  });

  function onFrame(frame) {
    if (frame.call?.alert.id !== snapshot?.call?.alert.id) {
      audio.stopSpeech();
      clearDialTarget();
      dialStarted = false;
      voice = "idle";
      duration = undefined;
      operationError = "";
      pending = "";
    }
    connectionError = "";
    awaitingSnapshot = false;
    snapshot = frame;
    expiry ??= setTimeout(() => {
      snapshot = undefined;
      connectionError = "Call link expired. Open a fresh QR.";
      clearDialTarget();
      render();
    }, Math.max(0, frame.expiresAt - Date.now()));
    syncDialTarget();
    render();
  }

  function onConnectionError(message) {
    connectionError = message;
    awaitingSnapshot = true;
    clearDialTarget();
    render();
  }

  function resume() {
    if (document.hidden) return;
    foreground = true;
    awaitingSnapshot = true;
    stopListening?.();
    clearDialTarget();
    render();
    stopListening = listenToCall(connection, onFrame, onConnectionError, 1500);
  }

  function pause() {
    foreground = false;
    awaitingSnapshot = true;
    stopListening?.();
    stopListening = undefined;
    clearDialTarget();
    render();
  }

  render();
  if (foreground) resume();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else if (!foreground) resume();
  });
  window.addEventListener("online", resume);
  window.addEventListener("pagehide", (event) => {
    pause();
    if (!event.persisted) { clearTimeout(expiry); audio.close(); }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && !foreground) resume();
  });
}
