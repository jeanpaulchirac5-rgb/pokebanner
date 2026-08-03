// ---------------------------------------------------------------------------
// Tray icon generator — builds a small pixel-art poké-ball PNG at runtime
// using only Node's built-in zlib, so the shell ships no binary assets.
// ---------------------------------------------------------------------------

const zlib = require("zlib");

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** 32×32 RGBA pixel-art poké ball as a valid PNG buffer. */
function makePokeballPng(size = 32) {
  const rgba = Buffer.alloc(size * size * 4);
  const r = size / 2;
  const rim = Math.max(1, Math.round(size * 0.09)); // outer black rim
  const band = Math.max(1, Math.round(size * 0.06)); // horizontal band
  const center = Math.max(2, Math.round(size * 0.16)); // center button radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = x - size / 2 + 0.5;
      const cy = y - size / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist > r) {
        // transparent outside the ball
        rgba[i + 3] = 0;
      } else if (dist <= center) {
        rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255;
      } else if (dist > r - rim || Math.abs(cy) <= band / 2) {
        rgba[i] = 17; rgba[i + 1] = 17; rgba[i + 2] = 17; rgba[i + 3] = 255;
      } else if (cy < 0) {
        rgba[i] = 230; rgba[i + 1] = 45; rgba[i + 2] = 45; rgba[i + 3] = 255;
      } else {
        rgba[i] = 250; rgba[i + 1] = 250; rgba[i + 2] = 250; rgba[i + 3] = 255;
      }
    }
  }
  // Raw scanlines with filter byte 0 per row
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Builds an Electron nativeImage from the generated PNG. */
function createTrayImage(size = 32) {
  const { nativeImage } = require("electron");
  const img = nativeImage.createFromBuffer(makePokeballPng(size));
  // HiDPI friendliness: also provide a 2× variant where supported.
  if (process.platform === "darwin") {
    const hi = nativeImage.createFromBuffer(makePokeballPng(size * 2));
    hi.addRepresentation({ scaleFactor: 2, buffer: makePokeballPng(size * 2) });
    img.addRepresentation({ scaleFactor: 1, buffer: makePokeballPng(size) });
    return hi;
  }
  return img;
}

module.exports = { makePokeballPng, createTrayImage, crc32 };
