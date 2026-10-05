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

  const climbs = detectClimbs(points);

  return {
    coords,
    points,
    climbs,
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

/**
 * Check if a rider has deviated from the GPX route
 * @param {number} lat
 * @param {number} lng
 * @param {Array<[number, number]>} routeCoords
 * @param {number} [thresholdMeters=100]
 * @returns {{ isOffRoute: boolean, deviationMeters: number, nearestIndex: number, nearestPoint: [number, number] | null }}
 */
function checkOffRoute(lat, lng, routeCoords, thresholdMeters = 100) {
  if (!routeCoords || !routeCoords.length) {
    return { isOffRoute: false, deviationMeters: 0, nearestIndex: 0, nearestPoint: null };
  }

  let minDist = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < routeCoords.length; i++) {
    const d = haversineKm(lat, lng, routeCoords[i][0], routeCoords[i][1]);
    if (d < minDist) {
      minDist = d;
      nearestIndex = i;
    }
  }

  const deviationMeters = Math.round(minDist * 1000);
  const isOffRoute = deviationMeters > thresholdMeters;

  return {
    isOffRoute,
    deviationMeters,
    nearestIndex,
    nearestPoint: routeCoords[nearestIndex]
  };
}

/**
 * Smooth elevation values to remove sensor jitter using a 5-point moving average
 * @param {Array<{ele: number}>} points
 * @returns {Array<number>}
 */
function smoothElevations(points) {
  const n = points.length;
  if (n < 5) return points.map(p => p.ele);
  const smoothed = new Array(n);
  smoothed[0] = points[0].ele;
  smoothed[1] = (points[0].ele + points[1].ele + points[2].ele) / 3;
  smoothed[n - 1] = points[n - 1].ele;
  smoothed[n - 2] = (points[n - 3].ele + points[n - 2].ele + points[n - 1].ele) / 3;

  for (let i = 2; i < n - 2; i++) {
    smoothed[i] = (points[i - 2].ele + points[i - 1].ele + points[i].ele + points[i + 1].ele + points[i + 2].ele) / 5;
  }
  return smoothed;
}

/**
 * Detect climbs along route based on UCI / Strava standards
 * @param {Array<{ lat: number, lng: number, ele: number, distKm: number, gradePct: number }>} points
 * @param {object} [options]
 * @returns {Array<object>}
 */
function detectClimbs(points, options = {}) {
  if (!points || points.length < 5) return [];

  const minGainMeters = options.minGainMeters || 30;
  const minDistKm = options.minDistKm || 0.5;
  const minAvgGradePct = options.minAvgGradePct || 3.0;

  const smoothed = smoothElevations(points);
  const n = points.length;
  const rawClimbs = [];

  let inAscent = false;
  let startIdx = 0;
  let peakIdx = 0;
  let maxEleInSegment = -Infinity;

  for (let i = 1; i < n; i++) {
    const prevEle = smoothed[i - 1];
    const currEle = smoothed[i];
    const dEle = currEle - prevEle;

    if (!inAscent) {
      if (dEle > 0.05) {
        inAscent = true;
        startIdx = i - 1;
        peakIdx = i;
        maxEleInSegment = currEle;
      }
    } else {
      if (currEle > maxEleInSegment) {
        maxEleInSegment = currEle;
        peakIdx = i;
      }

      const dropFromPeak = maxEleInSegment - currEle;
      const distFromPeak = points[i].distKm - points[peakIdx].distKm;

      if (dropFromPeak > 15 || (distFromPeak > 0.35 && dropFromPeak > 5) || i === n - 1) {
        const endIdx = peakIdx;
        const startKm = points[startIdx].distKm;
        const endKm = points[endIdx].distKm;
        const lengthKm = Math.round((endKm - startKm) * 100) / 100;
        const startEle = Math.round(smoothed[startIdx] * 10) / 10;
        const topEle = Math.round(smoothed[endIdx] * 10) / 10;
        const elevGain = Math.round(topEle - startEle);
        const avgGrade = lengthKm > 0 ? Math.round(((elevGain / (lengthKm * 1000)) * 100) * 10) / 10 : 0;

        if (lengthKm >= minDistKm && elevGain >= minGainMeters && avgGrade >= minAvgGradePct) {
          let maxGrade = avgGrade;
          for (let k = startIdx + 1; k <= endIdx; k++) {
            const segDist = (points[k].distKm - points[k - 1].distKm) * 1000;
            if (segDist > 10) {
              const segGrade = Math.round(((points[k].ele - points[k - 1].ele) / segDist) * 100);
              if (segGrade > maxGrade && segGrade < 45) {
                maxGrade = segGrade;
              }
            }
          }

          const score = (lengthKm * 1000) * avgGrade;
          let category = 'CAT 4';
          let color = '#10B981';

          if (score >= 80000) {
            category = 'HC';
            color = '#8B5CF6';
          } else if (score >= 64000) {
            category = 'CAT 1';
            color = '#EF4444';
          } else if (score >= 32000) {
            category = 'CAT 2';
            color = '#F97316';
          } else if (score >= 16000) {
            category = 'CAT 3';
            color = '#F59E0B';
          }

          rawClimbs.push({
            id: rawClimbs.length + 1,
            name: `Tanjakan ${rawClimbs.length + 1}`,
            category,
            color,
            startIndex: startIdx,
            endIndex: endIdx,
            startKm,
            endKm,
            lengthKm,
            elevGain,
            startEle,
            topEle,
            avgGrade,
            maxGrade
          });
        }

        inAscent = false;
        maxEleInSegment = -Infinity;
        i = peakIdx;
      }
    }
  }

  return rawClimbs;
}

/**
 * Compute instantaneous grade % and altitude at given distance along route
 * @param {number} distKm
 * @param {Array<{ele: number, distKm: number}>} points
 * @returns {{ gradePct: number, ele: number }}
 */
function getLiveGrade(distKm, points) {
  if (!points || !points.length) return { gradePct: 0, ele: 0 };
  if (points.length === 1) return { gradePct: 0, ele: points[0].ele };

  let low = 0;
  let high = points.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (points[mid].distKm < distKm) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const idx = Math.min(points.length - 1, Math.max(0, low));
  const currentPt = points[idx];

  const prevIdx = Math.max(0, idx - 1);
  const nextIdx = Math.min(points.length - 1, idx + 1);

  const p0 = points[prevIdx];
  const p1 = points[nextIdx];
  const dDistM = (p1.distKm - p0.distKm) * 1000;
  const dEleM = p1.ele - p0.ele;

  let gradePct = 0;
  if (dDistM > 2) {
    gradePct = Math.round((dEleM / dDistM) * 100 * 10) / 10;
  }

  return {
    gradePct,
    ele: Math.round(currentPt.ele * 10) / 10
  };
}

/**
 * Find active or upcoming climb for rider at distKm
 * @param {number} distKm
 * @param {Array<object>} climbs
 * @returns {{ activeClimb: object|null, isUpcoming: boolean, distRemainingKm: number, elevRemainingM: number }}
 */
function getCurrentClimbStatus(distKm, climbs) {
  if (!climbs || !climbs.length) {
    return { activeClimb: null, isUpcoming: false, distRemainingKm: 0, elevRemainingM: 0 };
  }

  for (let i = 0; i < climbs.length; i++) {
    const climb = climbs[i];
    if (distKm >= climb.startKm - 0.3 && distKm <= climb.endKm) {
      const isUpcoming = distKm < climb.startKm;
      const distRemainingKm = Math.round((climb.endKm - distKm) * 10) / 10;
      
      const progressInClimb = Math.max(0, Math.min(1, (distKm - climb.startKm) / climb.lengthKm));
      const currentClimbEle = climb.startEle + (climb.elevGain * progressInClimb);
      const elevRemainingM = Math.max(0, Math.round(climb.topEle - currentClimbEle));

      return {
        activeClimb: climb,
        isUpcoming,
        distRemainingKm,
        elevRemainingM
      };
    }
  }

  return { activeClimb: null, isUpcoming: false, distRemainingKm: 0, elevRemainingM: 0 };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    haversineKm,
    totalRouteKm,
    parseGpxData,
    parseGpxToCoords,
    findNearestRoutePoint,
    checkOffRoute,
    smoothElevations,
    detectClimbs,
    getLiveGrade,
    getCurrentClimbStatus
  };
}
