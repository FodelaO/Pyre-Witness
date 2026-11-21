/** Own one browser-session pairing and replay its latest phone upload on reconnect. */
import { useEffect, useEffectEvent, useState } from "react";
import { HandoffConnectionError, readHandoffStream, type HandoffCredentials } from "@/handoff/streamClient";
import { HANDOFF_CODE_ALPHABET, isHandoffCode, type HandoffInfo, type HandoffPacket } from "@/handoff/types";

export type PhonePairingState =
  | { status: "idle" | "connecting" }
  | { status: "ready"; code: string; info: HandoffInfo }
  | { status: "error"; message: string };

const PAIRING_KEY = "pw-phone-handoff";
type Pairing = HandoffCredentials & { expiresAt: number; lastPacket: string };

function savedPairing(): Pairing | undefined {
  try {
    const pair: Partial<Pairing> | null = JSON.parse(sessionStorage.getItem(PAIRING_KEY) ?? "null");
    if (pair && typeof pair.code === "string" && isHandoffCode(pair.code)
      && typeof pair.key === "string" && /^[a-f0-9]{32}$/.test(pair.key)
      && typeof pair.expiresAt === "number" && pair.expiresAt > Date.now()
      && typeof pair.lastPacket === "string") return pair as Pairing;
  } catch { /* A tab without storage can still receive photos. */ }
}

function rememberPairing(pair?: Pairing) {
  try {
    if (pair) sessionStorage.setItem(PAIRING_KEY, JSON.stringify(pair));
    else sessionStorage.removeItem(PAIRING_KEY);
  } catch { /* Pairing continues in memory when storage is unavailable. */ }
}

function createPairing(): Pairing {
  const bytes = crypto.getRandomValues(new Uint8Array(22));
  const code = Array.from(bytes.subarray(0, 6), (byte) => HANDOFF_CODE_ALPHABET[byte % HANDOFF_CODE_ALPHABET.length]).join("");
  const key = Array.from(bytes.subarray(6), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { code, key, expiresAt: 0, lastPacket: "" };
}

export function usePhoneHandoff(onPhotos: (packet: HandoffPacket) => void) {
  const [credentials, setCredentials] = useState<Pairing | null>(null);
  const [state, setState] = useState<PhonePairingState>({ status: "idle" });
  const receive = useEffectEvent(onPhotos);

  useEffect(() => {
    if (!credentials) return;
    const controller = new AbortController();
    const { signal } = controller;

    async function connect(pair: Pairing) {
      let { expiresAt, lastPacket } = pair;

      try {
        const response = await fetch("/api/handoff/info", { cache: "no-store", signal });
        if (!response.ok) throw new Error("Could not find the local network.");
        const info = await response.json() as HandoffInfo;
        if (!info.addresses.length) throw new Error("No local network address. Connect the laptop to Wi-Fi.");

        while (!signal.aborted) {
          let terminal = false;
          try {
            await readHandoffStream(pair, signal, (frame) => {
              if (signal.aborted) return false;
              if (frame.type === "ready") {
                expiresAt = frame.expiresAt;
                rememberPairing({ ...pair, expiresAt, lastPacket });
                setState({ status: "ready", code: pair.code, info });
              } else if (frame.type === "photos") {
                if (frame.packet.id !== lastPacket) {
                  lastPacket = frame.packet.id;
                  rememberPairing({ ...pair, expiresAt, lastPacket });
                  receive(frame.packet);
                }
              } else {
                terminal = true;
                rememberPairing();
                setState({ status: "error", message: frame.type === "expired" ? "Phone link expired." : "Phone pairing closed." });
                return false;
              }
              return true;
            });
          } catch (error) {
            if (!expiresAt || error instanceof HandoffConnectionError) throw error;
          }
          if (terminal || signal.aborted) return;
          if (!expiresAt) throw new Error("Could not connect phone pairing.");
          if (Date.now() >= expiresAt) {
            rememberPairing();
            setState({ status: "error", message: "Phone link expired." });
            return;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        if (!signal.aborted) {
          if (pair.expiresAt && error instanceof HandoffConnectionError && error.status === 409) {
            rememberPairing();
            setState({ status: "connecting" });
            setCredentials(createPairing());
            return;
          }
          setState({ status: "error", message: error instanceof Error ? error.message : "Could not connect phone pairing." });
        }
      }
    }

    void connect(credentials);
    return () => controller.abort();
  }, [credentials]);

  function start() {
    if (state.status === "ready" || state.status === "connecting") return;
    setState({ status: "connecting" });
    setCredentials(savedPairing() ?? createPairing());
  }

  return { state, start };
}
