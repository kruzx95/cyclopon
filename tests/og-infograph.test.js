const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');
const FastCanvas = require('../lib/fast-canvas');
const {
  getOgData,
  generateOgSvg,
  generateOgPng,
  getOgMetadata,
  getHomeOgData,
  generateHomeOgSvg,
  generateHomeOgPng,
  getHomeOgMetadata,
  injectOgMeta
} = require('../lib/og-infograph');

describe('Social Media Infograph & Open Graph Engine', () => {
  let testEventId;
  let testRiderBib = '777';

  test('setup test event and rider', () => {
    const ev = db.createEvent.run({ name: 'Infograph Test GPX Loop', date: '2026-11-20' });
    testEventId = ev.lastInsertRowid;
    assert.ok(testEventId > 0);

    const rider = db.createRider.run({
      event_id: testEventId,
      bib: testRiderBib,
      name: 'Bintang Goweser',
      pin: '5555',
      role: 'marshall',
      color: '#00E5FF'
    });
    assert.ok(rider.lastInsertRowid > 0);
  });

  test('FastCanvas produces valid PNG buffer with correct magic header', () => {
    const canvas = new FastCanvas(200, 100);
    canvas.fillRect(0, 0, 200, 100, 11, 15, 25);
    canvas.drawText('CYCLOPON', 10, 10, 2, 0, 229, 255);
    canvas.drawBadge('LIVE', 10, 40, 200, 30, 30, 255, 255, 255, 1);

    const png = canvas.toPng();
    assert.ok(Buffer.isBuffer(png));
    assert.ok(png.length > 50);

    // PNG signature: 137, 80, 78, 71, 13, 10, 26, 10
    const expectedSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual(png.subarray(0, 8), expectedSig);
  });

  test('getOgData returns accurate event and rider data', () => {
    const dataEvent = getOgData(testEventId);
    assert.ok(dataEvent);
    assert.equal(dataEvent.event.name, 'Infograph Test GPX Loop');
    assert.equal(dataEvent.totalRiders, 1);

    const dataRider = getOgData(testEventId, testRiderBib);
    assert.ok(dataRider.rider);
    assert.equal(dataRider.rider.name, 'Bintang Goweser');
    assert.equal(dataRider.rider.bib, testRiderBib);
  });

  test('generateOgSvg outputs valid, high-resolution SVG markup', () => {
    const dataRider = getOgData(testEventId, testRiderBib);
    const svg = generateOgSvg(dataRider);

    assert.ok(svg.includes('<svg width="1200" height="630"'));
    assert.ok(svg.includes('Bintang Goweser'));
    assert.ok(svg.includes('#777'));
    assert.ok(svg.includes('Infograph Test GPX Loop'));
    assert.ok(svg.includes('CYCLOPON'));
    assert.ok(svg.endsWith('</svg>'));
  });

  test('generateOgPng creates valid 1200x630 PNG image for social media crawlers', () => {
    const dataRider = getOgData(testEventId, testRiderBib);
    const png = generateOgPng(dataRider);

    assert.ok(Buffer.isBuffer(png));
    assert.ok(png.length > 5000); // Realistic compressed card size

    const expectedSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual(png.subarray(0, 8), expectedSig);
  });

  test('getOgMetadata generates full suite of Open Graph and Twitter Card tags', () => {
    const dataRider = getOgData(testEventId, testRiderBib);
    const meta = getOgMetadata(dataRider, 'cyclopon.my.id', 'https');

    assert.ok(meta.title.includes('#777 Bintang Goweser'));
    assert.ok(meta.title.includes('Infograph Test GPX Loop'));
    assert.ok(meta.description.includes('Bintang Goweser'));
    assert.equal(meta.pageUrl, `https://cyclopon.my.id/watch/${testEventId}?bib=777`);
    assert.equal(meta.imageUrl, `https://cyclopon.my.id/api/og/events/${testEventId}.png?bib=777`);

    assert.ok(meta.tags.includes('property="og:title"'));
    assert.ok(meta.tags.includes('property="og:image"'));
    assert.ok(meta.tags.includes('name="twitter:card" content="summary_large_image"'));
  });

  test('injectOgMeta correctly inserts dynamic tags into index.html without breaking scripts', () => {
    const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <title>CycloPon Live Tracker</title>
  <meta name="description" content="Old description">
  <link rel="stylesheet" href="/style.css">
</head>
<body><div id="app"></div></body>
</html>`;

    const dataRider = getOgData(testEventId, testRiderBib);
    const meta = getOgMetadata(dataRider, 'cyclopon.my.id', 'https');
    const result = injectOgMeta(sampleHtml, meta);

    assert.ok(result.includes(`<title>${meta.title}</title>`));
    assert.ok(result.includes(`content="${meta.description}"`));
    assert.ok(result.includes('property="og:image"'));
    assert.ok(result.includes('name="twitter:card"'));
    assert.ok(result.includes('<div id="app"></div>'));
  });

  test('Home / Root domain OG generation produces valid SVG, PNG and metadata', () => {
    const homeData = getHomeOgData();
    assert.ok(homeData);

    const homeSvg = generateHomeOgSvg(homeData);
    assert.ok(homeSvg.includes('<svg width="1200" height="630"'));
    assert.ok(homeSvg.includes('CYCLOPON LIVE TRACKER'));
    assert.ok(homeSvg.endsWith('</svg>'));

    const homePng = generateHomeOgPng(homeData);
    assert.ok(Buffer.isBuffer(homePng));
    assert.ok(homePng.length > 5000);
    const expectedSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual(homePng.subarray(0, 8), expectedSig);

    const homeMeta = getHomeOgMetadata(homeData, 'cyclopon.my.id', 'https');
    assert.ok(homeMeta.title.includes('CycloPon'));
    assert.equal(homeMeta.imageUrl, 'https://cyclopon.my.id/api/og/home.png');
    assert.equal(homeMeta.pageUrl, 'https://cyclopon.my.id/');
  });

  test('teardown test event', () => {
    if (testEventId) {
      db.deleteEvent.run(testEventId);
    }
  });
});
