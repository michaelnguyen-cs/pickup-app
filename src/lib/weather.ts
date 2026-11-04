// weather.ts — thin wrapper around OpenWeather Current Weather API
//
// Only used for outdoor runs. Fails silently — weather is non-critical UI.
//
// Caching: module-level Map keyed by lat/lon rounded to 2 decimal places
// (~1 km grid). TTL 30 minutes. Cache lives for the app session; cleared on restart.
//
// Rate limits: OpenWeather free tier = 60 calls/min, 1000/day.
// With 30-min TTL and ~1km bucketing, a normal session generates < 5 API calls.

export interface WeatherResult {
  tempF: number;
  isRainy: boolean;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { result: WeatherResult; fetchedAt: number }>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// OpenWeather condition IDs for precipitation (thunderstorm, drizzle, rain, snow)
function isPrecipitation(weatherId: number): boolean {
  return weatherId >= 200 && weatherId < 700;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const key = cacheKey(lat, lon);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    const res = await fetch(url);
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const tempF = Math.round(json?.main?.temp ?? 0);
    const weatherId: number = json?.weather?.[0]?.id ?? 800;
    const result: WeatherResult = { tempF, isRainy: isPrecipitation(weatherId) };

    cache.set(key, { result, fetchedAt: Date.now() });
    return result;
  } catch {
    return null;
  }
}
