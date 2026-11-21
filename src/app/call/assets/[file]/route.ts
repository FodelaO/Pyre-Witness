/** Serves the standalone phone styles and modules through a fixed asset list. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const assets = new Set(["phoneCall.css", "phoneBrowser.mjs", "phoneAudio.mjs", "roster.mjs", "connection.mjs", "wire.mjs"]);

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!assets.has(file)) return new Response(null, { status: 404 });
  const content = await readFile(join(process.cwd(), "src/escalation", file), "utf8");
  return new Response(content, { headers: {
    "Content-Type": file === "phoneCall.css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
