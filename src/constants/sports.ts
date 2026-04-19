// Sports catalog — used for filter chips, venue tags, and preference selection

export type SportId =
  | 'basketball'
  | 'volleyball'
  | 'soccer'
  | 'tennis'
  | 'running'
  | 'football'
  | 'pickleball'
  | 'badminton'
  | 'swimming';

export interface Sport {
  id: SportId;
  label: string;
  emoji: string;
  color: string;
}

export const SPORTS: Sport[] = [
  { id: 'basketball', label: 'Basketball', emoji: '🏀', color: '#F97316' },
  { id: 'volleyball', label: 'Volleyball', emoji: '🏐', color: '#8B5CF6' },
  { id: 'soccer', label: 'Soccer', emoji: '⚽', color: '#22C55E' },
  { id: 'tennis', label: 'Tennis', emoji: '🎾', color: '#EAB308' },
  { id: 'running', label: 'Running', emoji: '🏃', color: '#3B82F6' },
  { id: 'football', label: 'Football', emoji: '🏈', color: '#DC2626' },
  { id: 'pickleball', label: 'Pickleball', emoji: '🏓', color: '#06B6D4' },
  { id: 'badminton', label: 'Badminton', emoji: '🏸', color: '#EC4899' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', color: '#0EA5E9' },
];

export const SPORT_MAP = Object.fromEntries(SPORTS.map((s) => [s.id, s])) as Record<SportId, Sport>;

// Quick-access filter chips shown on home screen (subset)
export const HOME_FILTER_SPORTS: SportId[] = [
  'basketball',
  'volleyball',
  'soccer',
  'tennis',
  'running',
  'pickleball',
];
