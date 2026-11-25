/**
 * CycloPon Activity Card — canvas renderer.
 *
 * Native Canvas2D only (no html2canvas, no server round-trip):
 *   basemap mosaic -> duotone treatment -> route glow/main/core -> typography.
 *
 * `renderActivityCard()` never depends on network success: when tiles are
 * unavailable (CORS, offline, tile budget) the layout falls back to a
 * basemap-free "route art" treatment and still exports a full card.
 *
 * Depends on globals: CardModel, CardMap, CardTemplates (loaded before this
 * file by the /share route in app.js).
 */

let cardNoiseCache = null;

function cardSetFont(ctx, weight, size, stack) {
  ctx.font = `${weight || 600} ${Math.max(6, Math.round(size))}px ${stack || CARD_DISPLAY_STACK}`;
}

function cardRoundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw one line of text, auto-shrinking to maxWidth and supporting manual
 * letter-spacing (canvas has no native equivalent).
 */
function cardText(ctx, text, x, y, options = {}) {
  const {
    size = 32,
    weight = 600,
    stack = CARD_DISPLAY_STACK,
    color = '#000000',
    align = 'left',
    baseline = 'alphabetic',
    letterSpacing = 0,
    maxWidth = 0,
    alpha = 1
  } = options;
  const str = text === null || text === undefined ? '' : String(text);
  if (!str) return 0;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.textBaseline = baseline;
  ctx.textAlign = letterSpacing ? 'left' : align;

  let fontSize = Math.max(6, size);
  cardSetFont(ctx, weight, fontSize, stack);
  if (maxWidth > 0) {
    while (fontSize > 9 && ctx.measureText(str).width + letterSpacing * str.length > maxWidth) {
      fontSize -= 1;
      cardSetFont(ctx, weight, fontSize, stack);
    }
  }

  let width = ctx.measureText(str).width;
  if (!letterSpacing) {
    ctx.fillText(str, x, y);
  } else {
    const chars = Array.from(str);
    width = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + letterSpacing * Math.max(0, chars.length - 1);
    let cursor = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
    for (const ch of chars) {
      ctx.fillText(ch, cursor, y);
      cursor += ctx.measureText(ch).width + letterSpacing;
    }
  }
  ctx.restore();
  return width;
}
/** 128x128 monochrome noise tile, built once and reused by every card. */
function cardNoiseTile() {
  if (cardNoiseCache) return cardNoiseCache;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const ctx = tile.getContext('2d');
  const image = ctx.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 110 + Math.random() * 145;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  cardNoiseCache = tile;
  return tile;
}

function cardGrain(ctx, width, height, amount) {
  if (!amount || amount <= 0) return;
  const pattern = ctx.createPattern(cardNoiseTile(), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.25, amount);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function cardVignette(ctx, width, height, strength = 0.45) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.22,
    width / 2, height / 2, Math.max(width, height) * 0.78
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function cardHexToRgb(hex) {
  const value = String(hex || '').trim().replace('#', '');
  if (value.length === 3) {
    return [
      parseInt(value[0] + value[0], 16),
      parseInt(value[1] + value[1], 16),
      parseInt(value[2] + value[2], 16)
    ];
  }
  if (value.length === 6) {
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }
  return [0, 0, 0];
}

/**
 * Real duotone (luminance -> shadow..highlight ramp). Works in every browser
 * without relying on `ctx.filter`, and gives each theme its own map mood.
 */
function cardDuotone(sourceCanvas, shadowHex, highlightHex) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);

  const shadow = cardHexToRgb(shadowHex);
  const highlight = cardHexToRgb(highlightHex);
  try {
    const image = ctx.getImageData(0, 0, width, height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
      const t = Math.pow(lum, 1.15);
      px[i] = shadow[0] + (highlight[0] - shadow[0]) * t;
      px[i + 1] = shadow[1] + (highlight[1] - shadow[1]) * t;
      px[i + 2] = shadow[2] + (highlight[2] - shadow[2]) * t;
    }
    ctx.putImageData(image, 0, 0);
  } catch (err) {
    // Tainted canvas or OOM: keep the untreated copy (still a valid card).
  }
  return out;
}

/** Project + smooth the track into canvas pixels (once per theme). */
function cardRoutePixels(model, projection, maxPoints = 420) {
  const simplified = CardModel.simplifyTrack(model.points, maxPoints);
  const smoothed = CardModel.chaikinSmooth(simplified, 1);
  return smoothed.map(point => projection.toPixel(point.lat, point.lng));
}

function cardTracePath(ctx, pixels) {
  if (!pixels || pixels.length < 2) return false;
  ctx.beginPath();
  ctx.moveTo(pixels[0][0], pixels[0][1]);
  for (let i = 1; i < pixels.length; i++) ctx.lineTo(pixels[i][0], pixels[i][1]);
  return true;
}

function cardDrawMarker(ctx, x, y, radius, fill, ring) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.42);
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.restore();
}

/**
 * Three-pass route: outer glow halo, solid main stroke, thin bright core.
 * Start/finish markers use the palette accent so they read instantly.
 */
function cardDrawRoute(ctx, pixels, route, scale = 1, options = {}) {
  if (!pixels || pixels.length < 2) return;
  const width = Math.max(2, (route.width || 9) * scale);
  const markers = options.markers !== false;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (route.glow) {
    ctx.save();
    ctx.shadowColor = route.glow;
    ctx.shadowBlur = 26 * scale;
    ctx.strokeStyle = route.glow;
    ctx.lineWidth = width * 2.1;
    if (cardTracePath(ctx, pixels)) ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = route.main;
  ctx.lineWidth = width;
  if (cardTracePath(ctx, pixels)) ctx.stroke();

  if (route.core) {
    ctx.strokeStyle = route.core;
    ctx.lineWidth = Math.max(1.4, width * 0.3);
    if (cardTracePath(ctx, pixels)) ctx.stroke();
  }

  if (markers) {
    const start = pixels[0];
    const end = pixels[pixels.length - 1];
    cardDrawMarker(ctx, start[0], start[1], 13 * scale, route.marker || route.main, 'rgba(255,255,255,0.92)');
    cardDrawMarker(ctx, end[0], end[1], 16 * scale, '#FFFFFF', route.marker || route.main);
    cardDrawMarker(ctx, end[0], end[1], 7 * scale, route.marker || route.main, route.marker || route.main);
  }

  ctx.restore();
}

/** Concentric "echo" outlines used by the basemap-free fallback treatment. */
function cardEchoRoute(ctx, pixels, centerX, centerY, passes, color) {
  if (!pixels || pixels.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  for (let pass = 1; pass <= passes; pass++) {
    const scale = 1 + pass * 0.055;
    ctx.globalAlpha = Math.max(0.04, 0.16 - pass * 0.03);
    ctx.lineWidth = 2;
    ctx.beginPath();
    pixels.forEach(([x, y], index) => {
      const px = centerX + (x - centerX) * scale;
      const py = centerY + (y - centerY) * scale;
      if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** Downsample the elevation profile for the sparkline. */
function cardElevationSamples(model, count = 160) {
  const values = model.points.map(point => point.ele).filter(value => Number.isFinite(value));
  if (values.length < 4) return [];
  const target = Math.max(2, Math.min(count, values.length));
  const samples = [];
  for (let i = 0; i < target; i++) {
    samples.push(values[Math.round((i * (values.length - 1)) / (target - 1))]);
  }
  return samples;
}

/**
 * Elevation profile as a filled area + hairline.
 * @param {{x:number,y:number,w:number,h:number}} box
 */
function cardDrawElevation(ctx, samples, box, options = {}) {
  if (!samples || samples.length < 4) return false;
  const color = options.color || 'rgba(255,255,255,0.6)';
  const fillTop = options.fillTop || 'rgba(255,255,255,0.14)';
  const fillBottom = options.fillBottom || 'rgba(255,255,255,0)';
  const lineWidth = options.lineWidth || 2.5;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const span = Math.max(1, max - min);

  const points = samples.map((value, index) => [
    box.x + (index / (samples.length - 1)) * box.w,
    box.y + box.h - ((value - min) / span) * box.h
  ]);

  const gradient = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  gradient.addColorStop(0, fillTop);
  gradient.addColorStop(1, fillBottom);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0][0], box.y + box.h);
  points.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(points[points.length - 1][0], box.y + box.h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach(([x, y], index) => { if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  return true;
}

/**
 * Build (and stylize) the basemap layer for an area.
 * Returns `ok:false` instead of throwing whenever the provider is unusable.
 */
async function cardBuildMapLayer(model, options = {}) {
  const {
    width = 1080,
    height = 1080,
    padding = 0,
    template,
    maxTiles = 24,
    timeoutMs = 6000,
    signal = null
  } = options;
  const mapDef = (template && template.map) || {};
  const projection = CardMap.buildProjection(model.points, width, height, padding, mapDef.maxZoom || 16, maxTiles);

  if (!mapDef.enabled) {
    return { ok: false, reason: 'disabled', projection, attribution: '', mapDef };
  }

  const provider = CardMap.getTileProvider(mapDef.provider);
  const mosaic = await CardMap.renderTileMosaic({ projection, provider, width, height, maxTiles, timeoutMs, signal });

  if (!mosaic.ok) {
    return { ok: false, reason: mosaic.reason, projection, attribution: provider.attribution, mapDef };
  }

  return {
    ok: true,
    projection,
    mapCanvas: cardApplyMapTreatment(mosaic.canvas, mapDef),
    attribution: mosaic.attribution || provider.attribution,
    providerId: mosaic.providerId || provider.id,
    partial: mosaic.partial,
    mapDef
  };
}

/** Shared footer: rider/credit on the left, map attribution on the right. */
function cardDrawFooter(ctx, options) {
  const { width, height, pad, base, footerFont, stack, ink, muted, attribution, leftText, background } = options;
  const y = height - pad;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, y - Math.round(52 * base), width, Math.round(52 * base) + pad);
  }
  cardText(ctx, leftText, pad, y, {
    size: footerFont, weight: 700, stack, color: ink, letterSpacing: 2.2 * base,
    maxWidth: width * 0.52
  });
  cardText(ctx, attribution || '', width - pad, y, {
    size: footerFont, weight: 500, stack, color: muted, align: 'right', maxWidth: width * 0.44
  });
}

function cardDrawGrid(ctx, width, height, step, color, lineWidth = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function cardApplyMapTreatment(sourceCanvas, mapDef) {
  if (!mapDef) return sourceCanvas;
  if (mapDef.treatment === 'duotone' || mapDef.treatment === 'mono') {
    return cardDuotone(sourceCanvas, mapDef.shadow, mapDef.highlight || '#FFFFFF');
  }
  return sourceCanvas;
}
function cardHasParticipantTime(model) {
  if (!model || model.isOfficialRoute || !model.hasTime || !model.stats) return false;
  return (model.stats.movingSec || model.stats.elapsedSec || 0) > 0;
}

function cardSecondaryCells(model) {
  const showTime = cardHasParticipantTime(model);
  const movingSec = model.stats.movingSec || model.stats.elapsedSec;
  if (showTime && model.hasElevation) {
    return [
      { label: 'WAKTU BERGERAK', value: CardModel.formatDuration(movingSec) || '-', unit: '' },
      { label: 'ELEVASI GAIN', value: String(model.stats.elevGainM), unit: 'M' },
      { label: 'ELEVASI TURUN', value: String(model.stats.elevLossM), unit: 'M' }
    ];
  }
  if (showTime) {
    return [
      { label: 'WAKTU BERGERAK', value: CardModel.formatDuration(movingSec) || '-', unit: '' },
      { label: 'DURASI TOTAL', value: CardModel.formatDuration(model.stats.elapsedSec || movingSec) || '-', unit: '' },
      { label: 'TITIK GPS', value: String(model.points.length), unit: 'TITIK' }
    ];
  }
  if (model.hasElevation) {
    return [
      { label: 'ELEVASI GAIN', value: String(model.stats.elevGainM), unit: 'M' },
      { label: 'ELEVASI TURUN', value: String(model.stats.elevLossM), unit: 'M' },
      { label: 'ELEVASI MAKS', value: String(model.stats.maxEle ?? 0), unit: 'M' }
    ];
  }
  return [
    { label: 'SUMBER TREK', value: 'RUTE EVENT', unit: '' },
    { label: 'ELEVASI GAIN', value: '0', unit: 'M' },
    { label: 'TITIK GPS', value: String(model.points.length), unit: 'TITIK' }
  ];
}

function cardHexAlpha(hex, alpha) {
  const [r, g, b] = cardHexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ─────────────────────────── Layout 1: Panel Bottom ─────────────────────────── */

async function drawNightNeon(ctx, size, model, template, metrics, options, report) {
  const { width, height } = size;
  const palette = template.palette;
  const base = metrics.base;
  const pad = metrics.pad;
  const label = template.typography.label;
  const display = template.typography.display;
  const mapHeight = Math.round(height * (size.id === 'square' ? 0.58 : 0.63));
  const heroFont = metrics.heroFont;

  const bg = ctx.createLinearGradient(0, 0, width * 0.35, height);
  bg.addColorStop(0, palette.bgTop);
  bg.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const bloom = ctx.createRadialGradient(width * 0.7, mapHeight * 0.45, 0, width * 0.7, mapHeight * 0.45, width * 0.95);
  bloom.addColorStop(0, cardHexAlpha(palette.accent, 0.15));
  bloom.addColorStop(1, cardHexAlpha(palette.accent, 0));
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, mapHeight + Math.round(120 * base));

  const layer = await cardBuildMapLayer(model, {
    width,
    height: mapHeight,
    padding: {
      top: Math.round(pad * 2.3),
      right: Math.round(pad * 1.15),
      bottom: Math.round(pad * 1.7),
      left: Math.round(pad * 1.15)
    },
    template,
    maxTiles: options.maxTiles,
    timeoutMs: options.timeoutMs,
    signal: options.signal
  });
  report.attribution = layer.ok ? layer.attribution : '';
  report.usedFallbackMap = !layer.ok;
  const pixels = cardRoutePixels(model, layer.projection);

  if (layer.ok) {
    ctx.drawImage(layer.mapCanvas, 0, 0);
    if (layer.mapDef.wash) {
      ctx.fillStyle = layer.mapDef.wash;
      ctx.fillRect(0, 0, width, mapHeight);
    }
    const fade = ctx.createLinearGradient(0, mapHeight * 0.5, 0, mapHeight);
    fade.addColorStop(0, cardHexAlpha(palette.bgTop, 0));
    fade.addColorStop(0.7, cardHexAlpha(palette.bgTop, 0.85));
    fade.addColorStop(1, palette.bgTop);
    ctx.fillStyle = fade;
    ctx.fillRect(0, mapHeight * 0.5, width, mapHeight * 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, mapHeight);
    ctx.clip();
    cardVignette(ctx, width, mapHeight, 0.35);
    ctx.restore();
  } else {
    ctx.fillStyle = cardHexAlpha(palette.bgBottom, 0.55);
    ctx.fillRect(0, 0, width, mapHeight);
    cardDrawGrid(ctx, width, mapHeight, Math.round(96 * base), cardHexAlpha(palette.accent, 0.055));
    cardEchoRoute(ctx, pixels, width / 2, mapHeight / 2, 5, palette.accent);
  }

  cardDrawRoute(ctx, pixels, template.route, base);

  const brandY = Math.round(pad + 34 * base);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(pad, brandY - Math.round(15 * base), Math.round(10 * base), Math.round(10 * base));
  cardText(ctx, 'CYCLOPON', pad + Math.round(26 * base), brandY, {
    size: 21 * base, weight: 700, stack: label, color: palette.ink, letterSpacing: 6 * base
  });
  cardText(ctx, 'RIDE CARD', width - pad, brandY, {
    size: 18 * base, weight: 600, stack: label, color: palette.muted, align: 'right', letterSpacing: 4 * base
  });

  const dateText = CardModel.formatDateId(model.startedAt) || 'TANPA TIMESTAMP';
  cardText(ctx, dateText, width - pad, brandY + Math.round(40 * base), {
    size: 19 * base, stack: label, color: palette.ink, align: 'right', letterSpacing: 3 * base, alpha: 0.85
  });
  cardText(ctx, (model.riderName || 'RIDE').toUpperCase(), pad, brandY + Math.round(42 * base), {
    size: 18 * base, stack: label, color: palette.accent, letterSpacing: 3.5 * base,
    maxWidth: width * 0.45
  });

  const contentTop = mapHeight - Math.round(70 * base);
  const titleY = contentTop + Math.round(58 * base);
  cardText(ctx, model.title, pad, titleY, {
    size: metrics.titleFont, weight: 800, stack: display, color: palette.ink, maxWidth: width - pad * 2
  });

  const heroY = titleY + Math.round(heroFont * 0.95);
  const distanceText = CardModel.formatDistance(model.stats.distanceKm);
  const distanceWidth = cardText(ctx, distanceText, pad, heroY, {
    size: heroFont, weight: 800, stack: display, color: palette.ink, maxWidth: width - pad * 2 - Math.round(90 * base)
  });
  cardText(ctx, 'KM', pad + Math.min(distanceWidth, width - pad * 2 - Math.round(90 * base)) + Math.round(18 * base), heroY - Math.round(4 * base), {
    size: 34 * base, weight: 700, stack: label, color: palette.accent, letterSpacing: 2 * base
  });

  const ruleY = heroY + Math.round(36 * base);
  ctx.fillStyle = palette.border;
  ctx.fillRect(pad, ruleY, width - pad * 2, Math.max(1, Math.round(1.5 * base)));
  const metricsY = ruleY + Math.round(58 * base);
  const cells = cardSecondaryCells(model);
  const colWidth = (width - pad * 2) / 3;
  cells.forEach((cell, index) => {
    const x = pad + colWidth * index;
    if (index > 0) {
      ctx.fillStyle = palette.border;
      ctx.fillRect(x - Math.round(14 * base), metricsY - Math.round(16 * base), Math.max(1, Math.round(base)), Math.round(92 * base));
    }
    cardText(ctx, cell.label, x, metricsY, {
      size: 17 * base, stack: label, color: palette.muted, letterSpacing: 2.4 * base, maxWidth: colWidth - Math.round(26 * base)
    });
    cardText(ctx, cell.value, x, metricsY + Math.round(64 * base), {
      size: metrics.metricFont, weight: 800, stack: display, color: palette.ink, maxWidth: colWidth - Math.round(26 * base)
    });
    if (cell.unit) {
      cardText(ctx, cell.unit, x, metricsY + Math.round(98 * base), {
        size: 17 * base, stack: label, color: palette.accent, letterSpacing: 2 * base
      });
    }
  });

  const sparkTop = metricsY + Math.round(142 * base);
  const footerTop = height - pad;
  if (model.hasElevation && footerTop - sparkTop > Math.round(210 * base)) {
    cardText(ctx, 'PROFIL ELEVASI', pad, sparkTop, {
      size: 16 * base, stack: label, color: palette.muted, letterSpacing: 2.6 * base
    });
    cardDrawElevation(ctx, cardElevationSamples(model), {
      x: pad,
      y: sparkTop + Math.round(24 * base),
      w: width - pad * 2,
      h: Math.round(112 * base)
    }, {
      color: cardHexAlpha(palette.accent, 0.8),
      fillTop: cardHexAlpha(palette.accent, 0.22),
      fillBottom: cardHexAlpha(palette.accent, 0),
      lineWidth: Math.max(2, 2.5 * base)
    });
  }

  cardDrawFooter(ctx, {
    width, height, pad, base, footerFont: metrics.footerFont,
    stack: label, ink: palette.ink, muted: palette.muted,
    attribution: layer.attribution,
    leftText: model.riderName ? model.riderName.toUpperCase() : 'DIREKAM DENGAN GPS'
  });
}
/* ─────────────────────────── Layout 2: Editorial ─────────────────────────── */

async function drawPaperTopo(ctx, size, model, template, metrics, options, report) {
  const { width, height } = size;
  const palette = template.palette;
  const base = metrics.base;
  const pad = metrics.pad;
  const label = template.typography.label;
  const display = template.typography.display;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, palette.bgTop);
  bg.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.fillStyle = cardHexAlpha(palette.accent, 0.10);
  const dotStep = Math.round(28 * base);
  for (let x = dotStep; x < width; x += dotStep) {
    for (let y = dotStep; y < height; y += dotStep) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.8, 1.15 * base), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = Math.max(1, 2 * base);
  ctx.strokeRect(Math.round(26 * base), Math.round(26 * base), width - Math.round(52 * base), height - Math.round(52 * base));
  ctx.strokeStyle = cardHexAlpha(palette.accent, 0.14);
  ctx.lineWidth = Math.max(1, base);
  ctx.strokeRect(Math.round(38 * base), Math.round(38 * base), width - Math.round(76 * base), height - Math.round(76 * base));

  const headerY = pad + Math.round(22 * base);
  cardText(ctx, 'CYCLOPON', pad, headerY, {
    size: 20 * base, weight: 700, stack: label, color: palette.ink, letterSpacing: 6 * base
  });
  cardText(ctx, CardModel.formatDateId(model.startedAt) || 'TANPA TANGGAL', width - pad, headerY, {
    size: 18 * base, stack: label, color: palette.muted, align: 'right', letterSpacing: 3 * base
  });

  const titleY = headerY + Math.round(88 * base);
  cardText(ctx, model.title, pad, titleY, {
    size: metrics.titleFont, weight: template.typography.weightDisplay || 700, stack: display, color: palette.ink, maxWidth: width - pad * 2
  });
  const subtitleY = titleY + Math.round(46 * base);
  cardText(ctx, model.riderName ? model.riderName.toUpperCase() : `${model.source.toUpperCase()} ROUTE`, pad, subtitleY, {
    size: 18 * base, stack: label, color: palette.accent2, letterSpacing: 3.4 * base, maxWidth: width - pad * 2
  });

  const mapBox = { x: pad, y: subtitleY + Math.round(30 * base), w: width - pad * 2, h: 0 };
  const footerY = height - pad;
  mapBox.h = Math.round(Math.min(height * 0.40, Math.max(height * 0.26, (footerY - mapBox.y) * 0.5)));

  const layer = await cardBuildMapLayer(model, {
    width: mapBox.w,
    height: mapBox.h,
    padding: Math.round(46 * base),
    template,
    maxTiles: options.maxTiles,
    timeoutMs: options.timeoutMs,
    signal: options.signal
  });
  report.attribution = layer.ok ? layer.attribution : '';
  report.usedFallbackMap = !layer.ok;
  const pixels = cardRoutePixels(model, layer.projection);

  ctx.save();
  cardRoundRectPath(ctx, mapBox.x, mapBox.y, mapBox.w, mapBox.h, metrics.radius);
  ctx.clip();
  ctx.fillStyle = palette.mapBg || '#EDE7D9';
  ctx.fillRect(mapBox.x, mapBox.y, mapBox.w, mapBox.h);

  ctx.save();
  ctx.translate(mapBox.x, mapBox.y);
  if (layer.ok) {
    ctx.globalAlpha = 0.95;
    ctx.drawImage(layer.mapCanvas, 0, 0);
    ctx.globalAlpha = 1;
    if (layer.mapDef.wash) {
      ctx.fillStyle = layer.mapDef.wash;
      ctx.fillRect(0, 0, mapBox.w, mapBox.h);
    }
  } else {
    cardDrawGrid(ctx, mapBox.w, mapBox.h, Math.round(66 * base), cardHexAlpha(palette.accent, 0.08));
    cardEchoRoute(ctx, pixels, mapBox.w / 2, mapBox.h / 2, 6, palette.accent);
  }

  const elevation = cardElevationSamples(model, 120);
  if (elevation.length > 4) {
    cardDrawElevation(ctx, elevation, { x: 0, y: mapBox.h * 0.68, w: mapBox.w, h: mapBox.h * 0.26 }, {
      color: cardHexAlpha(palette.accent, 0.35),
      fillTop: cardHexAlpha(palette.accent, 0.12),
      fillBottom: cardHexAlpha(palette.accent, 0),
      lineWidth: 2
    });
  }

  cardDrawRoute(ctx, pixels, template.route, base);
  ctx.restore();
  ctx.restore();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = Math.max(1, 2 * base);
  cardRoundRectPath(ctx, mapBox.x, mapBox.y, mapBox.w, mapBox.h, metrics.radius);
  ctx.stroke();

  const mapTag = layer.ok
    ? `${layer.mapDef.provider === 'osm' ? 'OPENSTREETMAP' : String(layer.mapDef.provider).toUpperCase()} · ZOOM ${layer.projection.zoom}`
    : 'ROUTE ART · TANPA BASEMAP';
  cardText(ctx, mapTag, mapBox.x + Math.round(22 * base), mapBox.y + mapBox.h - Math.round(20 * base), {
    size: 15 * base, stack: label, color: palette.ink, letterSpacing: 2.2 * base, alpha: 0.62,
    maxWidth: mapBox.w - Math.round(44 * base)
  });
  const remaining = footerY - (mapBox.y + mapBox.h);
  const cellHeight = Math.round(Math.min(122 * base, Math.max(86 * base, remaining * 0.27)));
  const gridTop = mapBox.y + mapBox.h + Math.round(56 * base);
  const halfWidth = (width - pad * 2) / 2;
  const cells = [
    { label: 'JARAK', value: CardModel.formatDistance(model.stats.distanceKm), unit: 'KM' },
    ...cardSecondaryCells(model)
  ];

  ctx.fillStyle = palette.border;
  ctx.fillRect(pad, gridTop - Math.round(26 * base), width - pad * 2, Math.max(1, base));

  cells.forEach((cell, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = pad + column * halfWidth;
    const y = gridTop + row * cellHeight;
    cardText(ctx, cell.label, x, y + Math.round(18 * base), {
      size: 16 * base, stack: label, color: palette.muted, letterSpacing: 2.4 * base, maxWidth: halfWidth - Math.round(40 * base)
    });
    const valueWidth = cardText(ctx, cell.value, x, y + Math.round(82 * base), {
      size: Math.round(56 * base), weight: 700, stack: display, color: palette.ink,
      maxWidth: halfWidth - Math.round(96 * base)
    });
    if (cell.unit) {
      cardText(ctx, cell.unit, x + valueWidth + Math.round(10 * base), y + Math.round(78 * base), {
        size: 18 * base, stack: label, color: palette.accent2, letterSpacing: 2 * base
      });
    }
    if (column === 0) {
      ctx.fillStyle = cardHexAlpha(palette.accent, 0.12);
      ctx.fillRect(x + halfWidth - Math.round(12 * base), y + Math.round(6 * base), Math.max(1, base), cellHeight - Math.round(26 * base));
    }
  });

  const gridBottom = gridTop + cellHeight * 2;
  const sparkTop = gridBottom + Math.round(26 * base);
  const sparkHeight = Math.round(Math.min(124 * base, footerY - sparkTop - Math.round(150 * base)));
  if (model.hasElevation && sparkHeight >= Math.round(46 * base)) {
    cardText(ctx, 'PROFIL ELEVASI', pad, sparkTop, {
      size: 15 * base, stack: label, color: palette.muted, letterSpacing: 2.6 * base
    });
    cardDrawElevation(ctx, cardElevationSamples(model), {
      x: pad, y: sparkTop + Math.round(20 * base), w: width - pad * 2, h: sparkHeight
    }, {
      color: cardHexAlpha(palette.accent, 0.55),
      fillTop: cardHexAlpha(palette.accent, 0.16),
      fillBottom: cardHexAlpha(palette.accent, 0),
      lineWidth: Math.max(2, 2.2 * base)
    });
  }

  const riderTop = sparkTop + Math.max(0, sparkHeight) + Math.round(54 * base);
  if (model.riderName && footerY - riderTop > Math.round(80 * base)) {
    cardText(ctx, (model.roleLabel || 'RIDER').toUpperCase(), pad, riderTop, {
      size: 15 * base, stack: label, color: palette.muted, letterSpacing: 2.8 * base
    });
    cardText(ctx, model.riderName, pad, riderTop + Math.round(46 * base), {
      size: Math.round(42 * base), weight: 'italic 700', stack: display, color: palette.accent,
      maxWidth: width - pad * 2
    });
  }

  ctx.fillStyle = cardHexAlpha(palette.accent, 0.14);
  ctx.fillRect(pad, footerY - Math.round(36 * base), width - pad * 2, Math.max(1, base));

  cardDrawFooter(ctx, {
    width, height, pad, base, footerFont: metrics.footerFont,
    stack: label, ink: palette.ink, muted: palette.muted,
    attribution: layer.attribution || 'ROUTE ART · TANPA BASEMAP',
    leftText: 'CYCLOPON · RIDE CARD'
  });
}
/* ──────────────────────── Layout 3: Brutalist / Blueprint ──────────────────────── */

async function drawBrutalistMono(ctx, size, model, template, metrics, options, report) {
  const { width, height } = size;
  const palette = template.palette;
  const base = metrics.base;
  const pad = metrics.pad;
  const label = template.typography.label;
  const display = template.typography.display;
  const border = Math.max(2, Math.round(3 * base));
  const footerBarH = Math.round(96 * base);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, palette.bgTop);
  bg.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const frameInset = Math.round(18 * base);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = border;
  ctx.strokeRect(frameInset, frameInset, width - frameInset * 2, height - frameInset * 2);

  const headerY = Math.round(pad + 22 * base);
  cardText(ctx, 'CYCLOPON', pad, headerY, {
    size: 22 * base, weight: 700, stack: label, color: palette.ink, letterSpacing: 7 * base
  });
  cardText(ctx, 'RIDE CARD', width - pad, headerY, {
    size: 20 * base, weight: 700, stack: label, color: palette.accent2 || palette.ink, align: 'right', letterSpacing: 3 * base
  });
  const sportLine = `${(model.riderName || model.source).toUpperCase()} · ${CardModel.formatDateId(model.startedAt) || 'NO DATE'}`;
  cardText(ctx, sportLine, pad, headerY + Math.round(32 * base), {
    size: 16 * base, stack: label, color: palette.muted, letterSpacing: 2.2 * base, maxWidth: width - pad * 2
  });

  const artTop = headerY + Math.round(52 * base);
  const footerTop = height - footerBarH;
  const artHeight = Math.round(Math.min(height * 0.44, Math.max(height * 0.26, (footerTop - artTop) - Math.round(520 * base))));
  const artBox = { x: pad, y: artTop, w: width - pad * 2, h: artHeight };

  const projection = CardMap.buildProjection(model.points, artBox.w, artBox.h, Math.round(56 * base), 16, options.maxTiles);
  const pixels = cardRoutePixels(model, projection);
  report.attribution = '';
  report.usedFallbackMap = false;

  ctx.save();
  ctx.fillStyle = palette.artBg || '#FBFAF7';
  ctx.fillRect(artBox.x, artBox.y, artBox.w, artBox.h);
  ctx.translate(artBox.x, artBox.y);
  cardDrawGrid(ctx, artBox.w, artBox.h, Math.round(54 * base), cardHexAlpha(palette.ink, 0.08));
  cardDrawRoute(ctx, pixels, template.route, base);
  ctx.restore();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = Math.max(1, Math.round(2 * base));
  ctx.strokeRect(artBox.x, artBox.y, artBox.w, artBox.h);

  const bbox = model.bbox;
  if (bbox) {
    const coordLabel = `${bbox.minLat.toFixed(3)}, ${bbox.minLng.toFixed(3)} → ${bbox.maxLat.toFixed(3)}, ${bbox.maxLng.toFixed(3)}`;
    cardText(ctx, coordLabel, artBox.x, artBox.y + artBox.h + Math.round(24 * base), {
      size: 15 * base, stack: label, color: palette.muted, letterSpacing: 1.4 * base, maxWidth: artBox.w
    });
  }

  const titleY = artBox.y + artBox.h + Math.round(84 * base);
  cardText(ctx, model.title.toUpperCase(), pad, titleY, {
    size: Math.round(54 * base), weight: 700, stack: display, color: palette.ink,
    letterSpacing: 1.2 * base, maxWidth: width - pad * 2
  });

  const heroY = titleY + Math.round(metrics.heroFont * 0.92);
  const heroFont = Math.round(metrics.heroFont * 1.02);
  const distanceText = CardModel.formatDistance(model.stats.distanceKm);
  const distanceWidth = cardText(ctx, distanceText, pad, heroY, {
    size: heroFont, weight: 700, stack: display, color: palette.ink,
    maxWidth: width - pad * 2 - Math.round(120 * base)
  });
  cardText(ctx, 'KM', pad + Math.min(distanceWidth, width - pad * 2 - Math.round(120 * base)) + Math.round(14 * base), heroY, {
    size: Math.round(40 * base), weight: 700, stack: label, color: palette.accent2, letterSpacing: 2 * base
  });
  const rowsTop = heroY + Math.round(58 * base);
  const rowHeight = Math.round(56 * base);
  const showTime = cardHasParticipantTime(model);
  const movingSec = model.stats.movingSec || model.stats.elapsedSec;
  const rows = [];
  if (model.isOfficialRoute) {
    rows.push(['SUMBER TREK', 'RUTE RESMI EVENT']);
  }
  if (showTime) {
    rows.push(['WAKTU BERGERAK', CardModel.formatDuration(movingSec) || '-']);
    if (model.stats.elapsedSec > movingSec + 60) {
      rows.push(['DURASI TOTAL', CardModel.formatDuration(model.stats.elapsedSec)]);
    }
  }
  if (model.hasElevation) {
    rows.push(['ELEVASI GAIN', `${model.stats.elevGainM} M`]);
    rows.push(['ELEVASI TURUN', `${model.stats.elevLossM} M`]);
    if (model.stats.maxEle !== null) {
      rows.push(['ELEVASI MAKS', `${model.stats.maxEle} M`]);
    }
  }
  rows.push(['TITIK GPS', String(model.points.length)]);

  rows.forEach((row, index) => {
    const y = rowsTop + index * rowHeight;
    cardText(ctx, row[0], pad, y, {
      size: 18 * base, weight: 700, stack: label, color: palette.muted, letterSpacing: 2.6 * base,
      maxWidth: width * 0.45
    });
    cardText(ctx, row[1], width - pad, y, {
      size: 21 * base, weight: 700, stack: label, color: palette.ink, align: 'right', letterSpacing: 1.5 * base,
      maxWidth: width * 0.4
    });
    ctx.fillStyle = cardHexAlpha(palette.ink, 0.14);
    ctx.fillRect(pad, y + Math.round(14 * base), width - pad * 2, Math.max(1, Math.round(base * 0.8)));
  });

  const listBottom = rowsTop + rows.length * rowHeight;
  const sparkTop = listBottom + Math.round(40 * base);
  const sparkHeight = Math.round(Math.min(150 * base, footerTop - sparkTop - Math.round(60 * base)));
  if (model.hasElevation && sparkHeight >= Math.round(60 * base)) {
    cardText(ctx, 'ELEVATION PROFILE', pad, sparkTop, {
      size: 15 * base, stack: label, color: palette.muted, letterSpacing: 2.8 * base
    });
    cardDrawElevation(ctx, cardElevationSamples(model), {
      x: pad, y: sparkTop + Math.round(18 * base), w: width - pad * 2, h: sparkHeight
    }, {
      color: cardHexAlpha(palette.ink, 0.65),
      fillTop: cardHexAlpha(palette.ink, 0.14),
      fillBottom: cardHexAlpha(palette.ink, 0),
      lineWidth: Math.max(2, 2 * base)
    });
  }

  const footerBg = palette.footerBg || palette.ink;
  const footerInk = palette.footerInk || '#FFFFFF';
  ctx.fillStyle = footerBg;
  ctx.fillRect(0, footerTop, width, footerBarH);
  cardText(ctx, 'CYCLOPON · RIDE CARD', pad, footerTop + Math.round(footerBarH * 0.62), {
    size: 18 * base, weight: 700, stack: label, color: footerInk, letterSpacing: 2.4 * base
  });
  cardText(ctx, 'ROUTE ART · TANPA BASEMAP', width - pad, footerTop + Math.round(footerBarH * 0.62), {
    size: 16 * base, stack: label, color: cardHexAlpha(footerInk, 0.78), align: 'right', letterSpacing: 2 * base
  });
}

/* ───────────────────────────── entry points ───────────────────────────── */

/**
 * Render a full activity card onto the provided canvas.
 *
 * @param {{canvas:HTMLCanvasElement, model:object, templateId?:string, sizeId?:string, options?:object}} input
 * @returns {Promise<{template:object,size:object,attribution:string,usedFallbackMap:boolean}>}
 */
async function renderActivityCard(input = {}) {
  const { canvas, model } = input;
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('Canvas tidak tersedia untuk menggambar kartu.');
  }
  if (!model || !Array.isArray(model.points) || model.points.length < 2) {
    throw new Error('Model aktivitas tidak valid.');
  }

  const template = CardTemplates.getCardTemplate(input.templateId);
  const size = CardTemplates.getCardSize(input.sizeId);
  const metrics = CardTemplates.metricsFor(size);

  // Make sure the webfont stack (Barlow / Plus Jakarta Sans from index.html) is ready before
  // measuring/drawing text, otherwise the first card would use a fallback face.
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (err) {
      // Non-fatal: the system font stack still renders a complete card.
    }
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak mendukung Canvas 2D.');

  canvas.width = size.width;
  canvas.height = size.height;
  ctx.clearRect(0, 0, size.width, size.height);

  const options = Object.assign({ maxTiles: 24, timeoutMs: 6000, signal: null }, input.options || {});
  const report = { attribution: '', usedFallbackMap: false };

  if (template.layout === 'editorial') {
    await drawPaperTopo(ctx, size, model, template, metrics, options, report);
  } else if (template.layout === 'brutalist') {
    await drawBrutalistMono(ctx, size, model, template, metrics, options, report);
  } else {
    await drawNightNeon(ctx, size, model, template, metrics, options, report);
  }

  cardGrain(ctx, size.width, size.height, template.grain);

  return {
    template,
    size,
    attribution: report.attribution,
    usedFallbackMap: report.usedFallbackMap
  };
}

/** Canvas -> PNG Blob (Promise wrapper, rejects when the browser refuses). */
function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new Error('Canvas terlalu besar atau tidak didukung browser ini.'));
      return;
    }
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Gagal membuat PNG. Coba ukuran atau tema lain.'));
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

const CARD_RENDERER_API = {
  renderActivityCard,
  canvasToPngBlob,
  cardText,
  cardRoundRectPath,
  cardDrawRoute,
  cardDrawElevation,
  cardElevationSamples,
  cardRoutePixels,
  cardDuotone,
  cardBuildMapLayer
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CARD_RENDERER_API;
}
if (typeof window !== 'undefined') {
  window.CardRenderer = CARD_RENDERER_API;
}