/**
 * CycloPon PWA Background GPS Keep-Alive & Pocket Tracker (GpsKeeper)
 * Enables continuous, high-accuracy GPS tracking even when smartphone screen
 * is turned off / locked in a cycling jersey pocket.
 *
 * Mechanisms:
 * 1. HTML5 Silent Audio Loop to prevent mobile OS tab freezing (iOS Safari & Android Chrome)
 * 2. MediaSession API integration for lockscreen live status display
 * 3. Screen Wake Lock API (where supported)
 * 4. Geolocation Watcher with high accuracy
 * 5. Automatic Telemetry Posting with Offline Resilience (Queued Batch Uploads)
 */

const GpsKeeper = (() => {
  let isRunning = false;
  let audioEl = null;
  let geoWatchId = null;
  let wakeLock = null;
  let lastReportTime = 0;
  let reportIntervalMs = 5000; // 5 seconds
  let currentRider = null;
  let currentEvent = null;
  let currentTraccar = null;
  let updateCallback = null;
  let statusCallback = null;

  let totalPointsSent = 0;
  let totalDistanceKm = 0;
  let lastCoord = null;
  let latestAccuracy = null;
  let latestSpeedKmh = 0;
  let offlineQueue = [];

  // Load any previously unsent offline points from localStorage
  try {
    const saved = localStorage.getItem('cyclopon_offline_gps');
    if (saved) offlineQueue = JSON.parse(saved);
  } catch (e) {
    offlineQueue = [];
  }

  /**
   * Generates a 1-second silent WAV audio data URL to keep audio pipeline active.
   */
  function getSilentAudioBlobUrl() {
    const sampleRate = 8000;
    const numSamples = sampleRate; // 1 sec
    const buffer = new Uint8Array(44 + numSamples);
    const view = new DataView(buffer.buffer);

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true); // 8-bit
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, numSamples, true);

    for (let i = 0; i < numSamples; i++) {
      buffer[44 + i] = 128; // PCM 8-bit silence
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Haversine distance formula in kilometers
   */
  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Update Lock Screen info via MediaSession API
   */
  function updateMediaSession(speedKmh, distKm) {
    if (!('mediaSession' in navigator) || !currentRider) return;

    try {
      const speedStr = (speedKmh || 0).toFixed(1);
      const distStr = (distKm || 0).toFixed(1);
      const accStr = latestAccuracy != null ? `±${Math.round(latestAccuracy)}m` : 'GPS';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: `🚴 CycloPon GPS (${speedStr} km/h • KM ${distStr})`,
        artist: `BIB #${currentRider.bib} ${currentRider.name}`,
        album: `${currentEvent ? currentEvent.name : 'Live Tracking'} • Akurasi ${accStr}`,
        artwork: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });

      navigator.mediaSession.playbackState = 'playing';

      // Keep playing silent audio on headphone play / pause events
      ['play', 'pause'].forEach(action => {
        try {
          navigator.mediaSession.setActionHandler(action, () => {
            if (audioEl && isRunning) {
              audioEl.play().catch(() => {});
            }
          });
        } catch (e) {}
      });
    } catch (err) {
      console.warn('[GpsKeeper MediaSession]', err);
    }
  }

  /**
   * Post single or batched telemetry to backend
   */
  async function sendTelemetryPoint(pos) {
    if (!currentEvent || !currentRider) return;

    // First, try flushing any offline queued points
    await flushOfflineQueue();

    try {
      const res = await fetch(`/api/events/${currentEvent.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pos)
      });

      if (res.ok) {
        totalPointsSent++;
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch (err) {
      // Network failed or offline: queue for later
      offlineQueue.push(pos);
      if (offlineQueue.length > 500) offlineQueue.shift();
      try {
        localStorage.setItem('cyclopon_offline_gps', JSON.stringify(offlineQueue));
      } catch (e) {}
    }

    // Optional: report directly to Traccar OsmAnd protocol if configured
    if (currentTraccar && currentTraccar.serverUrl) {
      sendTraccarOsmand(pos).catch(() => {});
    }

    notifyStatus();
  }

  /**
   * Forward position to Traccar OsmAnd Port
   */
  async function sendTraccarOsmand(pos) {
    try {
      const uniqueId = currentTraccar.deviceIdentifier || `BIB-${currentRider.bib}`;
      const knots = (pos.speed || 0) / 1.852;
      const epochSec = Math.floor(new Date(pos.recorded_at).getTime() / 1000);
      const url = `${currentTraccar.serverUrl}/?id=${encodeURIComponent(uniqueId)}&lat=${pos.latitude}&lon=${pos.longitude}&speed=${knots.toFixed(1)}&timestamp=${epochSec}`;
      // fire and forget via no-cors or standard fetch
      fetch(url, { mode: 'no-cors' }).catch(() => {});
    } catch (e) {}
  }

  /**
   * Flush offline queue when online
   */
  async function flushOfflineQueue() {
    if (!offlineQueue.length || !currentEvent) return;

    try {
      const batch = [...offlineQueue];
      const res = await fetch(`/api/events/${currentEvent.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: batch })
      });

      if (res.ok) {
        totalPointsSent += batch.length;
        offlineQueue = [];
        localStorage.removeItem('cyclopon_offline_gps');
      }
    } catch (err) {
      // Still offline, will retry next tick
    }
  }

  // Network listener to flush queue automatically when connection returns
  window.addEventListener('online', () => {
    flushOfflineQueue().then(notifyStatus);
  });

  function notifyStatus() {
    if (statusCallback) {
      statusCallback({
        isRunning,
        pointsSent: totalPointsSent,
        offlineQueueCount: offlineQueue.length,
        accuracy: latestAccuracy,
        speedKmh: latestSpeedKmh,
        distanceKm: totalDistanceKm,
        isAudioActive: !!(audioEl && !audioEl.paused)
      });
    }
  }

  return {
    /**
     * Start Background GPS Keep-Alive
     */
    async start({ rider, event, traccar = null, onUpdate = null, onStatus = null, intervalSec = 5 }) {
      if (isRunning) return true;

      currentRider = rider;
      currentEvent = event;
      currentTraccar = traccar;
      updateCallback = onUpdate;
      statusCallback = onStatus;
      reportIntervalMs = (intervalSec || 5) * 1000;
      isRunning = true;

      // 1. Silent Audio Loop (Keep browser process alive in jersey pocket)
      try {
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.src = getSilentAudioBlobUrl();
          audioEl.loop = true;
          audioEl.volume = 0.05; // Non-zero to ensure OS doesn't disregard audio track
          audioEl.setAttribute('playsinline', '');
          audioEl.setAttribute('webkit-playsinline', '');
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
        }
        await audioEl.play();
      } catch (err) {
        console.warn('[GpsKeeper] Audio autoplay warning:', err);
      }

      // 2. Screen Wake Lock (if supported)
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) {}
      }

      // 3. MediaSession Setup
      updateMediaSession(0, totalDistanceKm);

      // 4. Geolocation High-Accuracy Watcher
      if ('geolocation' in navigator) {
        geoWatchId = navigator.geolocation.watchPosition(
          pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const rawSpeed = pos.coords.speed != null ? pos.coords.speed * 3.6 : 0;
            latestSpeedKmh = Math.max(0, Math.round(rawSpeed * 10) / 10);
            latestAccuracy = pos.coords.accuracy;

            // Distance calculation with jitter filter (> 3 meters)
            if (lastCoord) {
              const delta = calcDistanceKm(lastCoord.lat, lastCoord.lng, lat, lng);
              if (delta >= 0.003) {
                totalDistanceKm += delta;
                lastCoord = { lat, lng };
              }
            } else {
              lastCoord = { lat, lng };
            }

            // Update MediaSession lock screen
            updateMediaSession(latestSpeedKmh, totalDistanceKm);

            // Notify UI
            if (updateCallback) {
              updateCallback({
                latitude: lat,
                longitude: lng,
                speed: latestSpeedKmh,
                accuracy: latestAccuracy,
                distanceKm: Math.round(totalDistanceKm * 10) / 10,
                heading: pos.coords.heading,
                altitude: pos.coords.altitude
              });
            }

            // Periodic telemetry reporting to server
            const now = Date.now();
            if (now - lastReportTime >= reportIntervalMs) {
              lastReportTime = now;
              sendTelemetryPoint({
                rider_id: currentRider.id,
                latitude: lat,
                longitude: lng,
                speed: latestSpeedKmh,
                distance_km: Math.round(totalDistanceKm * 10) / 10,
                recorded_at: new Date().toISOString()
              });
            }

            notifyStatus();
          },
          err => {
            console.warn('[GpsKeeper] Geolocation error:', err.message);
            notifyStatus();
          },
          {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 10000
          }
        );
      } else {
        console.error('[GpsKeeper] Geolocation not supported');
      }

      notifyStatus();
      return true;
    },

    /**
     * Stop Background GPS Keep-Alive
     */
    stop() {
      isRunning = false;

      // Stop Audio
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }

      // Clear Geolocation Watcher
      if (geoWatchId != null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
      }

      // Release Wake Lock
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }

      // Reset MediaSession
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }

      // Flush any queued points before exit
      flushOfflineQueue();

      notifyStatus();
    },

    isActive() {
      return isRunning;
    },

    getStatus() {
      return {
        isRunning,
        pointsSent: totalPointsSent,
        offlineQueueCount: offlineQueue.length,
        accuracy: latestAccuracy,
        speedKmh: latestSpeedKmh,
        distanceKm: totalDistanceKm,
        isAudioActive: !!(audioEl && !audioEl.paused)
      };
    },

    flushQueue() {
      return flushOfflineQueue();
    }
  };
})();

// Export globally for browser window
if (typeof window !== 'undefined') {
  window.GpsKeeper = GpsKeeper;
}
