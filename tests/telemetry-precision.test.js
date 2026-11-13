const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBattery, normalizeSpeedKmh } = require('../public/js/lib/utils');

test('Telemetry Precision & Battery Normalization Engine', async (t) => {
  await t.test('normalizeBattery: handles standard percentages (0-100)', () => {
    assert.equal(normalizeBattery(100), 100);
    assert.equal(normalizeBattery(85), 85);
    assert.equal(normalizeBattery(0), 0);
    assert.equal(normalizeBattery('75'), 75);
    assert.equal(normalizeBattery('92%'), 92);
  });

  await t.test('normalizeBattery: handles normalized fractions (0.0 - 1.0)', () => {
    assert.equal(normalizeBattery(0.85), 85);
    assert.equal(normalizeBattery(0.50), 50);
    assert.equal(normalizeBattery(1.0), 100);
    assert.equal(normalizeBattery(0.05), 5);
  });

  await t.test('normalizeBattery: converts Li-ion single-cell voltage (2.8V - 4.5V) accurately', () => {
    // 4.20V should be 100%
    assert.equal(normalizeBattery(4.20), 100);
    // 3.825V should be ~50%
    const mid = normalizeBattery(3.825);
    assert.ok(mid >= 48 && mid <= 52, `Expected ~50%, got ${mid}`);
    // 3.45V should be 0%
    assert.equal(normalizeBattery(3.45), 0);
    // Voltage below 3.45V is clamped to 0%
    assert.equal(normalizeBattery(3.20), 0);
  });

  await t.test('normalizeBattery: converts millivolts (2500mV - 5000mV)', () => {
    assert.equal(normalizeBattery(4200), 100);
    const mid = normalizeBattery(3825);
    assert.ok(mid >= 48 && mid <= 52, `Expected ~50%, got ${mid}`);
    assert.equal(normalizeBattery(3400), 0);
  });

  await t.test('normalizeBattery: handles 12V vehicle battery systems', () => {
    assert.equal(normalizeBattery(12.8), 100);
    assert.equal(normalizeBattery(12.3), 50);
    assert.equal(normalizeBattery(11.5), 0);
  });

  await t.test('normalizeBattery: safely handles invalid or missing inputs', () => {
    assert.equal(normalizeBattery(null), null);
    assert.equal(normalizeBattery(undefined), null);
    assert.equal(normalizeBattery(''), null);
    assert.equal(normalizeBattery('abc'), null);
    assert.equal(normalizeBattery(-10), null);
  });

  await t.test('normalizeSpeedKmh: converts knots to km/h correctly', () => {
    // 10 knots = 18.52 km/h -> 18.5 km/h
    assert.equal(normalizeSpeedKmh(10, false), 18.5);
    // 15 knots = 27.78 km/h -> 27.8 km/h
    assert.equal(normalizeSpeedKmh(15, false), 27.8);
  });

  await t.test('normalizeSpeedKmh: preserves km/h when isKmh is true', () => {
    assert.equal(normalizeSpeedKmh(25.4, true), 25.4);
    assert.equal(normalizeSpeedKmh(32.0, true), 32.0);
  });

  await t.test('normalizeSpeedKmh: applies low-speed deadband to eliminate GPS drift', () => {
    // Speeds below 1.8 km/h (walking/GPS jitter while stopped) clamp to 0
    assert.equal(normalizeSpeedKmh(0.5, true), 0);
    assert.equal(normalizeSpeedKmh(1.2, true), 0);
    assert.equal(normalizeSpeedKmh(1.7, true), 0);
    assert.equal(normalizeSpeedKmh(0, true), 0);
    assert.ok(normalizeSpeedKmh(2.0, true) >= 2.0);
  });

  await t.test('normalizeSpeedKmh: caps realistic cycling speeds at 90 km/h', () => {
    assert.equal(normalizeSpeedKmh(120, true), 90);
    assert.equal(normalizeSpeedKmh(95, true), 90);
  });

  await t.test('Speed Smoothing EMA Model: ensures instant stop and smooth cruising', () => {
    let smoothedSpeed = 0;
    const ALPHA = 0.45;

    function applyEma(target) {
      if (target === 0) {
        smoothedSpeed = 0;
      } else if (smoothedSpeed === 0) {
        smoothedSpeed = target;
      } else {
        smoothedSpeed = (target * ALPHA) + (smoothedSpeed * (1 - ALPHA));
      }
      return Math.round(smoothedSpeed * 10) / 10;
    }

    // 1. Instant acceleration from standstill
    assert.equal(applyEma(25.0), 25.0, 'Immediate response from 0');

    // 2. High frequency jitter smoothing while cruising around 25 km/h
    const spike = applyEma(28.0); // GPS spike
    assert.ok(spike < 28.0 && spike > 25.0, `Spike should be damped, got ${spike}`);
    assert.equal(spike, 26.4); // 28 * 0.45 + 25 * 0.55 = 12.6 + 13.75 = 26.35 -> 26.4

    // 3. Instant zero when rider stops at checkpoint
    assert.equal(applyEma(0), 0, 'Instant zero at stop without lag');
  });

  await t.test('Garmin/Wahoo Style Average Moving Speed Calculation', () => {
    function computeAvgSpeed(coveredKm, movingSeconds, speedSamples, currentSpeed) {
      const movingHours = movingSeconds / 3600;
      if (movingHours > (10 / 3600) && coveredKm > 0.05) {
        return Math.round((coveredKm / movingHours) * 10) / 10;
      } else if (speedSamples.length > 0) {
        return Math.round((speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length) * 10) / 10;
      }
      return currentSpeed;
    }

    // 15 km in 30 minutes (1800s) = 30 km/h
    assert.equal(computeAvgSpeed(15.0, 1800, [29, 31], 30), 30.0);

    // 20 km in 45 minutes (2700s) = 26.66... -> 26.7 km/h
    assert.equal(computeAvgSpeed(20.0, 2700, [], 25), 26.7);

    // Initial ride start fallback
    assert.equal(computeAvgSpeed(0.01, 5, [22, 24], 23), 23.0);
  });
});

