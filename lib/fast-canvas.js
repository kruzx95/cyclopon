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

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function roundRectDistance(px, py, x0, y0, x1, y1, r) {
  const innerX0 = x0 + r;
  const innerX1 = x1 - r;
  const innerY0 = y0 + r;
  const innerY1 = y1 - r;
  const cx = Math.max(innerX0, Math.min(px, innerX1));
  const cy = Math.max(innerY0, Math.min(py, innerY1));
  return Math.hypot(px - cx, py - cy) - r;
}

/**
 * Tiny dependency-free RGB canvas with 2x supersampling for anti-aliased edges.
 * Coordinates are always expressed in output pixels (e.g. 1200x630).
 */
class FastCanvas {
  constructor(width = 1200, height = 630, supersample = 2) {
    this.width = width;
    this.height = height;
    this.ss = Math.max(1, Math.floor(supersample));
    this.iw = width * this.ss;
    this.ih = height * this.ss;
    this.rowSize = 1 + this.iw * 3;
    this.buffer = Buffer.alloc(this.rowSize * this.ih);
    for (let y = 0; y < this.ih; y++) this.buffer[y * this.rowSize] = 0;
  }

  _blend(offset, r, g, b, alpha) {
    if (alpha >= 1) {
      this.buffer[offset] = r;
      this.buffer[offset + 1] = g;
      this.buffer[offset + 2] = b;
      return;
    }
    const inv = 1 - alpha;
    this.buffer[offset] = Math.round(this.buffer[offset] * inv + r * alpha);
    this.buffer[offset + 1] = Math.round(this.buffer[offset + 1] * inv + g * alpha);
    this.buffer[offset + 2] = Math.round(this.buffer[offset + 2] * inv + b * alpha);
  }

  /**
   * Paint a float-coordinate rectangle with per-pixel coverage (anti-aliased),
   * so fractional text scales and strokes stay smooth after downsampling.
   */
  _paintRect(x0f, y0f, x1f, y1f, r, g, b, alpha) {
    const sx = this.ss;
    let x0 = x0f * sx;
    let y0 = y0f * sx;
    let x1 = x1f * sx;
    let y1 = y1f * sx;
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(this.iw, x1);
    y1 = Math.min(this.ih, y1);
    if (x0 >= x1 || y0 >= y1) return;

    const px0 = Math.floor(x0);
    const py0 = Math.floor(y0);
    const px1 = Math.ceil(x1);
    const py1 = Math.ceil(y1);
    const opaque = alpha >= 1;

    for (let py = py0; py < py1; py++) {
      const cy = Math.min(py + 1, y1) - Math.max(py, y0);
      if (cy <= 0) continue;
      const rowOffset = py * this.rowSize + 1;
      for (let px = px0; px < px1; px++) {
        const cx = Math.min(px + 1, x1) - Math.max(px, x0);
        if (cx <= 0) continue;
        const offset = rowOffset + px * 3;
        if (opaque && cx >= 0.999 && cy >= 0.999) {
          this.buffer[offset] = r;
          this.buffer[offset + 1] = g;
          this.buffer[offset + 2] = b;
        } else {
          const cov = cx * cy;
          this._blend(offset, r, g, b, alpha * (cov > 1 ? 1 : cov));
        }
      }
    }
  }

  setPixel(x, y, r, g, b, alpha = 1) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const px = Math.floor(x * this.ss);
    const py = Math.floor(y * this.ss);
    const offset = py * this.rowSize + 1 + px * 3;
    this._blend(offset, clamp255(r), clamp255(g), clamp255(b), alpha);
  }

  fillRect(x, y, w, h, r, g, b, alpha = 1) {
    this._paintRect(x, y, x + w, y + h, clamp255(r), clamp255(g), clamp255(b), alpha);
  }

  drawRect(x, y, w, h, strokeW = 1, r, g, b, alpha = 1) {
    this.fillRect(x, y, w, strokeW, r, g, b, alpha);
    this.fillRect(x, y + h - strokeW, w, strokeW, r, g, b, alpha);
    this.fillRect(x, y, strokeW, h, r, g, b, alpha);
    this.fillRect(x + w - strokeW, y, strokeW, h, r, g, b, alpha);
  }

  fillRoundRect(x, y, w, h, radius, r, g, b, alpha = 1) {
    this._paintRoundRect(x, y, x + w, y + h, radius, 0, r, g, b, alpha);
  }

  drawRoundRect(x, y, w, h, radius, strokeW, r, g, b, alpha = 1) {
    this._paintRoundRect(x, y, x + w, y + h, radius, strokeW, r, g, b, alpha);
  }

  _paintRoundRect(x0f, y0f, x1f, y1f, radius, strokeW, r, g, b, alpha) {
    const sx = this.ss;
    const x0 = Math.min(x0f, x1f) * sx;
    const y0 = Math.min(y0f, y1f) * sx;
    const x1 = Math.max(x0f, x1f) * sx;
    const y1 = Math.max(y0f, y1f) * sx;
    const rad = Math.max(0, Math.min(radius * sx, (x1 - x0) / 2, (y1 - y0) / 2));
    const half = (strokeW * sx) / 2;
    const px0 = Math.max(0, Math.floor(x0 - half - 1));
    const py0 = Math.max(0, Math.floor(y0 - half - 1));
    const px1 = Math.min(this.iw, Math.ceil(x1 + half + 1));
    const py1 = Math.min(this.ih, Math.ceil(y1 + half + 1));

    for (let py = py0; py < py1; py++) {
      const rowOffset = py * this.rowSize + 1;
      for (let px = px0; px < px1; px++) {
        const d = roundRectDistance(px + 0.5, py + 0.5, x0, y0, x1, y1, rad);
        let cov;
        if (strokeW <= 0) {
          cov = d <= 0 ? 1 : 0;
        } else {
          cov = Math.abs(d) <= half ? 1 : 0;
        }
        if (cov > 0) this._blend(rowOffset + px * 3, r, g, b, alpha * cov);
      }
    }
  }

  fillCircle(cx, cy, radius, r, g, b, alpha = 1) {
    const sx = this.ss;
    const cxI = cx * sx;
    const cyI = cy * sx;
    const radI = radius * sx;
    const px0 = Math.max(0, Math.floor(cxI - radI - 1));
    const py0 = Math.max(0, Math.floor(cyI - radI - 1));
    const px1 = Math.min(this.iw, Math.ceil(cxI + radI + 1));
    const py1 = Math.min(this.ih, Math.ceil(cyI + radI + 1));

    for (let py = py0; py < py1; py++) {
      const rowOffset = py * this.rowSize + 1;
      const dy = py + 0.5 - cyI;
      for (let px = px0; px < px1; px++) {
        const dx = px + 0.5 - cxI;
        if (dx * dx + dy * dy <= radI * radI) {
          this._blend(rowOffset + px * 3, r, g, b, alpha);
        }
      }
    }
  }

  drawCircle(cx, cy, radius, strokeW = 1, r, g, b, alpha = 1) {
    const sx = this.ss;
    const cxI = cx * sx;
    const cyI = cy * sx;
    const radI = radius * sx;
    const half = (strokeW * sx) / 2;
    const outer = radI + half;
    const px0 = Math.max(0, Math.floor(cxI - outer - 1));
    const py0 = Math.max(0, Math.floor(cyI - outer - 1));
    const px1 = Math.min(this.iw, Math.ceil(cxI + outer + 1));
    const py1 = Math.min(this.ih, Math.ceil(cyI + outer + 1));

    for (let py = py0; py < py1; py++) {
      const rowOffset = py * this.rowSize + 1;
      const dy = py + 0.5 - cyI;
      for (let px = px0; px < px1; px++) {
        const dx = px + 0.5 - cxI;
        const d = Math.abs(Math.hypot(dx, dy) - radI);
        if (d <= half) this._blend(rowOffset + px * 3, r, g, b, alpha);
      }
    }
  }

  drawLine(x1, y1, x2, y2, thickness = 1, r = 255, g = 255, b = 255, alpha = 1) {
    const sx = this.ss;
    const half = (thickness * sx) / 2;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) * sx - half - 1));
    const maxX = Math.min(this.iw, Math.ceil(Math.max(x1, x2) * sx + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) * sx - half - 1));
    const maxY = Math.min(this.ih, Math.ceil(Math.max(y1, y2) * sx + half + 1));
    const ax = x1 * sx;
    const ay = y1 * sx;
    const bx = x2 * sx;
    const by = y2 * sx;

    for (let py = minY; py < maxY; py++) {
      const rowOffset = py * this.rowSize + 1;
      for (let px = minX; px < maxX; px++) {
        if (distToSegment(px + 0.5, py + 0.5, ax, ay, bx, by) <= half) {
          this._blend(rowOffset + px * 3, r, g, b, alpha);
        }
      }
    }
  }

  drawPolyline(points, thickness = 1, r = 255, g = 255, b = 255, alpha = 1) {
    for (let i = 1; i < points.length; i++) {
      this.drawLine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], thickness, r, g, b, alpha);
    }
  }

  measureText(text, scale = 1, letterSpacing = 0) {
    const str = String(text || '');
    if (!str.length) return { width: 0, height: 8 * scale };
    return {
      width: str.length * 8 * scale + (str.length - 1) * letterSpacing,
      height: 8 * scale
    };
  }

  drawChar(ch, x, y, scale = 1, r = 255, g = 255, b = 255, alpha = 1) {
    const code = ch.charCodeAt(0);
    const bitmap = FONT_8X8[code] || FONT_8X8[63];
    if (!bitmap) return;
    const step = scale;
    for (let row = 0; row < 8; row++) {
      const bits = bitmap[row];
      for (let col = 0; col < 8; col++) {
        if ((bits & (0x80 >> col)) !== 0) {
          this.fillRect(x + col * step, y + row * step, step, step, r, g, b, alpha);
        }
      }
    }
  }

  drawText(text, x, y, scale = 1, r = 255, g = 255, b = 255, opts = {}) {
    let str = String(text == null ? '' : text);
    const letterSpacing = opts.letterSpacing || 0;
    const alpha = opts.alpha == null ? 1 : opts.alpha;
    const maxWidth = opts.maxWidth || 0;

    if (maxWidth > 0 && this.measureText(str, scale, letterSpacing).width > maxWidth) {
      // Truncate with an ellipsis, keeping at least one character.
      while (str.length > 1) {
        str = str.slice(0, -1);
        if (this.measureText(str + '...', scale, letterSpacing).width <= maxWidth) break;
      }
      str += '...';
    }

    const width = this.measureText(str, scale, letterSpacing).width;
    let cx = x;
    if (opts.align === 'center') cx = x - width / 2;
    else if (opts.align === 'right') cx = x - width;

    const step = 8 * scale + letterSpacing;
    for (let i = 0; i < str.length; i++) {
      this.drawChar(str[i], cx, y, scale, r, g, b, alpha);
      cx += step;
    }
    return width;
  }

  drawBadge(text, x, y, bgR, bgG, bgB, textR, textG, textB, scale = 1, padX = 12, padY = 6) {
    const str = String(text || '');
    const charH = 8 * scale;
    const textW = this.measureText(str, scale).width;
    const boxW = textW + padX * 2;
    const boxH = charH + padY * 2;

    this.fillRect(x, y, boxW, boxH, bgR, bgG, bgB);
    this.drawText(str, x + padX, y + padY, scale, textR, textG, textB);
    return boxW;
  }

  toPng() {
    const out = Buffer.alloc((1 + this.width * 3) * this.height);
    const ss = this.ss;
    const inv = 1 / (ss * ss);

    for (let y = 0; y < this.height; y++) {
      const outRow = y * (1 + this.width * 3);
      out[outRow] = 0;
      for (let x = 0; x < this.width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let sy = 0; sy < ss; sy++) {
          const inRow = (y * ss + sy) * this.rowSize + 1;
          for (let sx = 0; sx < ss; sx++) {
            const off = inRow + (x * ss + sx) * 3;
            r += this.buffer[off];
            g += this.buffer[off + 1];
            b += this.buffer[off + 2];
          }
        }
        const off = outRow + 1 + x * 3;
        out[off] = Math.round(r * inv);
        out[off + 1] = Math.round(g * inv);
        out[off + 2] = Math.round(b * inv);
      }
    }

    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type: RGB
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const idatData = zlib.deflateSync(out, { level: 6 });
    return Buffer.concat([
      signature,
      chunk('IHDR', ihdr),
      chunk('IDAT', idatData),
      chunk('IEND', Buffer.alloc(0))
    ]);
  }
}

module.exports = FastCanvas;
