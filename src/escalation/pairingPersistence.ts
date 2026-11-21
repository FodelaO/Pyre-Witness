/** Atomically saves the relay's pairing credentials in a private temporary file. */
import { randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { CLIENT_KEY, PAIR_CODE } from "./wire.mjs";

const credentials = z.strictObject({
  code: z.string().regex(PAIR_CODE),
  owner: z.string().regex(CLIENT_KEY),
  phone: z.string().regex(CLIENT_KEY).nullable(),
  expiresAt: z.number().int().positive(),
});
export type PairingCredentials = z.infer<typeof credentials>;

export function pairingFile() {
  return join(tmpdir(), `pyre-witness-pairings-${process.getuid?.() ?? "local"}-${Number(process.env.PORT) || 4119}.json`);
}

export function readPairings(file: string): PairingCredentials[] {
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Pairing storage could not be read.");
  }
  try {
    return credentials.array().parse(JSON.parse(content));
  } catch {
    // Parse errors can contain fragments of the input. Never propagate those details.
    throw new Error("Pairing storage is unreadable.");
  }
}

export function writePairings(file: string, sessions: ReadonlyMap<string, Omit<PairingCredentials, "code">>) {
  const records = Array.from(sessions, ([code, { owner, phone, expiresAt }]) => ({ code, owner, phone, expiresAt }));
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, JSON.stringify(records), { mode: 0o600, flag: "wx" });
    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}
