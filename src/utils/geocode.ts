// Mapbox Geocoding — lightweight single-call wrapper with in-memory cache.
// Returns null (never throws) so callers can safely fire-and-forget.
// Token is read from EXPO_PUBLIC_MAPBOX_TOKEN at runtime.

const GEOCODE_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>();

export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) ?? null;
  }

  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    geocodeCache.set(address, null);
    return null;
  }

  try {
    const url = `${GEOCODE_BASE}/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      geocodeCache.set(address, null);
      return null;
    }
    const json = await res.json() as { features?: Array<{ center: [number, number] }> };
    const feature = json?.features?.[0];
    if (!feature) {
      geocodeCache.set(address, null);
      return null;
    }
    // Mapbox returns [longitude, latitude]
    const result = { latitude: feature.center[1], longitude: feature.center[0] };
    geocodeCache.set(address, result);
    return result;
  } catch {
    geocodeCache.set(address, null);
    return null;
  }
}
