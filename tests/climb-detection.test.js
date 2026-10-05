const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectClimbs,
  getLiveGrade,
  getCurrentClimbStatus
} = require('../public/js/lib/gpx-utils.js');

test('GPX Climb Detection & Grade Engine', async (t) => {

  await t.test('detects climbs with correct categories and attributes', () => {
    // Generate synthetic route:
    // 0 - 5 km: flat (elevation 50m)
    // 5 - 8 km: Climb 1 (Cat 3: 3 km, 210m gain, 7% grade, ele 50m -> 260m)
    // 8 - 12 km: downhill / flat (ele 260m -> 80m)
    // 12 - 20 km: Climb 2 (Cat 1: 8 km, 680m gain, 8.5% grade, ele 80m -> 760m)
    // 20 - 25 km: flat
    const points = [];
    const stepKm = 0.05; // 50m resolution
    let currentDist = 0;
    let currentEle = 50;

    for (let d = 0; d <= 25; d += stepKm) {
      const distKm = Math.round(d * 100) / 100;
      if (distKm <= 5) {
        currentEle = 50;
      } else if (distKm <= 8) {
        // 5 to 8 km: gain 210m over 3km
        currentEle = 50 + ((distKm - 5) / 3) * 210;
      } else if (distKm <= 12) {
        // 8 to 12 km: drop from 260 to 80m
        currentEle = 260 - ((distKm - 8) / 4) * 180;
      } else if (distKm <= 20) {
        // 12 to 20 km: gain 680m over 8km
        currentEle = 80 + ((distKm - 12) / 8) * 680;
      } else {
        currentEle = 760;
      }

      points.push({
        lat: -7.0 + distKm * 0.005,
        lng: 110.0 + distKm * 0.005,
        ele: Math.round(currentEle * 10) / 10,
        distKm,
        gradePct: 0
      });
    }

    const climbs = detectClimbs(points);
    assert.ok(Array.isArray(climbs), 'climbs should be an array');
    assert.strictEqual(climbs.length, 2, 'should detect exactly 2 climbs');

    const c1 = climbs[0];
    assert.strictEqual(c1.id, 1);
    assert.strictEqual(c1.category, 'CAT 3', 'First climb should be CAT 3');
    assert.ok(Math.abs(c1.startKm - 5.0) < 0.2, `c1 startKm (~5.0) got ${c1.startKm}`);
    assert.ok(Math.abs(c1.endKm - 8.0) < 0.2, `c1 endKm (~8.0) got ${c1.endKm}`);
    assert.ok(c1.elevGain >= 200, `c1 elevGain should be >= 200m, got ${c1.elevGain}`);
    assert.ok(c1.avgGrade >= 6.5, `c1 avgGrade should be ~7%, got ${c1.avgGrade}`);

    const c2 = climbs[1];
    assert.strictEqual(c2.id, 2);
    assert.strictEqual(c2.category, 'CAT 1', 'Second climb should be CAT 1');
    assert.ok(Math.abs(c2.startKm - 12.0) < 0.2, `c2 startKm (~12.0) got ${c2.startKm}`);
    assert.ok(Math.abs(c2.endKm - 20.0) < 0.2, `c2 endKm (~20.0) got ${c2.endKm}`);
    assert.ok(c2.elevGain >= 650, `c2 elevGain should be >= 650m, got ${c2.elevGain}`);
  });

  await t.test('returns empty array on flat routes without error', () => {
    const flatPoints = [];
    for (let d = 0; d <= 10; d += 0.1) {
      flatPoints.push({
        lat: -7.0,
        lng: 110.0,
        ele: 15,
        distKm: Math.round(d * 10) / 10,
        gradePct: 0
      });
    }

    const climbs = detectClimbs(flatPoints);
    assert.deepStrictEqual(climbs, [], 'Flat route should have 0 climbs');

    const emptyClimbs = detectClimbs([]);
    assert.deepStrictEqual(emptyClimbs, [], 'Empty points should return []');
  });

  await t.test('getLiveGrade returns correct instantaneous grade % and elevation', () => {
    const points = [
      { distKm: 0.0, ele: 100 },
      { distKm: 0.1, ele: 108 }, // +8m over 100m = +8%
      { distKm: 0.2, ele: 116 },
      { distKm: 0.3, ele: 110 }, // -6m over 100m = -6%
      { distKm: 0.4, ele: 110 }  // 0%
    ];

    const g1 = getLiveGrade(0.1, points);
    assert.strictEqual(g1.ele, 108);
    assert.ok(g1.gradePct > 6 && g1.gradePct < 9, `Grade should be ~8%, got ${g1.gradePct}`);

    const gDown = getLiveGrade(0.28, points);
    assert.ok(gDown.gradePct < 0, `Grade should be negative on downhill, got ${gDown.gradePct}`);

    const gFlat = getLiveGrade(0.38, points);
    assert.strictEqual(Math.round(gFlat.gradePct), 0);
  });

  await t.test('getCurrentClimbStatus tracks upcoming, active, and completed climbs', () => {
    const climbs = [
      {
        id: 1,
        name: 'Tanjakan 1',
        category: 'CAT 3',
        color: '#F59E0B',
        startKm: 10.0,
        endKm: 13.0,
        lengthKm: 3.0,
        elevGain: 200,
        startEle: 100,
        topEle: 300,
        avgGrade: 6.7
      }
    ];

    // Case 1: 500m before climb start -> not yet in upcoming threshold (threshold = 300m / 0.3km)
    const stFar = getCurrentClimbStatus(9.4, climbs);
    assert.strictEqual(stFar.activeClimb, null);

    // Case 2: 200m before climb start -> Upcoming!
    const stNear = getCurrentClimbStatus(9.8, climbs);
    assert.ok(stNear.activeClimb !== null);
    assert.strictEqual(stNear.isUpcoming, true);
    assert.strictEqual(stNear.distRemainingKm, 3.2);

    // Case 3: Midway up climb at KM 11.5
    const stMid = getCurrentClimbStatus(11.5, climbs);
    assert.ok(stMid.activeClimb !== null);
    assert.strictEqual(stMid.isUpcoming, false);
    assert.strictEqual(stMid.distRemainingKm, 1.5);
    assert.ok(stMid.elevRemainingM > 0, `Elev remaining should be > 0, got ${stMid.elevRemainingM}`);

    // Case 4: Past summit at KM 13.5
    const stPast = getCurrentClimbStatus(13.5, climbs);
    assert.strictEqual(stPast.activeClimb, null);
  });

});
