import api from "./api";

export interface WeatherResponse {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainfall: number;
  condition: string;
  description?: string;
  feelsLike?: number;
  pressure?: number;
  visibility?: number;
  cloudiness?: number;
}

export interface ForecastDay {
  date: string;
  temperature: number;
  humidity: number;
  condition: string;
  description: string;
  rainfall: number;
  icon?: string;
}

export interface ForecastResponse {
  city: string;
  forecasts: ForecastDay[];
  source?: string;
}

/* ================= CURRENT WEATHER ================= */
export async function getCurrentWeather(city: string, state?: string): Promise<WeatherResponse> {
  try {
    const { data } = await api.get(
      `/weather/current/${encodeURIComponent(city)}`,
      { params: state ? { state } : undefined }
    );

    // Backend returns { success: true, data: WeatherResponse }
    const weather = data?.data ?? data;
    return { ...weather, city: data?.requestedCity || weather?.city || city };
  } catch {
    throw new Error("Failed to fetch current weather");
  }
}

/* ================= FORECAST ================= */
export async function getWeatherForecast(city: string, state?: string): Promise<ForecastResponse> {
  try {
    const { data } = await api.get(
      `/weather/forecast/${encodeURIComponent(city)}`,
      { params: state ? { state } : undefined }
    );

    // Backend returns { success: true, forecasts: [...], city: string }
    return { ...(data ?? { forecasts: [] }), city: data?.requestedCity || data?.city || city };
  } catch {
    throw new Error("Failed to fetch weather forecast");
  }
}

export async function getWeatherForecastByCoords(lat: number, lon: number): Promise<ForecastResponse> {
  try {
    const { data } = await api.get(`/weather/forecast?lat=${lat}&lon=${lon}`);
    return data ?? { city: "Farm location", forecasts: [] };
  } catch {
    throw new Error("Failed to fetch weather forecast for location");
  }
}

/* ================= WEATHER BY COORDINATES (Optional) ================= */
export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherResponse> {
  try {
    // Note: Your backend might need this endpoint
    // For now, use city name from reverse geocoding
    const { data } = await api.get(`/weather/current?lat=${lat}&lon=${lon}`);
    return data?.data ?? data;
  } catch {
    throw new Error("Failed to fetch weather for location");
  }
}
