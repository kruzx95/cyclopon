/**
 * CycloPon Activity Card — map math + tile mosaic loader.
 *
 * Pure projection helpers (testable in node) plus a browser-only tile loader.
 * Tile URLs mirror the providers already used by `pages/live-map.js` so the
 * card looks like the rest of the app. Every tile is requested with
 * `crossOrigin="anonymous"`; if a provider answers without CORS headers the
 * mosaic reports `ok:false` and the renderer falls back to a map-less theme
 * instead of throwing a canvas `SecurityError`.
 */

const CARD_TILE_SIZE = 256;
const CARD_MAX_LAT = 85.05112878;
const CARD_MAX_TILES = 24;

const CARD_TILE_PROVIDERS = {
  osm: {
    id: 'osm',
    label: 'OpenStreetMap',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 17,
    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  },
  cyclosm: {
    id: 'cyclosm',
    label: 'CyclOSM',
    attribution: '© OpenStreetMap contributors · CyclOSM',
    maxZoom: 17,
    url: (z, x, y) => `https://${'abc'[(x + y) % 3]}.tile-cyclosm.openstreetmap.fr/cyclosm/${z}/${x}/${y}.png`
  },
  esri: {
    id: 'esri',
    label: 'Esri World Imagery',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 17,
    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
  }
};

const CARD_TILE_PROVIDER_IDS = ['cyclosm', 'osm', 'esri'];

/**
 * Fallback chain per provider. CyclOSM answers are known to fail outright from
 * some networks (Edge/Chromium return ERR_FAILED or HTTP 400), so the default
 * night theme degrades to plain OSM instead of losing its basemap.
 */
const CARD_TILE_FALLBACKS = {
  cyclosm: ['cyclosm', 'osm', 'esri'],
  osm: ['osm', 'esri'],
  esri: ['esri', 'osm']
};

function getTileFallbackChain(id) {
  const chain = CARD_TILE_FALLBACKS[id] || CARD_TILE_FALLBACKS.osm;
  return chain.map(tileId => CARD_TILE_PROVIDERS[tileId]).filter(Boolean);
}

function getTileProvider(id) {
  return CARD_TILE_PROVIDERS[id] || CARD_TILE_PROVIDERS.osm;
}

function tileWorldSize(zoom) {
  return CARD_TILE_SIZE * Math.pow(2, zoom);
}

/** Longitude -> world pixel X (Web Mercator, 256 px tiles). */
function lngToWorldX(lng, zoom) {
  return ((Number(lng) + 180) / 360) * tileWorldSize(zoom);
}

/** Latitude -> world pixel Y (Web Mercator, 256 px tiles). */
function latToWorldY(lat, zoom) {
  const clamped = Math.max(-CARD_MAX_LAT, Math.min(CARD_MAX_LAT, Number(lat)));
  const rad = clamped * Math.PI / 180;
  const merc = Math.log(Math.tan(Math.PI / 4 + rad / 2));
  return (1 - merc / Math.PI) / 2 * tileWorldSize(zoom);
}

function worldXToLng(x, zoom) {
  return (Number(x) / tileWorldSize(zoom)) * 360 - 180;
}

function worldYToLat(y, zoom) {
  const n = Math.PI - (2 * Math.PI * Number(y)) / tileWorldSize(zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Bounding box -> pixel rectangle at a given zoom. */
function bboxWorldRect(bbox, zoom) {
  const x0 = lngToWorldX(bbox.minLng, zoom);
  const x1 = lngToWorldX(bbox.maxLng, zoom);
  const y0 = latToWorldY(bbox.maxLat, zoom);
  const y1 = latToWorldY(bbox.minLat, zoom);
  return {
    x0, y0, x1, y1,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0)
  };
}

function normalizeProjectionPadding(padding) {
  if (padding && typeof padding === 'object') {
    return {
      top: Math.max(0, Number(padding.top) || 0),
      right: Math.max(0, Number(padding.right) || 0),
      bottom: Math.max(0, Number(padding.bottom) || 0),
      left: Math.max(0, Number(padding.left) || 0)
    };
  }
  const p = Math.max(0, Number(padding) || 0);
  return { top: p, right: p, bottom: p, left: p };
}

/**
 * Highest zoom where the route still fits inside the padded viewport.
 */
function chooseZoom(bbox, width, height, padding = 0, maxZoom = 16) {
  if (!bbox) return 1;
  const pad = normalizeProjectionPadding(padding);
  const availW = Math.max(1, Number(width) - pad.left - pad.right);
  const availH = Math.max(1, Number(height) - pad.top - pad.bottom);
  const top = Math.max(1, Math.min(19, Math.floor(maxZoom)));
  for (let zoom = top; zoom >= 1; zoom--) {
    const rect = bboxWorldRect(bbox, zoom);
    if (rect.width <= availW && rect.height <= availH) return zoom;
  }
  return 1;
}
/** Inclusive tile index range covering the bbox, clamped to the world grid. */
function tileRangeForBbox(bbox, zoom) {
  const maxIndex = Math.pow(2, zoom) - 1;
  const clamp = (value, max) => Math.max(0, Math.min(max, value));
  const minX = clamp(Math.floor(lngToWorldX(bbox.minLng, zoom) / CARD_TILE_SIZE), maxIndex);
  const maxX = clamp(Math.floor(lngToWorldX(bbox.maxLng, zoom) / CARD_TILE_SIZE), maxIndex);
  const minY = clamp(Math.floor(latToWorldY(bbox.maxLat, zoom) / CARD_TILE_SIZE), maxIndex);
  const maxY = clamp(Math.floor(latToWorldY(bbox.minLat, zoom) / CARD_TILE_SIZE), maxIndex);
  return {
    minX, maxX, minY, maxY,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
    count: (maxX - minX + 1) * (maxY - minY + 1)
  };
}

/**
 * Inclusive tile index range at `tileZoom` covering the full canvas viewport `[0..width, 0..height]`
 * when projected at `routeZoom` with `(offsetX, offsetY)`.
 */
function tileRangeForViewport(width, height, offsetX, offsetY, routeZoom, tileZoom = routeZoom) {
  const maxIndex = Math.pow(2, tileZoom) - 1;
  const clamp = (value, max) => Math.max(0, Math.min(max, value));
  const scale = Math.pow(2, routeZoom - tileZoom);
  const tilePx = CARD_TILE_SIZE * scale;
  const minX = clamp(Math.floor((0 - offsetX) / tilePx), maxIndex);
  const maxX = clamp(Math.floor((Math.max(1, width) - 1 - offsetX) / tilePx), maxIndex);
  const minY = clamp(Math.floor((0 - offsetY) / tilePx), maxIndex);
  const maxY = clamp(Math.floor((Math.max(1, height) - 1 - offsetY) / tilePx), maxIndex);
  return {
    minX, maxX, minY, maxY,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
    count: (maxX - minX + 1) * (maxY - minY + 1),
    tileSizePx: tilePx
  };
}

/** Step zoom down until the tile count fits the per-card budget. */
function fitZoomToTileBudget(bbox, zoom, maxTiles = CARD_MAX_TILES) {
  let z = Math.max(1, Math.min(19, Math.floor(zoom)));
  const budget = Math.max(1, Math.floor(maxTiles) || 1);
  while (z > 1 && tileRangeForBbox(bbox, z).count > budget) z--;
  return z;
}

/**
 * Projection shared by the mosaic and the route stroke.
 * The route is centred inside the padded area while basemap tiles fill the full viewport
 * within `maxTiles` by stepping `tileZoom` down when needed.
 */
function buildProjection(points, width, height, padding = 0, maxZoom = 16, maxTiles = CARD_MAX_TILES) {
  const bbox = computeCardBbox(points);
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const pad = normalizeProjectionPadding(padding);
  const zoom = bbox ? chooseZoom(bbox, w, h, pad, maxZoom) : 1;
  const availW = Math.max(1, w - pad.left - pad.right);
  const availH = Math.max(1, h - pad.top - pad.bottom);
  const rect = bbox ? bboxWorldRect(bbox, zoom) : { x0: 0, y0: 0, x1: w, y1: h, width: w, height: h };
  const offsetX = pad.left + (availW - rect.width) / 2 - rect.x0;
  const offsetY = pad.top + (availH - rect.height) / 2 - rect.y0;

  const budget = Math.max(1, Math.floor(maxTiles) || CARD_MAX_TILES);
  let tileZoom = zoom;
  let tiles = tileRangeForViewport(w, h, offsetX, offsetY, zoom, tileZoom);
  while (tileZoom > 1 && tiles.count > budget) {
    tileZoom--;
    tiles = tileRangeForViewport(w, h, offsetX, offsetY, zoom, tileZoom);
  }

  return {
    zoom,
    tileZoom,
    bbox,
    rect,
    offsetX,
    offsetY,
    toPixel(lat, lng) {
      return [lngToWorldX(lng, zoom) + offsetX, latToWorldY(lat, zoom) + offsetY];
    },
    tiles
  };
}

/** Local bbox so card-map stays free of a hard dependency on card-model. */
function computeCardBbox(points) {
  const list = Array.isArray(points) ? points : [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of list) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) return null;
  return { minLat, maxLat, minLng, maxLng, centerLat: (minLat + maxLat) / 2, centerLng: (minLng + maxLng) / 2 };
}
/**
 * Build the concrete tile request list for a projection.
 * @returns {Array<{z:number,x:number,y:number,url:string}>}
 */
function tilesForProjection(projection, provider) {
  const tiles = projection && projection.tiles ? projection.tiles : null;
  if (!tiles) return [];
  const source = provider || CARD_TILE_PROVIDERS.osm;
  const tileZoom = projection.tileZoom || projection.zoom;
  const list = [];
  for (let x = tiles.minX; x <= tiles.maxX; x++) {
    for (let y = tiles.minY; y <= tiles.maxY; y++) {
      list.push({ z: tileZoom, x, y, url: source.url(tileZoom, x, y) });
    }
  }
  return list;
}

/** Load one tile image with CORS enabled and a hard timeout. */
function loadTileImage(url, timeoutMs = 6000, signal) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      reject(new Error('no-image-support'));
      return;
    }
    if (signal && signal.aborted) {
      reject(new Error('aborted'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    let settled = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      if (err) reject(err); else resolve(img);
    };
    const onAbort = () => finish(new Error('aborted'));
    const timer = setTimeout(() => finish(new Error('timeout')), Math.max(500, timeoutMs));

    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    img.onload = () => finish(null);
    img.onerror = () => finish(new Error('tile-error'));
    img.src = url;
  });
}

/**
 * Draw every tile of the projection into an offscreen canvas.
 * Never throws: a failed provider returns `{ ok:false }` so the renderer can
 * switch to a basemap-free layout.
 *
 * When the preferred provider fails, later providers in its fallback chain are
 * tried in turn and the first usable mosaic wins.
 *
 * @returns {Promise<{ok:boolean,reason?:string,canvas?:HTMLCanvasElement,tilesLoaded?:number,tilesTotal?:number,partial?:boolean,attribution:string,providerId?:string,fallbackFrom?:string}>}
 */
async function renderTileMosaic(options = {}) {
  const {
    projection,
    provider = CARD_TILE_PROVIDERS.osm,
    width = 1080,
    height = 1080,
    maxTiles = CARD_MAX_TILES,
    timeoutMs = 6000,
    signal
  } = options;

  if (typeof document === 'undefined') {
    return { ok: false, reason: 'no-dom', attribution: provider.attribution || '' };
  }
  if (!projection || !projection.tiles) {
    return { ok: false, reason: 'no-projection', attribution: provider.attribution || '' };
  }
  if (projection.tiles.count > maxTiles) {
    return { ok: false, reason: 'tile-budget', attribution: provider.attribution || '' };
  }

  let lastResult = { ok: false, reason: 'tiles-unavailable', attribution: '' };
  const chain = getTileFallbackChain(provider.id);
  const candidates = chain.length ? chain : [provider];

  for (const candidate of candidates) {
    lastResult = await drawMosaicForProvider(candidate, {
      projection, width, height, timeoutMs, signal
    });
    if (lastResult.ok) {
      if (candidate.id !== provider.id) {
        lastResult.fallbackFrom = provider.id;
      }
      return lastResult;
    }
  }
  return lastResult;
}

/** Draw one provider's tiles; returns `ok:false` rather than throwing. */
async function drawMosaicForProvider(provider, options) {
  const { projection, width, height, timeoutMs, signal } = options;
  const attribution = provider.attribution || '';
  const requests = tilesForProjection(projection, provider);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, reason: 'no-2d-context', attribution };

  const results = await Promise.all(
    requests.map(tile => loadTileImage(tile.url, timeoutMs, signal)
      .then(img => ({ tile, img }))
      .catch(() => null))
  );

  let loaded = 0;
  for (const result of results) {
    if (!result) continue;
    const { tile, img } = result;
    const tileZoom = tile.z || projection.tileZoom || projection.zoom;
    const drawSize = CARD_TILE_SIZE * Math.pow(2, Math.max(0, (projection.zoom || tileZoom) - tileZoom));
    try {
      ctx.drawImage(
        img,
        tile.x * drawSize + projection.offsetX,
        tile.y * drawSize + projection.offsetY,
        drawSize,
        drawSize
      );
      loaded++;
    } catch (err) {
      // A tainted canvas would throw here — treat as unavailable.
    }
  }

  if (!loaded) {
    return { ok: false, reason: 'tiles-unavailable', attribution, tilesTotal: requests.length };
  }

  return {
    ok: true,
    canvas,
    tilesLoaded: loaded,
    tilesTotal: requests.length,
    partial: loaded < requests.length,
    attribution,
    providerId: provider.id
  };
}

const CARD_MAP_API = {
  CARD_TILE_SIZE,
  CARD_MAX_TILES,
  CARD_TILE_PROVIDERS,
  CARD_TILE_PROVIDER_IDS,
  CARD_TILE_FALLBACKS,
  getTileProvider,
  getTileFallbackChain,
  tileWorldSize,
  lngToWorldX,
  latToWorldY,
  worldXToLng,
  worldYToLat,
  bboxWorldRect,
  chooseZoom,
  tileRangeForBbox,
  fitZoomToTileBudget,
  buildProjection,
  computeCardBbox,
  tilesForProjection,
  loadTileImage,
  renderTileMosaic
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CARD_MAP_API;
}
if (typeof window !== 'undefined') {
  window.CardMap = CARD_MAP_API;
}