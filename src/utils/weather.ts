// Weather utility — maps raw conditions to display-ready badges
// Keep this as pure functions so it's easy to swap data source later

import { WeatherCondition, PlayCondition, OutdoorConditions } from '../data/types';

export interface WeatherBadgeConfig {
  emoji: string;
  label: string;
  backgroundColor: string;
  textColor: string;
}

// Maps weather condition to compact badge display
export function getWeatherBadge(condition: WeatherCondition, tempF: number): WeatherBadgeConfig {
  const configs: Record<WeatherCondition, WeatherBadgeConfig> = {
    clear: {
      emoji: '☀️',
      label: `${tempF}° Clear`,
      backgroundColor: 'rgba(59,130,246,0.12)',
      textColor: '#2563EB',
    },
    partly_cloudy: {
      emoji: '⛅',
      label: `${tempF}° Partly Cloudy`,
      backgroundColor: 'rgba(107,114,128,0.12)',
      textColor: '#4B5563',
    },
    cloudy: {
      emoji: '☁️',
      label: `${tempF}° Cloudy`,
      backgroundColor: 'rgba(107,114,128,0.12)',
      textColor: '#6B7280',
    },
    light_rain: {
      emoji: '🌦',
      label: `${tempF}° Light Rain`,
      backgroundColor: 'rgba(99,102,241,0.12)',
      textColor: '#4F46E5',
    },
    heavy_rain: {
      emoji: '🌧',
      label: `${tempF}° Rain`,
      backgroundColor: 'rgba(99,102,241,0.18)',
      textColor: '#4338CA',
    },
    thunderstorm: {
      emoji: '⛈',
      label: `${tempF}° Storm`,
      backgroundColor: 'rgba(124,58,237,0.15)',
      textColor: '#7C3AED',
    },
    windy: {
      emoji: '💨',
      label: `${tempF}° Windy`,
      backgroundColor: 'rgba(107,114,128,0.12)',
      textColor: '#6B7280',
    },
    hot: {
      emoji: '🥵',
      label: `${tempF}° Hot`,
      backgroundColor: 'rgba(239,68,68,0.12)',
      textColor: '#DC2626',
    },
    cold: {
      emoji: '🥶',
      label: `${tempF}° Cold`,
      backgroundColor: 'rgba(59,130,246,0.12)',
      textColor: '#2563EB',
    },
  };

  return configs[condition];
}

// Maps play condition to a short status label and color
export function getPlayConditionDisplay(condition: PlayCondition): {
  label: string;
  color: string;
  backgroundColor: string;
} {
  const map = {
    great:  { label: 'Great Conditions', color: '#16A34A', backgroundColor: 'rgba(34,197,94,0.12)' },
    good:   { label: 'Good to Play',     color: '#16A34A', backgroundColor: 'rgba(34,197,94,0.10)' },
    fair:   { label: 'Fair Conditions',  color: '#D97706', backgroundColor: 'rgba(245,158,11,0.12)' },
    poor:   { label: 'Poor Conditions',  color: '#DC2626', backgroundColor: 'rgba(239,68,68,0.12)' },
    avoid:  { label: 'Avoid Outdoors',   color: '#DC2626', backgroundColor: 'rgba(239,68,68,0.18)' },
  };
  return map[condition];
}

// Returns a human-readable warning summary from OutdoorConditions
export function getOutdoorSummary(conditions: OutdoorConditions): string {
  if (conditions.warning) return conditions.warning;
  const { condition, tempF } = conditions;
  if (condition === 'clear' && tempF >= 60 && tempF <= 85) return 'Great outdoor conditions.';
  if (condition === 'hot' || tempF > 92) return 'Hot — bring water and sunscreen.';
  if (condition === 'cold' || tempF < 40) return 'Cold — dress in layers.';
  if (condition === 'windy') return 'Windy today. Ball control may be affected.';
  if (condition === 'light_rain') return 'Light rain expected. Courts may be wet.';
  if (condition === 'heavy_rain' || condition === 'thunderstorm') return 'Outdoor play not recommended.';
  return 'Check conditions before heading out.';
}
