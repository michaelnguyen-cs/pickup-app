// Mock outdoor conditions — weather-aware logic for outdoor venues
// In production: replaced by weather API (OpenWeatherMap, WeatherKit, etc.)
// Supabase: store in outdoor_conditions table, update via scheduled edge function

import { OutdoorConditions, VenuePopularity } from './types';

export const MOCK_CONDITIONS: OutdoorConditions[] = [
  {
    venueId: 'v1', // Rucker Park - outdoor
    tempF: 72,
    condition: 'partly_cloudy',
    windMph: 8,
    humidity: 55,
    playCondition: 'good',
    updatedAt: new Date().toISOString(),
  },
  {
    venueId: 'v3', // Lincoln Park - outdoor
    tempF: 58,
    condition: 'cloudy',
    windMph: 14,
    humidity: 70,
    playCondition: 'fair',
    warning: 'Windy conditions. Dress in layers.',
    updatedAt: new Date().toISOString(),
  },
  {
    venueId: 'v5', // Venice Beach - outdoor
    tempF: 78,
    condition: 'clear',
    windMph: 6,
    humidity: 45,
    playCondition: 'great',
    updatedAt: new Date().toISOString(),
  },
  {
    venueId: 'v6', // Millennium Park - outdoor
    tempF: 54,
    condition: 'light_rain',
    windMph: 10,
    humidity: 85,
    playCondition: 'poor',
    warning: 'Light rain expected. Courts may be slippery.',
    updatedAt: new Date().toISOString(),
  },
];

export const MOCK_POPULARITY: VenuePopularity[] = [
  {
    venueId: 'v1',
    currentCount: 18,
    maxExpected: 30,
    peakHours: ['18:00–21:00', '10:00–13:00'],
    bestTimesToGo: ['Weekday evenings 6–9pm', 'Sunday mornings'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v2',
    currentCount: 45,
    maxExpected: 120,
    peakHours: ['18:00–21:00'],
    bestTimesToGo: ['Midday Mon/Wed/Fri', 'Saturday mornings'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v3',
    currentCount: 32,
    maxExpected: 200,
    peakHours: ['06:30–08:00', '17:00–19:00'],
    bestTimesToGo: ['Early mornings', 'Weekday afternoons'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v4',
    currentCount: 28,
    maxExpected: 80,
    peakHours: ['19:00–21:00'],
    bestTimesToGo: ['Tue/Thu evenings 7–9pm', 'Saturday mornings'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v5',
    currentCount: 40,
    maxExpected: 100,
    peakHours: ['09:00–14:00'],
    bestTimesToGo: ['Weekend mornings 9am–noon'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v6',
    currentCount: 12,
    maxExpected: 32,
    peakHours: ['07:00–10:00', '08:00–12:00'],
    bestTimesToGo: ['Weekday early mornings', 'Saturday 8–11am'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v7',
    currentCount: 55,
    maxExpected: 150,
    peakHours: ['20:00–22:00'],
    bestTimesToGo: ['Mon/Wed/Fri evenings', 'Weekday noon'],
    lastUpdated: new Date().toISOString(),
  },
  {
    venueId: 'v8',
    currentCount: 20,
    maxExpected: 60,
    peakHours: ['09:00–11:00', '17:00–19:00'],
    bestTimesToGo: ['Weekday mornings', 'Late afternoon'],
    lastUpdated: new Date().toISOString(),
  },
];
