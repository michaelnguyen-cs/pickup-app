// Pick-Up core data types
// Designed to map 1:1 to future Supabase tables
// Supabase migration: replace mock arrays with supabase.from('venues').select() etc.

import { SportId } from '../constants/sports';

// ─── Geography ────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ─── Venue ────────────────────────────────────────────────────────────────────

export type VenueType = 'park' | 'rec_center' | 'ymca' | 'sports_complex' | 'school' | 'private';
export type SurfaceType = 'hardwood' | 'concrete' | 'turf' | 'grass' | 'sand' | 'indoor_court';
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both';

export interface Venue {
  id: string;
  name: string;
  shortName: string;              // for map pins / small displays
  venueType: VenueType;
  sports: SportId[];
  address: string;
  city: string;
  coordinates: Coordinates;
  indoorOutdoor: IndoorOutdoor;
  surface?: SurfaceType;
  imageUrl: string;               // placeholder image URL (unsplash etc.)
  description: string;
  amenities: string[];            // e.g. ['parking', 'restrooms', 'water fountain']
  phone?: string;
  website?: string;
  popularityScore: number;        // 0–100
  currentOccupancy?: number;      // live estimate (mock)
  maxOccupancy?: number;
  isSaved?: boolean;
  tags: string[];                 // e.g. ['popular', 'well-lit', 'competitive']
  createdAt: string;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TimeSlot {
  day: DayOfWeek;
  startTime: string;  // "HH:MM" 24h
  endTime: string;
  label?: string;     // e.g. "Morning Open Gym"
  isBusy?: boolean;   // known high-demand slot
}

// ─── Recurring Run ────────────────────────────────────────────────────────────
// The PRIMARY data type — recurring known-good runs are more valuable than one-off events

export type SkillLevel = 'beginner' | 'casual' | 'intermediate' | 'competitive' | 'mixed';
export type RunStatus = 'active' | 'paused' | 'cancelled';

export interface RecurringRun {
  id: string;
  venueId: string;
  venueName: string;
  venueCoordinates: Coordinates;
  sport: SportId;
  name: string;                   // e.g. "Tuesday Night Pickup Basketball"
  description: string;
  schedule: TimeSlot[];           // which days/times this recurs
  skillLevel: SkillLevel;
  typicalTurnout: number;         // expected # of players
  maxPlayers?: number;
  costPerSession?: number;        // 0 = free
  organizer?: string;             // name of known host (optional)
  status: RunStatus;
  popularityScore: number;        // 0–100
  tags: string[];
  isVerified: boolean;            // verified recurring run vs user-reported
  createdAt: string;
}

// ─── One-Time Event ───────────────────────────────────────────────────────────
// Secondary — user-created events. Simpler model than recurring runs.

export type EventStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface OneTimeEvent {
  id: string;
  venueId: string;
  venueName: string;
  venueCoordinates: Coordinates;
  sport: SportId;
  title: string;
  description: string;
  startTime: string;              // ISO datetime string
  endTime: string;
  skillLevel: SkillLevel;
  currentPlayers: number;
  maxPlayers?: number;
  costPerPerson?: number;
  status: EventStatus;
  createdBy: string;              // userId
  imageUrl?: string;
  createdAt: string;
}

// ─── Outdoor Conditions ───────────────────────────────────────────────────────

export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'light_rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'windy'
  | 'hot'
  | 'cold';

export type PlayCondition = 'great' | 'good' | 'fair' | 'poor' | 'avoid';

export interface OutdoorConditions {
  venueId: string;
  tempF: number;
  condition: WeatherCondition;
  windMph: number;
  humidity: number;
  playCondition: PlayCondition;
  warning?: string;               // e.g. "Courts may be wet from earlier rain"
  updatedAt: string;
}

// ─── Venue Popularity ─────────────────────────────────────────────────────────

export interface VenuePopularity {
  venueId: string;
  currentCount: number;
  maxExpected: number;
  peakHours: string[];            // e.g. ['18:00–20:00', '10:00–12:00']
  bestTimesToGo: string[];        // human-readable e.g. ['Weekday mornings', 'Sunday afternoons']
  lastUpdated: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  userId: string;
  preferredSports: SportId[];
  skillLevel: SkillLevel;
  searchRadiusMiles: number;
  homeCampusOrCity: string;
  notificationsEnabled: boolean;
  notifyForSports: SportId[];
}

// ─── Saved ────────────────────────────────────────────────────────────────────

export interface SavedVenue {
  userId: string;
  venueId: string;
  savedAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
// Utility-only: temporary group chats tied to venue or event
// No DMs, no friend system

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
}

export interface ChatRoom {
  id: string;
  venueId?: string;
  eventId?: string;
  label: string;                  // e.g. "Tuesday Night Run Chat"
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

// ─── Filter State ─────────────────────────────────────────────────────────────

export type FilterChipId =
  | SportId
  | 'open_now'
  | 'indoor'
  | 'outdoor'
  | 'popular_now'
  | 'casual'
  | 'competitive'
  | 'free';

export interface FilterState {
  activeFilters: FilterChipId[];
  sortBy: 'distance' | 'popularity' | 'time' | 'sport';
}
