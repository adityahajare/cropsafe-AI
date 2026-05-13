require("dotenv").config();
const axios = require("axios");

async function main() {
  const params = new URLSearchParams();
  params.set("grant_type", "client_credentials");
  params.set("client_id", process.env.SENTINEL_HUB_CLIENT_ID || "");
  params.set("client_secret", process.env.SENTINEL_HUB_CLIENT_SECRET || "");

  const tokenRes = await axios.post(
    "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token",
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
  );

  const token = tokenRes.data.access_token;
  const geometry = {
    type: "Polygon",
    coordinates: [[
      [73.8559, 18.5201],
      [73.8562, 18.5207],
      [73.8570, 18.5205],
      [73.8568, 18.5199],
      [73.8559, 18.5201],
    ]],
  };

  const body = {
    input: {
      bounds: {
        geometry,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          timeRange: { from: "2026-04-01T00:00:00Z", to: "2026-05-04T23:59:59Z" },
          maxCloudCoverage: 100,
          mosaickingOrder: "leastCC",
        },
      }],
    },
    output: {
      width: 256,
      height: 256,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript: `//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02, sample.dataMask];
}`,
  };

  try {
    const res = await axios.post("https://services.sentinel-hub.com/api/v1/process", body, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/png" },
      responseType: "arraybuffer",
      timeout: 30000,
    });
    console.log(JSON.stringify({
      ok: true,
      status: res.status,
      bytes: res.data.byteLength,
      contentType: res.headers["content-type"],
    }));
  } catch (error) {
    let bodyText = error.response && error.response.data;
    if (Buffer.isBuffer(bodyText)) bodyText = bodyText.toString("utf8");
    console.log(JSON.stringify({
      ok: false,
      status: error.response && error.response.status,
      message: bodyText ? String(bodyText).slice(0, 500) : error.message,
    }));
  }
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, message: error.message }));
});
