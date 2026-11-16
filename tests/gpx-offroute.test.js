const test = require('node:test');
const assert = require('node:assert/strict');
const { checkOffRoute, haversineKm, findNearestRoutePoint, totalRouteKm } = require('../public/js/lib/gpx-utils');

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

test('Loop Course False Finish Protection in findNearestRoutePoint', async (t) => {
  // Generate a circular/loop route of 30 points (approx 2.8 km loop)
  // Center: [-7.3300, 108.2200], Radius: ~0.004 deg (~450m)
  const centerLat = -7.3300;
  const centerLng = 108.2200;
  const numPts = 30;
  const loopRoute = [];

  for (let i = 0; i < numPts; i++) {
    const angle = (i / numPts) * 2 * Math.PI;
    const lat = centerLat + 0.004 * Math.sin(angle);
    const lng = centerLng + 0.004 * Math.cos(angle);
    loopRoute.push([lat, lng]);
  }
  // Close the loop (finish = start)
  loopRoute.push([loopRoute[0][0], loopRoute[0][1]]);
  const totalKm = totalRouteKm(loopRoute);

  await t.test('rider at start line of loop route snaps to 0 km (0%), not finish', () => {
    // At start point
    const res = findNearestRoutePoint(loopRoute[0][0], loopRoute[0][1], loopRoute, totalKm, null, 0);
    assert.equal(res.index, 0);
    assert.equal(res.progressPct, 0);
    assert.equal(res.distanceKm, 0);
  });

  await t.test('rider 3.2 km off-route (e.g. at home before race) snaps to start (0%), not finish', () => {
    // Coordinate 3 km north of loop center
    const offLat = centerLat + 0.0300;
    const offLng = centerLng;
    const res = findNearestRoutePoint(offLat, offLng, loopRoute, totalKm, null, 0);
    assert.equal(res.index, 0);
    assert.equal(res.progressPct, 0);
    assert.equal(res.distanceKm, 0);
  });

  await t.test('rider legitimately approaching finish with established progress stays near finish', () => {
    // Point at 90% of loop (index 27 of 30)
    const nearFinishPt = loopRoute[27];
    // Previous established progress at 80% (index 24) and cumulative distance 2.4 km
    const res = findNearestRoutePoint(nearFinishPt[0], nearFinishPt[1], loopRoute, totalKm, 24, 2.4);
    assert.ok(res.index >= 25, 'Should snap to near finish point');
    assert.ok(res.progressPct >= 75, 'Progress should reflect near finish');
    assert.ok(res.distanceKm >= 2.0, 'Distance should reflect near finish');
  });
});
