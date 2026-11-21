/** Serve only the phone page's local CSS, script and shared browser encoder. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const scripts = "text/javascript; charset=utf-8";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  let content: string;
  let type = scripts;
  switch (file) {
    case "phone.css":
      content = await readFile(join(process.cwd(), "src/app/capture/phone.css"), "utf8");
      type = "text/css; charset=utf-8";
      break;
    case "phone.mjs":
      content = await readFile(join(process.cwd(), "src/app/capture/phone.mjs"), "utf8");
      break;
    case "image-runtime.mjs":
      content = await readFile(join(process.cwd(), "src/capture/image-runtime.mjs"), "utf8");
      break;
    default:
      return new Response(null, { status: 404 });
  }
  return new Response(content, { headers: { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
