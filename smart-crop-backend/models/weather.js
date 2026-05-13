// models/Weather.js
const mongoose = require('mongoose');

const WeatherSchema = new mongoose.Schema({
  farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  temperature: { type: Number },
  rainfall: { type: Number },
  humidity: { type: Number },
  windSpeed: { type: Number },
  recordedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Weather', WeatherSchema);