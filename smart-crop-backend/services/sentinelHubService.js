const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isUsefulPngBuffer } = require('../utils/imageQuality');
const { getPublicBaseUrl } = require('../utils/publicAssetUrl');

let cachedToken = null;
let tokenExpiresAt = 0;

function ensureUploadDir() {
  const dir = path.join(__dirname, '..', 'public', 'uploads', 'sentinel');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function getSentinelToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);

  const { data } = await axios.post(
    'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  );

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Number(data.expires_in || 300) * 1000;
  return cachedToken;
}

function polygonToGeoJson(farm) {
  const boundary = farm?.boundaryGeoJson;
  if (
    boundary &&
    boundary.type === 'Polygon' &&
    Array.isArray(boundary.coordinates) &&
    Array.isArray(boundary.coordinates[0]) &&
    boundary.coordinates[0].length >= 4
  ) {
    const valid = boundary.coordinates[0].every(
      (point) => Array.isArray(point) && point.length >= 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
    );
    if (valid) return boundary;
  }

  const coords = (farm.polygonCoordinates || [])
    .map((point) => {
      const lat = Array.isArray(point) ? Number(point[0]) : Number(point?.lat);
      const lng = Array.isArray(point) ? Number(point[1]) : Number(point?.lng ?? point?.lon);
      return [lng, lat];
    })
    .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng));

  if (coords.length < 3) return null;

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);

  return {
    type: 'Polygon',
    coordinates: [coords],
  };
}

function createFallbackGeometryFromCenter(farm) {
  const lat = Number(farm?.centerLat);
  const lng = Number(farm?.centerLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const areaHectares = Math.max(0.05, Number(farm?.areaHectares) || 1);
  const areaSquareMeters = areaHectares * 10000;
  const halfSideMeters = Math.max(12, Math.sqrt(areaSquareMeters) / 2);
  const latDelta = halfSideMeters / 111320;
  const lngDelta = halfSideMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

  return {
    type: 'Polygon',
    coordinates: [[
      [lng - lngDelta, lat - latDelta],
      [lng + lngDelta, lat - latDelta],
      [lng + lngDelta, lat + latDelta],
      [lng - lngDelta, lat + latDelta],
      [lng - lngDelta, lat - latDelta],
    ]],
  };
}

const TRUE_COLOR_EVALSCRIPT = `
//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02, sample.dataMask];
}
`;

const NDVI_EVALSCRIPT = `
//VERSION=3
function setup() {
  return { input: ["B08", "B04", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < 0.2) return [0.8, 0.1, 0.1, sample.dataMask];
  if (ndvi < 0.4) return [0.95, 0.55, 0.1, sample.dataMask];
  if (ndvi < 0.6) return [0.95, 0.85, 0.1, sample.dataMask];
  return [0.05, 0.55, 0.18, sample.dataMask];
}
`;

const NDVI_STATS_EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: ["B08", "B04", "dataMask"],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(sample) {
  const denom = sample.B08 + sample.B04;
  const ndvi = denom === 0 ? 0 : (sample.B08 - sample.B04) / denom;
  return {
    ndvi: [ndvi],
    dataMask: [sample.dataMask]
  };
}
`;

function bboxFromGeometry(geometry) {
  const coords = geometry.coordinates[0];
  const lngs = coords.map((point) => point[0]);
  const lats = coords.map((point) => point[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const padLng = Math.max(0.00008, (maxLng - minLng) * 0.08);
  const padLat = Math.max(0.00008, (maxLat - minLat) * 0.08);
  return [minLng - padLng, minLat - padLat, maxLng + padLng, maxLat + padLat];
}

function dateOnly(date) {
  return date.toISOString().split('T')[0];
}

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000);
}

async function requestProcessImage({ token, geometry, from, to, evalscript, name }) {
  const body = {
    input: {
      bounds: {
        bbox: bboxFromGeometry(geometry),
        geometry,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
            maxCloudCoverage: 60,
            mosaickingOrder: 'leastCC',
          },
        },
      ],
    },
    output: {
      width: 768,
      height: 768,
      responses: [{ identifier: 'default', format: { type: 'image/png' } }],
    },
    evalscript,
  };

  const response = await axios.post('https://services.sentinel-hub.com/api/v1/process', body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'image/png' },
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  const dir = ensureUploadDir();
  const filename = `${Date.now()}-${name}-${crypto.randomUUID()}.png`;
  const filepath = path.join(dir, filename);
  const imageBuffer = Buffer.from(response.data);
  const mode = name.toLowerCase().includes('ndvi') ? 'ndvi' : 'truecolor';
  if (!isUsefulPngBuffer(imageBuffer, { mode })) {
    return '';
  }
  fs.writeFileSync(filepath, imageBuffer);
  return `${getPublicBaseUrl()}/uploads/sentinel/${filename}`;
}

function readStatsResponse(data) {
  const interval = data?.data?.[0];
  const bands = interval?.outputs?.ndvi?.bands || {};
  const firstBand = bands.B0 || bands.ndvi || Object.values(bands)[0];
  const stats = firstBand?.stats;

  if (!stats || typeof stats.mean !== 'number') return null;

  return {
    mean: Number(stats.mean.toFixed(4)),
    min: typeof stats.min === 'number' ? Number(stats.min.toFixed(4)) : null,
    max: typeof stats.max === 'number' ? Number(stats.max.toFixed(4)) : null,
    sampleCount: firstBand?.stats?.sampleCount || interval?.outputs?.ndvi?.bands?.B0?.stats?.sampleCount || null,
  };
}

async function requestNdviStats({ token, geometry, from, to }) {
  const body = {
    input: {
      bounds: {
        geometry,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
            maxCloudCoverage: 60,
            mosaickingOrder: 'leastCC',
          },
        },
      ],
    },
    aggregation: {
      timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
      aggregationInterval: { of: 'P30D' },
      evalscript: NDVI_STATS_EVALSCRIPT,
      resx: 10,
      resy: 10,
    },
    calculations: {
      ndvi: {},
    },
  };

  const response = await axios.post('https://services.sentinel-hub.com/api/v1/statistics', body, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  return readStatsResponse(response.data);
}

async function getSentinelHubImages(farm, analysis = {}) {
  const token = await getSentinelToken();
  const geometry = polygonToGeoJson(farm) || createFallbackGeometryFromCenter(farm);
  if (!token || !geometry) return null;

  const currentFrom = dateOnly(daysAgo(30));
  const currentTo = dateOnly(new Date());
  const previousFrom = dateOnly(daysAgo(75));
  const previousTo = dateOnly(daysAgo(35));
  const olderFrom = dateOnly(daysAgo(120));
  const olderTo = dateOnly(daysAgo(80));

  const results = await Promise.allSettled([
    requestProcessImage({ token, geometry, from: currentFrom, to: currentTo, evalscript: TRUE_COLOR_EVALSCRIPT, name: 'current-truecolor' }),
    requestProcessImage({ token, geometry, from: previousFrom, to: previousTo, evalscript: TRUE_COLOR_EVALSCRIPT, name: 'previous-truecolor' }),
    requestProcessImage({ token, geometry, from: currentFrom, to: currentTo, evalscript: NDVI_EVALSCRIPT, name: 'ndvi' }),
    requestProcessImage({ token, geometry, from: olderFrom, to: olderTo, evalscript: TRUE_COLOR_EVALSCRIPT, name: 'older-truecolor' }),
  ]);

  const [currentResult, previousResult, ndviResult, olderResult] = results;
  const currentImageUrl = currentResult.status === 'fulfilled' ? currentResult.value : null;
  const previousImageUrl = previousResult.status === 'fulfilled' ? previousResult.value : null;
  const ndviLayerUrl = ndviResult.status === 'fulfilled' ? ndviResult.value : null;
  const olderImageUrl = olderResult.status === 'fulfilled' ? olderResult.value : null;
  const imageSamples = [
    { label: 'Current true color', kind: 'truecolor', from: currentFrom, to: currentTo, url: currentImageUrl || '' },
    { label: 'Previous true color', kind: 'truecolor', from: previousFrom, to: previousTo, url: previousImageUrl || '' },
    { label: 'Older true color', kind: 'truecolor', from: olderFrom, to: olderTo, url: olderImageUrl || '' },
    { label: 'Current NDVI map', kind: 'ndvi', from: currentFrom, to: currentTo, url: ndviLayerUrl || '' },
  ].filter((sample) => sample.url);

  if (!currentImageUrl && !previousImageUrl && !ndviLayerUrl && !olderImageUrl) return null;

  return {
    currentImageUrl: currentImageUrl || '',
    previousImageUrl: previousImageUrl || '',
    ndviLayerUrl: ndviLayerUrl || '',
    imageSamples,
    source: 'Sentinel Hub Sentinel-2 L2A',
  };
}

async function getSentinelHubAnalysis(farm) {
  const token = await getSentinelToken();
  const geometry = polygonToGeoJson(farm) || createFallbackGeometryFromCenter(farm);
  if (!token) throw new Error('Sentinel Hub credentials are missing.');
  if (!geometry) throw new Error('Farm boundary or center location is required for analysis.');

  const currentFrom = dateOnly(daysAgo(30));
  const currentTo = dateOnly(new Date());
  const previousFrom = dateOnly(daysAgo(75));
  const previousTo = dateOnly(daysAgo(35));

  const [currentStats, previousStats, imagery] = await Promise.all([
    requestNdviStats({ token, geometry, from: currentFrom, to: currentTo }),
    requestNdviStats({ token, geometry, from: previousFrom, to: previousTo }),
    getSentinelHubImages(farm),
  ]);

  if (!currentStats) {
    throw new Error('Sentinel Hub did not return NDVI statistics for this farm/date range.');
  }

  return {
    currentStats,
    previousStats,
    imagery,
    source: 'Sentinel Hub Sentinel-2 L2A',
  };
}

module.exports = { getSentinelHubImages, getSentinelHubAnalysis };
