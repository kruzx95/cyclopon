const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const db = require('../db/database');

test('Demo Event Seeder & Race Simulation Integrity', async (t) => {
  // 1. Verify GPX Track file exists
  await t.test('verifies public/gpx/21.gpx exists and contains valid trackpoints', () => {
    const gpxPath = path.join(__dirname, '..', 'public', 'gpx', '21.gpx');
    assert.equal(fs.existsSync(gpxPath), true);
    const content = fs.readFileSync(gpxPath, 'utf-8');
    const trkptMatches = content.match(/<trkpt/g);
    assert.ok(trkptMatches && trkptMatches.length > 500, 'Should have more than 500 trackpoints');
  });

  // 2. Run seeder logic
  await t.test('seed-demo script populates active event, 5 CPs, 10 riders, splits, and history', () => {
    require('../scripts/seed-demo.js');

    const event = db.getEventById.get(21);
    assert.ok(event, 'Event 21 should exist');
    assert.equal(event.active, 1);
    assert.match(event.name, /Gravel to Gang/);

    const checkpoints = db.getCheckpointsByEvent.all(21);
    assert.equal(checkpoints.length, 5, 'Should have 5 checkpoints');
    assert.equal(checkpoints[0].km_distance, 0.0);
    assert.equal(checkpoints[4].km_distance, 31.4);

    const riders = db.getRidersByEvent.all(21);
    assert.equal(riders.length, 10, 'Should have 10 riders');

    // Check Winata (Leader) and Denny (Sweeper)
    const winata = riders.find(r => r.bib === '001');
    assert.ok(winata);
    assert.equal(winata.name, 'Winata');
    assert.equal(winata.color, '#10B981');

    const sweeper = riders.find(r => r.role === 'sweeper');
    assert.ok(sweeper);
    assert.equal(sweeper.bib, '088');

    // Check splits
    const splits = db.db.prepare('SELECT * FROM rider_splits WHERE event_id = 21').all();
    assert.ok(splits.length >= 7, 'Should have recorded initial splits');

    // Check history points
    const history = db.db.prepare('SELECT * FROM position_history WHERE event_id = 21').all();
    assert.ok(history.length >= 50, 'Should have initial telemetry breadcrumb history');
  });

  // 3. Verify simulator engine math and execution integrity
  await t.test('verifies scripts/simulate-race.js module exports and tick execution', async () => {
    const sim = require('../scripts/simulate-race.js');
    assert.ok(typeof sim.parseGpxTrackpoints === 'function');
    assert.ok(typeof sim.computeTrackCumulativeKm === 'function');
    assert.ok(typeof sim.simulationTick === 'function');

    // Test GPX parsing helper
    const dummyGpx = `
      <gpx>
        <trk><trkseg>
          <trkpt lat="-7.3280" lon="108.2295"><ele>380.0</ele></trkpt>
          <trkpt lon="108.2300" lat="-7.3285"><ele>382.0</ele></trkpt>
        </trkseg></trk>
      </gpx>
    `;
    const pts = sim.parseGpxTrackpoints(dummyGpx);
    assert.equal(pts.length, 2);
    assert.equal(pts[0].lat, -7.3280);
    assert.equal(pts[1].lat, -7.3285);
    assert.equal(pts[1].lon, 108.2300);

    const totalKm = sim.computeTrackCumulativeKm(pts);
    assert.ok(totalKm > 0, 'Distance should be greater than 0');

    // Run simulation tick without throwing
    await sim.simulationTick();
    assert.ok(sim.riderStates.length === 10, 'Should have 10 simulated riders');

    // Test finish line detection
    sim.riderStates[0].curKm = sim.totalRouteKm - 0.005;
    await sim.simulationTick();
    assert.equal(sim.riderStates[0].isFinished, true);
    assert.equal(sim.riderStates[0].finishRank, 1);
    assert.equal(sim.riderStates[0].curSpeed, 0);

    // Test synchronized reset when all finish
    for (const s of sim.riderStates) {
      s.curKm = sim.totalRouteKm;
      s.isFinished = true;
    }
    for (let i = 0; i < 5; i++) {
      await sim.simulationTick();
    }
    assert.equal(sim.riderStates[0].isFinished, false);
    assert.ok(sim.riderStates[0].curKm < 1.0);
  });
});

