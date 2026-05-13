const axios = require("axios");

async function getWeather(lat, lon) {
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  if (!API_KEY) {
    console.warn("OPENWEATHER_API_KEY missing in environment");
    return null;
  }

  try {
    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: "metric"
        },
        timeout: 5000
      }
    );

    const weather = data.weather?.[0] || {};

    return {
      temperature: data.main?.temp ?? null,
      humidity: data.main?.humidity ?? null,
      pressure: data.main?.pressure ?? null,
      windSpeed: data.wind?.speed ?? null,
      rainfall: data.rain?.["1h"] ?? 0,
      condition: weather.main || null,
      description: weather.description || null,
      feelsLike: data.main?.feels_like ?? null,
      visibility: data.visibility ?? null,
      cloudiness: data.clouds?.all ?? null
    };
  } catch (err) {
    console.error("Weather API Error:", err.message);
    return null;
  }
}

module.exports = getWeather;
