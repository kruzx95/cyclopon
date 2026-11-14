const test = require('node:test');
const assert = require('node:assert/strict');

// Pure test of frame bucketing logic used in live-map Replay Engine
function buildReplayFrames(points, windowMs = 30000) {
  if (!points || !points.length) return [];
  const minTime = new Date(points[0].recorded_at).getTime();
  const maxTime = new Date(points[points.length - 1].recorded_at).getTime();

  if (minTime >= maxTime) {
    return [{ timeMs: minTime, points: points }];
  }

  const frames = [];
  let curBucket = minTime;
  let ptIdx = 0;

  while (curBucket <= maxTime) {
    const bucketEnd = curBucket + windowMs;
    const bucketPoints = [];
    while (ptIdx < points.length) {
      const ptTime = new Date(points[ptIdx].recorded_at).getTime();
      if (ptTime < bucketEnd) {
        bucketPoints.push(points[ptIdx]);
        ptIdx++;
      } else {
        break;
      }
    }
    frames.push({
      timeMs: curBucket,
      points: bucketPoints
    });
    curBucket = bucketEnd;
  }

  if (ptIdx < points.length && frames.length) {
    frames[frames.length - 1].points.push(...points.slice(ptIdx));
  }

  return frames;
}

test('Replay Engine Frame Bucketing Logic', async (t) => {
  await t.test('returns empty array when history is empty', () => {
    assert.deepEqual(buildReplayFrames([]), []);
    assert.deepEqual(buildReplayFrames(null), []);
  });

  await t.test('handles single point history gracefully', () => {
    const pts = [{ rider_id: 1, latitude: -6.9, longitude: 107.6, recorded_at: '2026-11-13T06:00:00.000Z' }];
    const frames = buildReplayFrames(pts, 30000);
    assert.equal(frames.length, 1);
    assert.equal(frames[0].points.length, 1);
    assert.equal(frames[0].points[0].rider_id, 1);
  });

  await t.test('buckets multiple riders within 30-second window into the same frame', () => {
    const pts = [
      { rider_id: 1, latitude: -6.901, longitude: 107.601, recorded_at: '2026-11-13T06:00:05.000Z' },
      { rider_id: 2, latitude: -6.902, longitude: 107.602, recorded_at: '2026-11-13T06:00:15.000Z' },
      { rider_id: 1, latitude: -6.910, longitude: 107.610, recorded_at: '2026-11-13T06:00:35.000Z' },
      { rider_id: 2, latitude: -6.912, longitude: 107.612, recorded_at: '2026-11-13T06:00:40.000Z' }
    ];

    const frames = buildReplayFrames(pts, 30000);
    // 06:00:05 to 06:00:35 is 30s interval
    assert.ok(frames.length >= 2);
    // Frame 1 should contain the first 2 points
    assert.equal(frames[0].points.length, 2);
    assert.equal(frames[0].points[0].rider_id, 1);
    assert.equal(frames[0].points[1].rider_id, 2);

    // Total points across all frames must equal original input points
    const totalPts = frames.reduce((acc, f) => acc + f.points.length, 0);
    assert.equal(totalPts, pts.length);
  });

  await t.test('preserves point count and chronological order with sparse intervals', () => {
    const pts = [
      { rider_id: 1, latitude: -6.901, longitude: 107.601, recorded_at: '2026-11-13T06:00:00.000Z' },
      // 5-minute dead zone gap
      { rider_id: 1, latitude: -6.950, longitude: 107.650, recorded_at: '2026-11-13T06:05:00.000Z' }
    ];

    const frames = buildReplayFrames(pts, 30000);
    // 5 minutes / 30s = 10 buckets
    assert.equal(frames.length, 11);
    assert.equal(frames[0].points.length, 1);
    assert.equal(frames[frames.length - 1].points.length, 1);

    const totalPts = frames.reduce((acc, f) => acc + f.points.length, 0);
    assert.equal(totalPts, pts.length);
  });
});

