/** Manages held microphone turns, live playback, tool calls, and context refresh. */
import type { FunctionResponse, LiveServerMessage, Transcription } from "@google/genai";
import { setLiveAudioBusy } from "./briefings";
import { actForChief, readChiefSnapshot } from "./chiefActions";
import { buildVoiceContext } from "./context";
import { audioBase64, PcmPlayback } from "./liveAudio";
import { openChiefLink, type ChiefLink } from "./liveWire";
import { microphoneError, openMicrophone, type MicBlock, type Microphone } from "./microphone";

export type TalkPhase = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface TalkStatus {
  phase: TalkPhase;
  level: number;
  transcript: string;
  speaker: "Chief" | "You";
  error: string;
}

interface Turn {
  held: boolean;
  captureFinished: boolean;
  started: boolean;
  ended: boolean;
  interrupted: boolean;
  abort: AbortController;
  mic?: Microphone;
  blocks: MicBlock[];
  runId: string | null;
  input: string;
  output: string;
  tools: Map<string, FunctionResponse>;
  cancelled: Set<string>;
}

function appendText(previous: string, transcription: Transcription): string {
  const text = transcription.text ?? "";
  if (!text || previous.endsWith(text)) return previous;
  if (text.startsWith(previous)) return text.slice(-1_200);
  const space = /\p{L}|\p{N}/u.test(previous.slice(-1)) && /\p{L}|\p{N}/u.test(text[0]) ? " " : "";
  return `${previous}${space}${text}`.slice(-1_200);
}

export class TalkSession {
  private audio?: AudioContext;
  private output?: PcmPlayback;
  private link?: ChiefLink;
  private connection?: AbortController;
  private turn?: Turn;
  private replies: Turn[] = [];
  private lastContext = "";
  private contextTimer?: number;
  private idleTimer?: number;
  private holdTimer?: number;
  private replyTimer?: number;
  private disposed = false;

  constructor(private readonly update: (status: Partial<TalkStatus>) => void) {}

  get engaged() { return !!this.turn || !!this.output?.playing; }

  hold() {
    if (this.disposed || this.turn?.held) return;
    if (this.turn && !this.turn.captureFinished) {
      this.turn.mic?.cancel();
      this.finishCapture(this.turn);
    }
    this.output?.stop();
    this.clearIdle();
    this.turn = {
      held: true, captureFinished: false, started: false, ended: false, interrupted: false,
      abort: new AbortController(), blocks: [], runId: readChiefSnapshot().run.runId,
      input: "", output: "", tools: new Map(), cancelled: new Set(),
    };
    const turn = this.turn;
    this.update({ phase: "connecting", level: 0, transcript: "", error: "" });
    setLiveAudioBusy(true);
    try {
      const audio = this.audio ??= new AudioContext();
      this.output ??= new PcmPlayback(audio, () => this.syncPhase());
      this.unlockAudio();
      this.connect();
      this.holdTimer = window.setTimeout(() => this.release(), 30_000);
      void openMicrophone(audio, turn.abort.signal, (block) => this.capture(turn, block), () => {
        if (this.turn === turn && turn.held) this.cancel("The microphone disconnected. Hold to try again.");
      }).then((mic) => {
        if (this.turn !== turn || !turn.held) { mic.cancel(); return; }
        turn.mic = mic;
        this.syncPhase();
      }, (error: unknown) => {
        if (this.turn === turn && !turn.abort.signal.aborted) this.cancel(microphoneError(error));
      });
    } catch {
      this.cancel("This browser could not start Chief audio.");
    }
  }

  unlockAudio() {
    if (this.audio && this.audio.state !== "running") {
      void this.audio.resume().catch(() => {
        if (this.engaged) this.cancel("This browser blocked audio. Hold to try again.");
      });
    }
  }

  release() {
    const turn = this.turn;
    if (!turn?.held) return;
    turn.held = false;
    window.clearTimeout(this.holdTimer);
    this.update({ level: 0 });
    if (turn.mic) {
      this.syncPhase();
      void turn.mic.finish().then(() => this.finishCapture(turn));
    } else {
      this.finishCapture(turn);
    }
  }

  private finishCapture(turn: Turn) {
    if (this.turn !== turn || turn.captureFinished) return;
    turn.captureFinished = true;
    turn.abort.abort();
    if (!turn.started && !turn.blocks.length) {
      this.turn = undefined;
      this.syncPhase();
    } else {
      this.flushTurn();
    }
  }

  private capture(turn: Turn, block: MicBlock) {
    if (this.turn !== turn || turn.captureFinished) return;
    if (turn.held) this.update({ level: Math.min(1, block.level * 5) });
    if (turn.blocks.length >= 250) {
      this.cancel("Gemini Live is taking too long to connect. Hold to try again.");
      return;
    }
    turn.blocks.push(block);
    if (this.link) this.flushTurn();
  }

  private connect() {
    if (this.connection) return;
    const connection = new AbortController();
    this.connection = connection;
    void openChiefLink(connection.signal, (event) => this.receive(event), (reason) => {
      if (this.connection === connection) this.cancel(this.engaged ? reason : "");
    }).then((link) => {
      if (this.connection !== connection) { link.close(); return; }
      this.link = link;
      this.sendContext(true);
      this.flushTurn();
    }).catch((error: unknown) => {
      if (this.connection === connection) this.cancel(error instanceof Error ? error.message : "Chief could not connect.");
    });
  }

  refresh() {
    if (!this.link || this.turn || this.replies.length || this.contextTimer !== undefined) return;
    this.contextTimer = window.setTimeout(() => {
      this.contextTimer = undefined;
      if (!this.turn && !this.replies.length) {
        try { this.sendContext(); } catch { this.cancel(); }
      }
    }, 120);
  }

  private sendContext(initial = false) {
    if (!this.link) return;
    const snapshot = JSON.stringify(buildVoiceContext(readChiefSnapshot()));
    if (!initial && snapshot === this.lastContext) return;
    this.link.send({ clientContent: {
      turns: [{ role: "user", parts: [{ text: `PLANT_SNAPSHOT\n${snapshot}` }] }],
      turnComplete: initial,
    } });
    this.lastContext = snapshot;
  }

  private flushTurn() {
    const { link, turn } = this;
    if (!link || !turn || turn.ended) { this.syncPhase(); return; }
    try {
      if (!turn.started && turn.blocks.length) {
        this.sendContext();
        link.send({ realtimeInput: { activityStart: {} } });
        turn.started = true;
      }
      for (const { pcm, sampleRate } of turn.blocks) {
        link.send({ realtimeInput: { audio: { data: audioBase64(pcm), mimeType: `audio/pcm;rate=${sampleRate}` } } });
      }
      turn.blocks = [];
      if (turn.captureFinished && turn.started) {
        this.sendContext();
        turn.ended = true;
        this.replies.push(turn);
        link.send({ realtimeInput: { activityEnd: {} } });
        window.clearTimeout(this.replyTimer);
        this.replyTimer = window.setTimeout(() => this.cancel("Chief took too long to respond. Hold to try again."), 40_000);
      }
      this.syncPhase();
    } catch {
      this.cancel("Chief audio disconnected. Hold to try again.");
    }
  }

  private receive(message: LiveServerMessage) {
    if (message.goAway) {
      this.cancel(this.engaged ? "Chief session ended. Hold to reconnect." : "");
      return;
    }
    const content = message.serverContent;
    const turn = this.turn;
    const responding = this.replies[0];
    const currentReply = responding !== undefined && responding === turn;
    if (content?.interrupted) {
      if (responding) responding.interrupted = true;
      this.output?.stop();
    }
    if (turn && (!responding || currentReply)) {
      if (content?.inputTranscription) turn.input = appendText(turn.input, content.inputTranscription);
      const interim = content?.interimInputTranscription?.text;
      if (!turn.output && (interim || content?.inputTranscription)) {
        this.update({ transcript: interim || turn.input, speaker: "You" });
      }
      if (currentReply && !responding.interrupted) {
        if (content?.outputTranscription) {
          turn.output = appendText(turn.output, content.outputTranscription);
          this.update({ transcript: turn.output, speaker: "Chief" });
        }
        for (const part of content?.modelTurn?.parts ?? []) {
          const audio = part.inlineData;
          if (audio?.data && (!audio.mimeType || /^audio\/(pcm|l16)(?:;|$)/i.test(audio.mimeType))) {
            this.output?.enqueue(audio.data);
          }
        }
      }
    }
    for (const id of message.toolCallCancellation?.ids ?? []) responding?.cancelled.add(id);
    const functionResponses: FunctionResponse[] = [];
    for (const call of message.toolCall?.functionCalls ?? []) {
      if (!call.id || !call.name || responding?.cancelled.has(call.id)) continue;
      const result = responding?.tools.get(call.id) ?? {
        id: call.id, name: call.name,
        response: currentReply && !responding.interrupted
          ? actForChief(call, responding.runId) : { error: "The voice turn was interrupted." },
      };
      responding?.tools.set(call.id, result);
      functionResponses.push(result);
    }
    if (functionResponses.length) this.link?.send({ toolResponse: { functionResponses } });
    if (content?.turnComplete && responding) {
      this.replies.shift();
      if (!this.replies.length) window.clearTimeout(this.replyTimer);
      if (currentReply) this.turn = undefined;
      this.refresh();
    }
    this.syncPhase();
  }

  private clearIdle() {
    window.clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  private syncPhase() {
    const turn = this.turn;
    const phase: TalkPhase = this.output?.playing ? "speaking"
      : !turn ? "idle"
      : !this.link || (turn.held && !turn.mic) ? "connecting"
      : turn.held ? "listening" : "thinking";
    this.update({ phase });
    setLiveAudioBusy(this.engaged);
    if (!this.engaged && this.link && this.idleTimer === undefined) {
      this.idleTimer = window.setTimeout(() => this.cancel(), 90_000);
    }
  }

  cancel(error = "") {
    const turn = this.turn;
    this.turn = undefined;
    turn?.abort.abort();
    turn?.mic?.cancel();
    this.replies = [];
    this.connection?.abort();
    this.connection = undefined;
    this.link?.close();
    this.link = undefined;
    this.output?.stop();
    this.lastContext = "";
    this.clearIdle();
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.replyTimer);
    window.clearTimeout(this.contextTimer);
    this.contextTimer = undefined;
    setLiveAudioBusy(false);
    if (!this.disposed) this.update({ phase: error ? "error" : "idle", error, level: 0 });
  }

  dispose() {
    this.disposed = true;
    this.cancel();
    if (this.audio) void this.audio.close().catch(() => undefined);
  }
}
