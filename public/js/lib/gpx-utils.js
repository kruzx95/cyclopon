/**
 * GPX Utilities — parse GPX files, compute elevation profile & rider route progress
 */

/**
 * Haversine distance between two lat/lng points (returns km)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
             + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
             * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute total route distance (km) from coordinate array
 * @param {Array<[number, number]>} coords
 * @returns {number}
 */
function totalRouteKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Parse full GPX text with elevation and compute Komoot-style route statistics
 * @param {string} gpxText
 * @returns {{
 *   coords: Array<[number, number]>,
 *   points: Array<{ lat: number, lng: number, ele: number, distKm: number, gradePct: number }>,
 *   stats: {
 *     totalKm: number,
 *     elevGain: number,
 *     elevLoss: number,
 *     minEle: number,
 *     maxEle: number,
 *     estTime: string,
 *     avgSpeed: string,
 *     difficulty: string
 *   }
 * }}
 */
function parseGpxData(gpxText) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(gpxText, 'application/xml');

  let rawPoints = Array.from(doc.querySelectorAll('trkpt'));
  if (!rawPoints.length) rawPoints = Array.from(doc.querySelectorAll('rtept'));

  const points = [];
  const coords = [];
  let totalDist = 0;
  let elevGain  = 0;
  let elevLoss  = 0;
  let minEle    = Infinity;
  let maxEle    = -Infinity;

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const lat = parseFloat(pt.getAttribute('lat'));
    const lng = parseFloat(pt.getAttribute('lon'));
    if (isNaN(lat) || isNaN(lng)) continue;

    const eleNode = pt.querySelector('ele');
    const ele = eleNode ? parseFloat(eleNode.textContent) : 0;

    if (ele < minEle) minEle = ele;
    if (ele > maxEle) maxEle = ele;

    let dDist = 0;
    let gradePct = 0;

    if (points.length > 0) {
      const prev = points[points.length - 1];
      dDist = haversineKm(prev.lat, prev.lng, lat, lng);
      totalDist += dDist;

      const dEle = ele - prev.ele;
      // Filter small GPS noise (< 0.25m)
      if (dEle > 0.25) elevGain += dEle;
      else if (dEle < -0.25) elevLoss += Math.abs(dEle);

      const distMeters = dDist * 1000;
      if (distMeters > 8) {
        gradePct = Math.round((dEle / distMeters) * 100);
      }
    }

    const item = {
      lat,
      lng,
      ele: Math.round(ele * 10) / 10,
      distKm: Math.round(totalDist * 100) / 100,
      gradePct
    };

    points.push(item);
    coords.push([lat, lng]);
  }

  const roundedKm = Math.round(totalDist * 10) / 10;
  const roundGain = Math.round(elevGain);
  const roundLoss = Math.round(elevLoss);
  const safeMin   = minEle !== Infinity ? Math.round(minEle) : 0;
  const safeMax   = maxEle !== -Infinity ? Math.round(maxEle) : 0;

  // Estimated cycling time (~21 km/h + 1hr per 800m climbing)
  const totalHours = (roundedKm / 21) + (roundGain / 800);
  const estH = Math.floor(totalHours);
  const estM = Math.round((totalHours - estH) * 60);
  const estTimeStr = `${estH}h ${estM < 10 ? '0' : ''}${estM}m`;

  const avgSpeedVal = totalHours > 0 ? (roundedKm / totalHours).toFixed(1) : '20.0';

  let difficulty = 'Moderate';
  if (roundedKm > 100 || roundGain > 1400) difficulty = 'Hard';
  if (roundedKm > 160 || roundGain > 2400) difficulty = 'Expert';
  if (roundedKm < 40 && roundGain < 400) difficulty = 'Easy';

  return {
    coords,
    points,
    stats: {
      totalKm: roundedKm,
      elevGain: roundGain,
      elevLoss: roundLoss,
      minEle: safeMin,
      maxEle: safeMax,
      estTime: estTimeStr,
      avgSpeed: `${avgSpeedVal} km/h`,
      difficulty
    }
  };
}

/**
 * Backward compatible wrapper: Parse GPX XML text → array of [lat, lng]
 * @param {string} gpxText
 * @returns {Array<[number, number]>}
 */
function parseGpxToCoords(gpxText) {
  return parseGpxData(gpxText).coords;
}

/**
 * Nearest-point algorithm: find which point in routeCoords the rider is closest to
 * @param {number} lat - rider latitude
 * @param {number} lng - rider longitude
 * @param {Array<[number, number]>} routeCoords
 * @param {number} routeTotalKm - pre-computed total distance
 * @returns {{ index: number, progressPct: number, distanceKm: number }}
 */
function findNearestRoutePoint(lat, lng, routeCoords, routeTotalKm) {
  if (!routeCoords.length) return { index: 0, progressPct: 0, distanceKm: 0 };

  let nearestIndex = 0;
  let minDist      = Infinity;

  for (let i = 0; i < routeCoords.length; i++) {
    const d = haversineKm(lat, lng, routeCoords[i][0], routeCoords[i][1]);
    if (d < minDist) { minDist = d; nearestIndex = i; }
  }

  // Compute distance covered up to nearestIndex
  let coveredKm = 0;
  for (let i = 1; i <= nearestIndex; i++) {
    coveredKm += haversineKm(routeCoords[i-1][0], routeCoords[i-1][1], routeCoords[i][0], routeCoords[i][1]);
  }

  const progressPct = routeTotalKm > 0
    ? Math.min(100, Math.round((coveredKm / routeTotalKm) * 100))
    : 0;

  return {
    index:       nearestIndex,
    progressPct,
    distanceKm:  Math.round(coveredKm * 10) / 10
  };
}
