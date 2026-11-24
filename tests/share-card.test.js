const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const model = require('../public/js/lib/card-model');
const cardMap = require('../public/js/lib/card-map');
const templates = require('../public/js/lib/card-templates');
const renderer = require('../public/js/lib/card-renderer');
const gpxUtils = require('../public/js/lib/gpx-utils');

// 3 short segments (111 m each, 30 s apart) + one 10-minute coffee stop.
const GPX_WITH_TIME = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="cyclopon-test">
  <trk><name>Test Ride</name><trkseg>
    <trkpt lat="0.000" lon="0.000"><ele>100</ele><time>2026-11-24T05:00:00Z</time></trkpt>
    <trkpt lat="0.000" lon="0.001"><ele>110</ele><time>2026-11-24T05:00:30Z</time></trkpt>
    <trkpt lat="0.000" lon="0.002"><ele>120</ele><time>2026-11-24T05:01:00Z</time></trkpt>
    <trkpt lat="0.000" lon="0.003"><ele>130</ele><time>2026-11-24T05:01:30Z</time></trkpt>
    <trkpt lat="0.000" lon="0.003"><ele>130</ele><time>2026-11-24T05:11:30Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

const GPX_NO_TIME = `<gpx><trk><trkseg>
  <trkpt lat="-6.900" lon="107.600"><ele>700</ele></trkpt>
  <trkpt lat="-6.901" lon="107.601"><ele>705</ele></trkpt>
  <trkpt lat="-6.902" lon="107.602"><ele>710</ele></trkpt>
</trkseg></trk></gpx>`;

const TCX_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="Biking"><Lap><Track>
    <Trackpoint>
      <Time>2026-11-24T05:00:00Z</Time>
      <Position><LatitudeDegrees>0.000</LatitudeDegrees><LongitudeDegrees>0.000</LongitudeDegrees></Position>
      <AltitudeMeters>100</AltitudeMeters>
    </Trackpoint>
    <Trackpoint>
      <Time>2026-11-24T05:00:30Z</Time>
      <Position><LatitudeDegrees>0.000</LatitudeDegrees><LongitudeDegrees>0.001</LongitudeDegrees></Position>
      <AltitudeMeters>104</AltitudeMeters>
    </Trackpoint>
    <Trackpoint>
      <Time>2026-11-24T05:01:00Z</Time>
      <Position><LatitudeDegrees>0.000</LatitudeDegrees><LongitudeDegrees>0.002</LongitudeDegrees></Position>
      <AltitudeMeters>108</AltitudeMeters>
    </Trackpoint>
  </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`;

test('share card — formatting helpers', async (t) => {
  await t.test('formatDuration covers seconds, minutes, hours and empty values', () => {
    assert.equal(model.formatDuration(0), '0m');
    assert.equal(model.formatDuration(45), '45s');
    assert.equal(model.formatDuration(59), '59s');
    assert.equal(model.formatDuration(60), '1m');
    assert.equal(model.formatDuration(7020), '1h 57m');
    assert.equal(model.formatDuration(3600), '1h');
    assert.equal(model.formatDuration(null), null);
    assert.equal(model.formatDuration(undefined), null);
  });

  await t.test('distance and speed never render NaN', () => {
    assert.equal(model.formatDistance(45.594), '45.59');
    assert.equal(model.formatDistance(0), '0.00');
    assert.equal(model.formatDistance(undefined), '0.00');
    assert.equal(model.formatSpeed(21.04), '21.0');
    assert.equal(model.formatSpeed(null), '—');
  });

  await t.test('formatDateId is UTC-stable', () => {
    assert.equal(model.formatDateId('2026-11-24T05:12:30.000Z'), '24 NOV 2026');
    assert.equal(model.formatDateId('2026-01-02T23:30:00.000Z'), '02 JAN 2026');
    assert.equal(model.formatDateId(null), null);
    assert.equal(model.formatDateId('bukan tanggal'), null);
  });
});

test('share card — GPX parsing and metrics', async (t) => {
  await t.test('reads lat/lon, elevation and <time> per trkpt', () => {
    const points = model.parseGpxActivity(GPX_WITH_TIME);
    assert.equal(points.length, 5);
    assert.deepEqual(points[0], { lat: 0, lng: 0, ele: 100, time: Date.parse('2026-11-24T05:00:00Z') });
    assert.equal(points.filter(point => point.time !== null).length, 5);
  });

  await t.test('computes distance, elevation gain and moving time', () => {
    const built = model.buildCardModel({ fileName: 'test-ride.gpx', text: GPX_WITH_TIME });
    assert.equal(built.source, 'gpx');
    assert.equal(built.stats.distanceKm, 0.33);
    assert.equal(built.stats.elevGainM, 30);
    assert.equal(built.stats.minEle, 100);
    assert.equal(built.stats.maxEle, 130);
    assert.equal(built.stats.elapsedSec, 690);
    assert.equal(built.hasTime, true);
    assert.equal(built.startedAt, '2026-11-24T05:00:00.000Z');
  });

  await t.test('discards the 10-minute stop from moving time', () => {
    const stats = model.computeTrackStats(model.parseGpxActivity(GPX_WITH_TIME));
    assert.equal(stats.movingSec, 90);
    assert.equal(stats.elapsedSec, 690);
    assert.equal(stats.avgKmh, 13.3);
    assert.ok(stats.maxKmh >= 13 && stats.maxKmh <= 14, `unexpected maxKmh ${stats.maxKmh}`);
  });

  await t.test('falls back gracefully when the file has no timestamps', () => {
    const built = model.buildCardModel({ fileName: 'no-time.gpx', text: GPX_NO_TIME });
    assert.equal(built.hasTime, false);
    assert.equal(built.startedAt, null);
    assert.equal(built.stats.movingSec, 0);
    assert.equal(built.stats.elapsedSec, 0);
    assert.equal(built.stats.avgKmh, null);
    assert.equal(model.formatDuration(built.stats.movingSec), '0m');
    assert.equal(model.formatDateId(built.startedAt), null);
    assert.equal(built.hasElevation, true);
  });

  await t.test('supports route points (<rtept>) as well as tracks', () => {
    const rte = `<gpx><rte>
      <rtept lat="1.0" lon="1.0"><ele>10</ele></rtept>
      <rtept lat="1.001" lon="1.001"><ele>12</ele></rtept>
    </rte></gpx>`;
    const points = model.parseGpxActivity(rte);
    assert.equal(points.length, 2);
    assert.equal(points[1].ele, 12);
  });
});
test('share card — TCX parsing', async (t) => {
  await t.test('reads Trackpoint time/position/altitude', () => {
    const points = model.parseTcxActivity(TCX_SAMPLE);
    assert.equal(points.length, 3);
    assert.equal(points[0].lat, 0);
    assert.equal(points[2].lng, 0.002);
    assert.equal(points[2].ele, 108);
    assert.equal(points[1].time, Date.parse('2026-11-24T05:00:30Z'));
  });

  await t.test('builds a complete model from a .tcx file', () => {
    const built = model.buildCardModel({ fileName: 'Morning_Ride.tcx', text: TCX_SAMPLE });
    assert.equal(built.source, 'tcx');
    assert.equal(built.title, 'Morning Ride');
    assert.equal(built.stats.distanceKm, 0.22);
    assert.equal(built.stats.elevGainM, 8);
    assert.equal(built.stats.movingSec, 60);
    assert.equal(built.stats.avgKmh, 13.3);
    assert.equal(built.hasTime, true);
    assert.equal(built.hasElevation, true);
  });

  await t.test('detects format from file name even without a readable root tag', () => {
    assert.equal(model.detectActivityFormat('ride.GPX', 'bukan xml'), 'gpx');
    assert.equal(model.detectActivityFormat('ride.tcx', 'bukan xml'), 'tcx');
    assert.equal(model.detectActivityFormat('ride.fit', 'bukan xml'), null);
  });
});

test('share card — model guards', async (t) => {
  await t.test('rejects unsupported files with a typed error', () => {
    assert.throws(
      () => model.buildCardModel({ fileName: 'catatan.txt', text: 'halo dunia' }),
      (err) => err.code === model.ACTIVITY_ERROR_CODES.UNSUPPORTED_FORMAT
    );
  });

  await t.test('rejects tracks with fewer than two points', () => {
    const single = '<gpx><trk><trkseg><trkpt lat="0" lon="0"></trkpt></trkseg></trk></gpx>';
    assert.throws(
      () => model.buildCardModel({ fileName: 'single.gpx', text: single }),
      (err) => err.code === model.ACTIVITY_ERROR_CODES.EMPTY_ACTIVITY
    );
  });

  await t.test('keeps an explicit title/rider and derives one from the file name', () => {
    const derived = model.buildCardModel({ fileName: 'gravel_loop-2026.gpx', text: GPX_NO_TIME });
    assert.equal(derived.title, 'Gravel Loop 2026');
    assert.equal(derived.riderName, '');

    const explicit = model.buildCardModel({
      fileName: 'x.gpx', text: GPX_NO_TIME, title: '  Gowes Subuh  ', riderName: '  Budi  '
    });
    assert.equal(explicit.title, 'Gowes Subuh');
    assert.equal(explicit.riderName, 'Budi');
  });
});

test('share card — geometry helpers', async (t) => {
  const square = [
    { lat: -6.9, lng: 107.6 },
    { lat: -6.8, lng: 107.7 },
    { lat: -7.0, lng: 107.5 }
  ];

  await t.test('computeBbox returns bounds and centre', () => {
    const bbox = model.computeBbox(square);
    assert.equal(bbox.minLat, -7.0);
    assert.equal(bbox.maxLat, -6.8);
    assert.equal(bbox.minLng, 107.5);
    assert.equal(bbox.maxLng, 107.7);
    assert.ok(Math.abs(bbox.centerLat + 6.9) < 1e-12);
    assert.equal(model.computeBbox([]), null);
  });

  await t.test('simplifyTrack keeps endpoints and respects the budget', () => {
    const long = Array.from({ length: 1000 }, (_, i) => ({ lat: i * 1e-5, lng: i * 1e-5 }));
    const simplified = model.simplifyTrack(long, 420);
    assert.equal(simplified.length, 420);
    assert.deepEqual(simplified[0], long[0]);
    assert.deepEqual(simplified[simplified.length - 1], long[long.length - 1]);
    assert.equal(model.simplifyTrack(long.slice(0, 10), 420).length, 10);
  });

  await t.test('chaikinSmooth preserves endpoints and adds points', () => {
    const input = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 1, lng: 1 }];
    const smoothed = model.chaikinSmooth(input, 1);
    assert.equal(smoothed.length, 6);
    assert.deepEqual(smoothed[0], input[0]);
    assert.deepEqual(smoothed[smoothed.length - 1], input[2]);
  });

  await t.test('formatCaption mentions title, distance and CycloPon', () => {
    const built = model.buildCardModel({ fileName: 'pagi.gpx', text: GPX_WITH_TIME });
    const caption = model.formatCaption(built);
    assert.match(caption, /^Pagi — 0\.33 km/);
    assert.match(caption, /CycloPon/);
  });
});
test('share card — map projection & tiles', async (t) => {
  await t.test('Web Mercator world coordinates match reference values', () => {
    assert.ok(Math.abs(cardMap.lngToWorldX(107.6, 12) - 837695.7155555557) < 1e-6);
    assert.ok(Math.abs(cardMap.latToWorldY(-6.9, 12) - 544434.4625003615) < 1e-6);

    const x = cardMap.lngToWorldX(107.6, 12);
    const y = cardMap.latToWorldY(-6.9, 12);
    assert.equal(Math.floor(x / cardMap.CARD_TILE_SIZE), 3272);
    assert.equal(Math.floor(y / cardMap.CARD_TILE_SIZE), 2126);

    assert.ok(Math.abs(cardMap.worldXToLng(x, 12) - 107.6) < 1e-9);
    assert.ok(Math.abs(cardMap.worldYToLat(y, 12) - (-6.9)) < 1e-9);
  });

  await t.test('chooseZoom picks the deepest zoom that still fits', () => {
    const small = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0.003 };
    assert.equal(cardMap.chooseZoom(small, 1080, 900, 60, 16), 16);

    const indonesia = { minLat: -11, maxLat: 6, minLng: 95, maxLng: 141 };
    assert.equal(cardMap.chooseZoom(indonesia, 1080, 900, 60, 16), 4);
  });

  await t.test('tile range respects the ≤24 tile budget', () => {
    const bbox = { minLat: -7.0, maxLat: -6.8, minLng: 107.5, maxLng: 107.7 };
    const fitted = cardMap.fitZoomToTileBudget(bbox, 16, 24);
    const range = cardMap.tileRangeForBbox(bbox, fitted);
    assert.ok(range.count <= 24, `tile count ${range.count} exceeds budget`);
    assert.ok(fitted < 16, 'zoom should step down for a 20 km bbox');

    const tiny = cardMap.tileRangeForBbox({ minLat: 0, maxLat: 0, minLng: 0, maxLng: 0.0001 }, 16);
    assert.equal(tiny.count, 1);
  });

  await t.test('buildProjection keeps every point inside the padded area', () => {
    const points = [
      { lat: -7.35, lng: 108.19 },
      { lat: -7.31, lng: 108.26 },
      { lat: -7.28, lng: 108.33 }
    ];
    const projection = cardMap.buildProjection(points, 1080, 900, 60, 16, 24);
    assert.ok(projection.zoom >= 1 && projection.zoom <= 16);
    assert.ok(projection.tiles.count <= 24);
    for (const point of points) {
      const [x, y] = projection.toPixel(point.lat, point.lng);
      assert.ok(x >= 59 && x <= 1021, `x ${x} outside padded width`);
      assert.ok(y >= 59 && y <= 841, `y ${y} outside padded height`);
    }
  });

  await t.test('tile providers stay OSM-compliant and unique per request', () => {
    assert.equal(cardMap.CARD_TILE_PROVIDER_IDS.length, 3);
    for (const id of cardMap.CARD_TILE_PROVIDER_IDS) {
      const provider = cardMap.getTileProvider(id);
      assert.ok(provider.url(12, 3272, 2126).startsWith('https://'));
      assert.ok(provider.attribution.length > 0);
    }
    assert.match(cardMap.getTileProvider('osm').attribution, /OpenStreetMap/);
    assert.match(cardMap.getTileProvider('cyclosm').attribution, /OpenStreetMap/);
    assert.equal(cardMap.getTileProvider('tidak-ada').id, 'osm');

    const projection = cardMap.buildProjection([{ lat: 0, lng: 0 }, { lat: 0.001, lng: 0.001 }], 600, 400, 20, 16, 24);
    assert.equal(cardMap.tilesForProjection(projection, cardMap.getTileProvider('osm')).length, projection.tiles.count);
  });

  await t.test('falls back to the next provider when the preferred one fails', async () => {
    assert.deepEqual(cardMap.getTileFallbackChain('cyclosm').map(p => p.id), ['cyclosm', 'osm', 'esri']);
    assert.deepEqual(cardMap.getTileFallbackChain('esri').map(p => p.id), ['esri', 'osm']);
    assert.deepEqual(cardMap.getTileFallbackChain('tidak-ada').map(p => p.id), ['osm', 'esri']);

    const originalDocument = globalThis.document;
    const originalImage = globalThis.Image;
    const created = [];
    const urls = [];

    // Minimal DOM: a canvas whose 2D context counts drawn tiles.
    globalThis.document = {
      createElement(tag) {
        if (tag !== 'canvas') return {};
        const canvas = { width: 0, height: 0, drawn: 0 };
        canvas.getContext = () => ({ drawImage() { canvas.drawn++; } });
        created.push(canvas);
        return canvas;
      }
    };
    // CyclOSM host is unreachable, OSM loads fine.
    globalThis.Image = class {
      set src(value) {
        urls.push(value);
        if (value.includes('cyclosm')) this.onerror && this.onerror();
        else this.onload && this.onload();
      }
    };

    try {
      const projection = cardMap.buildProjection([{ lat: 0, lng: 0 }, { lat: 0.002, lng: 0.002 }], 600, 400, 20, 16, 24);
      const mosaic = await cardMap.renderTileMosaic({
        projection,
        provider: cardMap.getTileProvider('cyclosm'),
        width: 600,
        height: 400
      });

      assert.equal(mosaic.ok, true);
      assert.equal(mosaic.providerId, 'osm');
      assert.equal(mosaic.fallbackFrom, 'cyclosm');
      assert.match(mosaic.attribution, /OpenStreetMap/);
      assert.equal(mosaic.tilesLoaded, projection.tiles.count);
      assert.equal(mosaic.partial, false);
      assert.ok(urls.some(url => url.includes('cyclosm')), 'preferred provider is tried first');
      assert.ok(urls.some(url => url.includes('tile.openstreetmap.org')), 'fallback provider is used');
      assert.equal(created.length, 2, 'one canvas per attempted provider');
      assert.equal(created[0].drawn, 0, 'failed provider draws nothing');
      assert.equal(created[1].drawn, projection.tiles.count);
    } finally {
      globalThis.Image = originalImage;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }
  });

  await t.test('reports every provider failing instead of throwing', async () => {
    const originalDocument = globalThis.document;
    const originalImage = globalThis.Image;
    globalThis.document = {
      createElement() {
        const canvas = { width: 0, height: 0 };
        canvas.getContext = () => ({ drawImage() { throw new Error('tainted'); } });
        return canvas;
      }
    };
    globalThis.Image = class {
      set src(_value) { this.onerror && this.onerror(); }
    };
    try {
      const projection = cardMap.buildProjection([{ lat: 0, lng: 0 }, { lat: 0.002, lng: 0.002 }], 600, 400, 20, 16, 24);
      const mosaic = await cardMap.renderTileMosaic({
        projection,
        provider: cardMap.getTileProvider('cyclosm'),
        width: 600,
        height: 400
      });
      assert.equal(mosaic.ok, false);
      assert.equal(mosaic.reason, 'tiles-unavailable');
    } finally {
      globalThis.Image = originalImage;
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
    }
  });
});
test('share card — templates & sizes', async (t) => {
  await t.test('ships three distinct themes', () => {
    assert.equal(templates.CARD_TEMPLATES.length, 3);
    const ids = templates.CARD_TEMPLATES.map(template => template.id);
    assert.deepEqual(ids, ['night-neon', 'paper-topo', 'brutalist-mono']);
    assert.equal(new Set(templates.CARD_TEMPLATES.map(template => template.palette.bgTop)).size, 3);
    assert.equal(templates.CARD_TEMPLATES.filter(template => template.map.enabled).length, 2);
    assert.equal(templates.getCardTemplate('brutalist-mono').map.enabled, false);
  });

  await t.test('exposes Story / Feed / Square at 1080 px wide', () => {
    assert.deepEqual(templates.CARD_SIZE_ORDER, ['story', 'feed', 'square']);
    for (const sizeId of templates.CARD_SIZE_ORDER) {
      assert.equal(templates.getCardSize(sizeId).width, 1080);
    }
    assert.equal(templates.getCardSize('story').height, 1920);
    assert.equal(templates.getCardSize('feed').height, 1350);
    assert.equal(templates.getCardSize('square').height, 1080);
    assert.equal(templates.getCardSize('nope').id, 'story');
  });

  await t.test('metricsFor scales typography and never returns sub-pixel fonts', () => {
    const story = templates.metricsFor(templates.getCardSize('story'));
    assert.equal(story.base, 1);
    assert.ok(story.pad > 0 && story.titleFont > 0 && story.heroFont > 0);
    assert.ok(story.heroFont <= 1920 * 0.135 + 1);
  });
});

test('share card — renderer entry guards', async (t) => {
  await t.test('rejects a missing canvas before touching the DOM', async () => {
    await assert.rejects(
      () => renderer.renderActivityCard({ canvas: null, model: { points: [] } }),
      /Canvas tidak tersedia/
    );
  });

  await t.test('rejects an invalid model', async () => {
    await assert.rejects(
      () => renderer.renderActivityCard({ canvas: { getContext() { return {}; } }, model: { points: [] } }),
      /Model aktivitas tidak valid/
    );
  });
});

test('share card — real GPX fixture stays consistent with gpx-utils', async (t) => {
  const filePath = path.join(__dirname, '..', 'public', 'gpx', '437.gpx');
  if (!fs.existsSync(filePath)) {
    t.skip('public/gpx/437.gpx not present');
    return;
  }
  const text = fs.readFileSync(filePath, 'utf8');

  await t.test('elevation gain matches parseGpxData exactly', () => {
    const built = model.buildCardModel({ fileName: '437.gpx', text });
    const legacy = gpxUtils.parseGpxData(text);
    assert.equal(built.stats.elevGainM, legacy.stats.elevGain);
    assert.equal(built.stats.elevLossM, legacy.stats.elevLoss);
    assert.ok(Math.abs(built.stats.distanceKm - legacy.stats.totalKm) < 0.1, 'distance should match within 0.1 km');
  });

  await t.test('timestamps create a plausible moving/elapsed split', () => {
    const built = model.buildCardModel({ fileName: '437.gpx', text });
    assert.equal(built.hasTime, true);
    assert.ok(built.stats.movingSec > 0);
    assert.ok(built.stats.movingSec < built.stats.elapsedSec, 'moving time must exclude stops');
    assert.ok(built.stats.avgKmh > 5 && built.stats.avgKmh < 45, `unexpected avg ${built.stats.avgKmh}`);
    assert.match(built.startedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  await t.test('the card projection stays inside the tile budget', () => {
    const built = model.buildCardModel({ fileName: '437.gpx', text });
    const projection = cardMap.buildProjection(built.points, 1080, 1190, 74, 16, 24);
    assert.ok(projection.tiles.count <= 24);
    assert.ok(projection.zoom >= 10 && projection.zoom <= 16, `unexpected zoom ${projection.zoom}`);
  });
});