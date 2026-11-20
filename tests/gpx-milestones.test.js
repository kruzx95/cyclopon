const test = require('node:test');
const assert = require('node:assert/strict');
const { extractKilometerMilestones } = require('../public/js/lib/gpx-utils');

test('GPX Kilometer Milestones Extraction', async (t) => {
  await t.test('returns empty array when points are empty or fewer than 2', () => {
    assert.deepEqual(extractKilometerMilestones([], 10), []);
    assert.deepEqual(extractKilometerMilestones([{ lat: -6.9, lng: 107.6, distKm: 0 }], 10), []);
    assert.deepEqual(extractKilometerMilestones(null, 10), []);
  });

  await t.test('returns empty array when totalKm is less than 1', () => {
    const pts = [
      { lat: -6.91, lng: 107.61, distKm: 0 },
      { lat: -6.92, lng: 107.61, distKm: 0.8 }
    ];
    assert.deepEqual(extractKilometerMilestones(pts, 0.8), []);
  });

  await t.test('accurately interpolates KM points along route', () => {
    // 5 km straight line going south
    // Point 0 at lat -6.900000 (0 km)
    // Point 1 at lat -6.920000 (2 km)
    // Point 2 at lat -6.950000 (5 km)
    const points = [
      { lat: -6.900000, lng: 107.600000, distKm: 0 },
      { lat: -6.920000, lng: 107.600000, distKm: 2 },
      { lat: -6.950000, lng: 107.600000, distKm: 5 }
    ];

    const milestones = extractKilometerMilestones(points, 5.2);
    assert.equal(milestones.length, 5);

    // KM 1: halfway between p0 and p1 -> lat -6.910000
    assert.equal(milestones[0].km, 1);
    assert.equal(milestones[0].lat, -6.910000);
    assert.equal(milestones[0].lng, 107.600000);

    // KM 2: exactly at p1 -> lat -6.920000
    assert.equal(milestones[1].km, 2);
    assert.equal(milestones[1].lat, -6.920000);

    // KM 3: 1/3 of the way between p1 and p2 -> -6.92 + (1/3)*(-0.03) = -6.930000
    assert.equal(milestones[2].km, 3);
    assert.equal(milestones[2].lat, -6.930000);

    // KM 4: 2/3 of the way between p1 and p2 -> -6.92 + (2/3)*(-0.03) = -6.940000
    assert.equal(milestones[3].km, 4);
    assert.equal(milestones[3].lat, -6.940000);

    // KM 5: exactly at p2 -> lat -6.950000
    assert.equal(milestones[4].km, 5);
    assert.equal(milestones[4].lat, -6.950000);
  });
});
