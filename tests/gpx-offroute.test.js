const test = require('node:test');
const assert = require('node:assert/strict');
const { checkOffRoute, haversineKm } = require('../public/js/lib/gpx-utils');

test('GPX Off-Route Detection Math', async (t) => {
  // A straight route from point A to B
  // [-6.9147, 107.6098] to [-6.9200, 107.6098]
  const route = [
    [-6.9147, 107.6098],
    [-6.9160, 107.6098],
    [-6.9180, 107.6098],
    [-6.9200, 107.6098]
  ];

  await t.test('rider exactly on route returns isOffRoute: false', () => {
    const result = checkOffRoute(-6.9160, 107.6098, route, 100);
    assert.equal(result.isOffRoute, false);
    assert.ok(result.deviationMeters <= 5);
  });

  await t.test('rider 30m away from route is within 100m tolerance', () => {
    // Shifting longitude slightly (~0.0003 deg is ~33m at equator/tropics)
    const result = checkOffRoute(-6.9160, 107.6101, route, 100);
    assert.equal(result.isOffRoute, false);
    assert.ok(result.deviationMeters > 10);
    assert.ok(result.deviationMeters <= 100);
  });

  await t.test('rider 250m away from route triggers isOffRoute: true', () => {
    // Shifting longitude by ~0.0025 deg (~275m)
    const result = checkOffRoute(-6.9160, 107.6125, route, 100);
    assert.equal(result.isOffRoute, true);
    assert.ok(result.deviationMeters > 100);
  });

  await t.test('empty route returns isOffRoute: false', () => {
    const result = checkOffRoute(-6.9160, 107.6098, [], 100);
    assert.equal(result.isOffRoute, false);
    assert.equal(result.deviationMeters, 0);
  });
});
