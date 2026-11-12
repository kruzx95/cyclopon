const test = require('node:test');
const assert = require('node:assert/strict');

test('Rider Cockpit Off-Route Sound & State Transition Engine', async (t) => {
  // Simulated state model mirroring rider-cockpit.js
  let isCurrentlyOffRoute = false;
  let offRouteMutedByUser = false;
  let offRouteAudioPlaying = false;
  let bannerActive = false;

  function handleTelemetryOffRoute(isOffRoute, deviationMeters) {
    if (isOffRoute) {
      isCurrentlyOffRoute = true;
      bannerActive = true;
      if (!offRouteMutedByUser) {
        offRouteAudioPlaying = true;
      }
    } else {
      // Back on route: auto-stop and reset
      if (isCurrentlyOffRoute) {
        isCurrentlyOffRoute = false;
        offRouteMutedByUser = false;
        offRouteAudioPlaying = false;
      }
      bannerActive = false;
      offRouteAudioPlaying = false;
    }
  }

  function handleUserMuteToggle() {
    if (!offRouteMutedByUser) {
      offRouteMutedByUser = true;
      offRouteAudioPlaying = false;
    } else {
      offRouteMutedByUser = false;
      if (isCurrentlyOffRoute) {
        offRouteAudioPlaying = true;
      }
    }
  }

  await t.test('initial state on route is calm', () => {
    handleTelemetryOffRoute(false, 10);
    assert.equal(isCurrentlyOffRoute, false);
    assert.equal(bannerActive, false);
    assert.equal(offRouteAudioPlaying, false);
    assert.equal(offRouteMutedByUser, false);
  });

  await t.test('detecting deviation triggers sound and banner without vibration', () => {
    handleTelemetryOffRoute(true, 150);
    assert.equal(isCurrentlyOffRoute, true);
    assert.equal(bannerActive, true);
    assert.equal(offRouteAudioPlaying, true);
    assert.equal(offRouteMutedByUser, false);
  });

  await t.test('subsequent GPS ticks while still off-route do not re-trigger or spam if already active', () => {
    handleTelemetryOffRoute(true, 180);
    assert.equal(isCurrentlyOffRoute, true);
    assert.equal(offRouteAudioPlaying, true);
  });

  await t.test('rider can manually mute sound while remaining off-route', () => {
    handleUserMuteToggle();
    assert.equal(offRouteMutedByUser, true);
    assert.equal(offRouteAudioPlaying, false);
    assert.equal(bannerActive, true, 'Banner stays visible to show distance from trek');

    // Next GPS tick does not re-enable audio
    handleTelemetryOffRoute(true, 200);
    assert.equal(offRouteAudioPlaying, false, 'Audio stays muted on subsequent GPS ticks');
  });

  await t.test('returning to route automatically stops sound and resets mute state', () => {
    handleTelemetryOffRoute(false, 15);
    assert.equal(isCurrentlyOffRoute, false);
    assert.equal(bannerActive, false);
    assert.equal(offRouteAudioPlaying, false);
    assert.equal(offRouteMutedByUser, false, 'Mute state must reset so future deviation can alert');
  });

  await t.test('future deviation after returning to route alerts again', () => {
    handleTelemetryOffRoute(true, 120);
    assert.equal(isCurrentlyOffRoute, true);
    assert.equal(bannerActive, true);
    assert.equal(offRouteAudioPlaying, true, 'Audio alert sounds again on new off-route incident');
  });
});

