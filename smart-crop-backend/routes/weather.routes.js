const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/weather/current?lat=...&lon=... - Get current weather by farm coordinates
router.get('/current', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Weather API key not configured' });
    }

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${apiKey}&units=metric`,
      { timeout: 8000 }
    );

    const data = response.data;
    const rainfall = data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0;

    res.json({
      success: true,
      data: {
        city: data.name,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed * 3.6),
        rainfall,
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        country: data.sys.country,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset
      }
    });
  } catch (error) {
    console.error('Weather coordinate API error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Real-time weather is unavailable from OpenWeather right now'
    });
  }
});

// GET /api/weather/forecast?lat=...&lon=... - Get forecast by farm coordinates
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Weather API key not configured' });
    }

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${apiKey}&units=metric`,
      { timeout: 8000 }
    );

    const data = response.data;
    const dailyForecasts = [];
    const processedDates = new Set();

    for (const item of data.list || []) {
      const [date, time] = String(item.dt_txt || '').split(' ');
      if (!date || processedDates.has(date)) continue;
      if (time === '12:00:00' || !dailyForecasts.find((day) => day.date === date)) {
        processedDates.add(date);
        dailyForecasts.push({
          date,
          temperature: Math.round(item.main.temp),
          humidity: item.main.humidity,
          condition: item.weather[0].main,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          rainfall: item.rain ? item.rain['3h'] || 0 : 0,
        });
      }
      if (dailyForecasts.length >= 5) break;
    }

    res.json({
      success: true,
      city: data.city?.name || 'Farm location',
      forecasts: dailyForecasts,
    });
  } catch (error) {
    console.error('Forecast coordinate API error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Real weather forecast is unavailable from OpenWeather right now'
    });
  }
});

// GET /api/weather/current/:city - Get current weather
router.get('/current/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const state = String(req.query.state || '').trim();
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Weather API key not configured' });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent([city, state, 'IN'].filter(Boolean).join(','))}&appid=${apiKey}&units=metric`,
      { timeout: 8000 }
    );

    const data = response.data;
    const rainfall = data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0;

    res.json({
      success: true,
      requestedCity: city,
      requestedState: state,
      data: {
        city,
        providerCity: data.name,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed * 3.6),
        rainfall,
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        country: data.sys.country,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset
      }
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Real-time weather is unavailable from OpenWeather right now'
    });
  }
});

// GET /api/weather/forecast/:city - Get 5-day forecast
router.get('/forecast/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const state = String(req.query.state || '').trim();
    const apiKey = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Weather API key not configured' });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent([city, state, 'IN'].filter(Boolean).join(','))}&appid=${apiKey}&units=metric`,
      { timeout: 8000 }
    );

    const data = response.data;

    // Group forecast by day and take midday readings
    const dailyForecasts = [];
    const processedDates = new Set();

    for (const item of data.list) {
      const date = item.dt_txt.split(' ')[0];
      const time = item.dt_txt.split(' ')[1];

      // Take the 12:00 reading for each day, or first available
      if (!processedDates.has(date) && (time === '12:00:00' || !dailyForecasts.find(d => d.date === date))) {
        if (time === '12:00:00' || !processedDates.has(date)) {
          processedDates.add(date);
          dailyForecasts.push({
            date,
            temperature: Math.round(item.main.temp),
            humidity: item.main.humidity,
            condition: item.weather[0].main,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            rainfall: item.rain ? item.rain['3h'] || 0 : 0
          });
        }
      }

      if (dailyForecasts.length >= 5) break;
    }

    res.json({
      success: true,
      city,
      providerCity: data.city.name,
      requestedCity: city,
      requestedState: state,
      forecasts: dailyForecasts
    });
  } catch (error) {
    console.error('Forecast API error:', error.message);
    res.status(502).json({
      success: false,
      message: 'Real weather forecast is unavailable from OpenWeather right now'
    });
  }
});

module.exports = router;
