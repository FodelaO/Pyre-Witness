/** Makes a tiny RGB PNG for the real multimodal probe. */
import { deflateSync, crc32 } from "node:zlib";

function chunk(type: string, data: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, checksum]);
}

export function probePng(): Buffer {
  const side = 64;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header[8] = 8;
  header[9] = 2; // Truecolor RGB.

  const stride = 1 + side * 3;
  const rows = Buffer.alloc(side * stride);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const greenSquare = x >= 12 && x < 52 && y >= 12 && y < 52;
      const pixel = y * stride + 1 + x * 3;
      rows[pixel] = greenSquare ? 0 : 255;
      rows[pixel + 1] = greenSquare ? 190 : 255;
      rows[pixel + 2] = greenSquare ? 0 : 255;
    }
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
