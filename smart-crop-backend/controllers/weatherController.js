// Add this to your weatherController.js
const getForecast = async (req, res) => {
  try {
    let { city, farmerId } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY; // ✅ FIXED - changed from WEATHER_API_KEY

    // Auto fetch city from farmer
    if (!city && farmerId) {
      const user = await User.findById(farmerId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Farmer not found"
        });
      }
      city = user.city;
    }

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "city or farmerId is required"
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Weather API key not configured"
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
    );

    const dailyForecasts = [];
    const processedDates = new Set();

    for (const item of response.data.list) {
      const date = item.dt_txt.split(' ')[0];
      const time = item.dt_txt.split(' ')[1];

      if (!processedDates.has(date) && time === '12:00:00') {
        processedDates.add(date);
        dailyForecasts.push({
          date,
          temperature: Math.round(item.main.temp),
          humidity: item.main.humidity,
          condition: item.weather[0].main,
          description: item.weather[0].description,
          rainfall: item.rain ? item.rain['3h'] || 0 : 0
        });
      }

      if (dailyForecasts.length >= 5) break;
    }

    return res.json({
      success: true,
      source: "OpenWeather",
      city: response.data.city.name,
      forecasts: dailyForecasts
    });

  } catch (error) {
    console.error("FORECAST ERROR:", error.message);
    return res.status(502).json({
      success: false,
      message: "Real weather forecast is unavailable from OpenWeather right now"
    });
  }
};

module.exports = { getWeather, getForecast };
