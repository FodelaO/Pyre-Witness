/** Reads bounded dataset images and checks that their paths and bytes match the format. */
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 4_200_000;
const FORMATS = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"],
]);

export function datasetImageMime(file: string): string | undefined {
  if (path.isAbsolute(file) || file.includes("\\") || file.includes("\0")) return undefined;
  if (file.split("/").some((part) => part === ".." || part === "." || part === "")) return undefined;
  return FORMATS.get(path.extname(file).toLowerCase());
}

export async function readDatasetImage(root: string, file: string) {
  const mimeType = datasetImageMime(file);
  if (!mimeType) throw new Error("Use a relative JPEG, PNG or WebP path inside the dataset.");

  let actual: string;
  let size: number;
  try {
    const actualRoot = await realpath(root);
    actual = await realpath(path.join(actualRoot, file));
    if (!actual.startsWith(actualRoot + path.sep)) throw new Error("Outside dataset");
    const info = await stat(actual);
    if (!info.isFile()) throw new Error("Not a file");
    size = info.size;
  } catch {
    throw new Error("The image is missing or is outside the dataset.");
  }
  if (size > MAX_BYTES) throw new Error(`The image exceeds the ${MAX_BYTES.toLocaleString("en-US")}-byte capture limit.`);
  const bytes = await readFile(actual);
  if (bytes.length > MAX_BYTES) throw new Error("The image exceeds the capture limit.");

  const jpeg = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!((mimeType === "image/jpeg" && jpeg) || (mimeType === "image/png" && png) || (mimeType === "image/webp" && webp))) {
    throw new Error("The image bytes do not match its file extension.");
  }
  return { bytes, mimeType };
}
