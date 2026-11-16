const zlib = require('zlib');
const FONT_8X8 = require('./png-font');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

class FastCanvas {
  constructor(width = 1200, height = 630) {
    this.width = width;
    this.height = height;
    this.rowSize = 1 + width * 3;
    this.buffer = Buffer.alloc(this.rowSize * height);
    // Initialize filter byte for each scanline to 0 (None)
    for (let y = 0; y < height; y++) {
      this.buffer[y * this.rowSize] = 0;
    }
  }

  setPixel(x, y, r, g, b) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const offset = y * this.rowSize + 1 + x * 3;
    this.buffer[offset] = r;
    this.buffer[offset + 1] = g;
    this.buffer[offset + 2] = b;
  }

  fillRect(x, y, w, h, r, g, b) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.floor(x + w));
    const y1 = Math.min(this.height, Math.floor(y + h));
    if (x0 >= x1 || y0 >= y1) return;

    for (let cy = y0; cy < y1; cy++) {
      const rowOffset = cy * this.rowSize + 1;
      for (let cx = x0; cx < x1; cx++) {
        const offset = rowOffset + cx * 3;
        this.buffer[offset] = r;
        this.buffer[offset + 1] = g;
        this.buffer[offset + 2] = b;
      }
    }
  }

  drawRect(x, y, w, h, strokeW = 1, r, g, b) {
    this.fillRect(x, y, w, strokeW, r, g, b); // Top
    this.fillRect(x, y + h - strokeW, w, strokeW, r, g, b); // Bottom
    this.fillRect(x, y, strokeW, h, r, g, b); // Left
    this.fillRect(x + w - strokeW, y, strokeW, h, r, g, b); // Right
  }

  drawChar(ch, x, y, scale = 1, r = 255, g = 255, b = 255) {
    const code = ch.charCodeAt(0);
    const bitmap = FONT_8X8[code] || FONT_8X8[63]; // Fallback to '?'
    if (!bitmap) return;

    for (let row = 0; row < 8; row++) {
      const bits = bitmap[row];
      for (let col = 0; col < 8; col++) {
        if ((bits & (0x80 >> col)) !== 0) {
          if (scale === 1) {
            this.setPixel(x + col, y + row, r, g, b);
          } else {
            this.fillRect(x + col * scale, y + row * scale, scale, scale, r, g, b);
          }
        }
      }
    }
  }

  drawText(text, x, y, scale = 1, r = 255, g = 255, b = 255) {
    const str = String(text || '');
    let cx = x;
    const charWidth = 8 * scale;
    for (let i = 0; i < str.length; i++) {
      this.drawChar(str[i], cx, y, scale, r, g, b);
      cx += charWidth;
    }
  }

  drawBadge(text, x, y, bgR, bgG, bgB, textR, textG, textB, scale = 1, padX = 12, padY = 6) {
    const str = String(text || '');
    const charW = 8 * scale;
    const charH = 8 * scale;
    const textW = str.length * charW;
    const boxW = textW + padX * 2;
    const boxH = charH + padY * 2;

    this.fillRect(x, y, boxW, boxH, bgR, bgG, bgB);
    this.drawText(str, x + padX, y + padY, scale, textR, textG, textB);
    return boxW;
  }

  toPng() {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type: RGB
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    const idatData = zlib.deflateSync(this.buffer, { level: 6 });
    return Buffer.concat([
      signature,
      chunk('IHDR', ihdr),
      chunk('IDAT', idatData),
      chunk('IEND', Buffer.alloc(0))
    ]);
  }
}

module.exports = FastCanvas;
