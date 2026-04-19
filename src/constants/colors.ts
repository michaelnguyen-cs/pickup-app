// Pick-Up color system
// Map-first dark aesthetic with clean white bottom sheets
// Accent: electric orange (activity/energy), not playful

export const Colors = {
  // Core backgrounds
  bg: {
    primary: '#0F0F0F',     // app background
    card: '#1A1A1A',        // card background (dark mode)
    sheet: '#FFFFFF',       // bottom sheet / light surfaces
    sheetCard: '#F7F7F7',   // cards inside sheets
    overlay: 'rgba(0,0,0,0.45)',
  },

  // Brand / accent
  accent: {
    orange: '#FF5C1A',      // primary CTA, active pins, "open now"
    orangeLight: '#FF7A45', // hover/pressed state
    orangeSubtle: 'rgba(255,92,26,0.12)',
    green: '#22C55E',       // good conditions, open
    greenSubtle: 'rgba(34,197,94,0.12)',
    yellow: '#F59E0B',      // moderate / casual
    red: '#EF4444',         // warning / rain / closed
    redSubtle: 'rgba(239,68,68,0.12)',
    blue: '#3B82F6',        // indoor / info
    blueSubtle: 'rgba(59,130,246,0.12)',
  },

  // Map pins
  pin: {
    default: '#FF5C1A',
    active: '#FFFFFF',
    cluster: '#1A1A1A',
    clusterText: '#FFFFFF',
  },

  // Text
  text: {
    primary: '#0F0F0F',     // on white surfaces
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',     // on dark surfaces
    inverseSecondary: 'rgba(255,255,255,0.6)',
    accent: '#FF5C1A',
  },

  // Borders
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: 'rgba(255,255,255,0.08)',
  },

  // Sport chip colors (subtle tints)
  sport: {
    basketball: '#F97316',
    volleyball: '#8B5CF6',
    soccer: '#22C55E',
    tennis: '#EAB308',
    running: '#3B82F6',
    default: '#6B7280',
  },

  // Weather
  weather: {
    clear: '#3B82F6',
    cloudy: '#6B7280',
    rain: '#6366F1',
    storm: '#7C3AED',
  },

  // Tab bar
  tab: {
    active: '#FF5C1A',
    inactive: '#9CA3AF',
    background: '#FFFFFF',
    border: '#E5E7EB',
  },
} as const;
