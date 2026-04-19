// Formatting helpers — display-ready strings from raw data
// Pure functions, no side effects

import { DayOfWeek, SkillLevel, TimeSlot, IndoorOutdoor, RecurringRun } from '../data/types';

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const DAY_FULL: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

// "18:00" → "6:00 PM"
export function formatTime(time24: string): string {
  const [hourStr, minuteStr] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

// "18:00" + "21:00" → "6–9 PM"
export function formatTimeRange(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startPeriod = sh >= 12 ? 'PM' : 'AM';
  const endPeriod = eh >= 12 ? 'PM' : 'AM';
  const startH = sh % 12 === 0 ? 12 : sh % 12;
  const endH = eh % 12 === 0 ? 12 : eh % 12;
  const startStr = sm === 0 ? `${startH}` : `${startH}:${sm.toString().padStart(2, '0')}`;
  const endStr = em === 0 ? `${endH}` : `${endH}:${em.toString().padStart(2, '0')}`;
  if (startPeriod === endPeriod) {
    return `${startStr}–${endStr} ${endPeriod}`;
  }
  return `${startStr} ${startPeriod}–${endStr} ${endPeriod}`;
}

// ["mon","wed","fri"] → "Mon, Wed, Fri"
export function formatDays(days: DayOfWeek[]): string {
  return days.map((d) => DAY_LABELS[d]).join(', ');
}

// Summarize a schedule into a compact string
// e.g. "Mon, Wed, Fri · 6–9 PM"
export function formatScheduleSummary(slots: TimeSlot[]): string {
  if (!slots.length) return 'Schedule TBD';
  // Group by same time range
  const days = slots.map((s) => s.day);
  const first = slots[0];
  const timeStr = formatTimeRange(first.startTime, first.endTime);
  return `${formatDays(days)} · ${timeStr}`;
}

// Popularity score → human label
export function formatPopularity(score: number): string {
  if (score >= 90) return 'Very Popular';
  if (score >= 75) return 'Popular';
  if (score >= 55) return 'Moderate';
  return 'Quiet';
}

// 0–100 → percentage string for occupancy
export function formatOccupancy(current: number, max: number): string {
  const pct = Math.round((current / max) * 100);
  if (pct >= 90) return 'Almost Full';
  if (pct >= 65) return `${current}/${max} here`;
  return `${current} here`;
}

// Skill level → display label
export function formatSkillLevel(level: SkillLevel): string {
  const labels: Record<SkillLevel, string> = {
    beginner: 'Beginner Friendly',
    casual: 'Casual',
    intermediate: 'Intermediate',
    competitive: 'Competitive',
    mixed: 'All Levels',
  };
  return labels[level];
}

// Indoor/outdoor → label
export function formatIndoorOutdoor(io: IndoorOutdoor): string {
  const map: Record<IndoorOutdoor, string> = {
    indoor: 'Indoor',
    outdoor: 'Outdoor',
    both: 'Indoor & Outdoor',
  };
  return map[io];
}

// ISO datetime → "Today 6:00 PM" or "Sat 6:00 PM"
export function formatEventTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today · ${timeStr}`;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` · ${timeStr}`;
}

// n minutes ago → "8m ago", "2h ago", "yesterday"
export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return 'yesterday';
}

// Cost display
export function formatCost(cost?: number): string {
  if (!cost) return 'Free';
  return `$${cost}/session`;
}

// Distance in miles
export function formatDistance(miles: number): string {
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft`;
  return `${miles.toFixed(1)} mi`;
}

// ─── Real distance calculation ────────────────────────────────────────────────

// Haversine formula — great-circle distance between two lat/lon points, in miles.
// Accurate to within ~0.3% for the distances involved (< 50 miles).
export function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 3_958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLon * sinDLon;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Fallback mock distances — used when location permission is denied or not yet resolved.
// Keyed by venue ID to stay consistent with mock data.
export function mockDistance(venueId: string): number {
  const distances: Record<string, number> = {
    v1: 0.3,
    v2: 1.2,
    v3: 0.8,
    v4: 2.1,
    v5: 0.5,
    v6: 1.6,
    v7: 3.4,
    v8: 4.7,
  };
  return distances[venueId] ?? 2.0;
}

// ─── Venue status badge ───────────────────────────────────────────────────────
// Derives live status from recurring run schedules relative to current time.
// Returns a display-ready badge: "Open Now" (green), "Tonight 7pm" (amber), or
// "Runs Weekly" (gray). Returns null if no runs are associated with this venue.
//
// Real implementation: replace with DB query + server timestamp comparison.

export interface StatusBadge {
  label: string;
  color: string;
  bg: string;
}

export function getVenueStatusBadge(
  venueId: string,
  runs: RecurringRun[]
): StatusBadge | null {
  const runsHere = runs.filter((r) => r.venueId === venueId && r.status === 'active');
  if (!runsHere.length) return null;

  const now = new Date();
  const dayIndex = now.getDay(); // 0 = Sunday
  const dayKeys: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = dayKeys[dayIndex];
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const toMins = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // 1. Something is happening RIGHT NOW
  const openNow = runsHere.some((r) =>
    r.schedule.some(
      (s) =>
        s.day === today &&
        currentMins >= toMins(s.startTime) &&
        currentMins <= toMins(s.endTime)
    )
  );
  if (openNow) {
    return { label: 'Open Now', color: '#16A34A', bg: 'rgba(34,197,94,0.13)' };
  }

  // 2. Something is happening LATER TODAY (next 8 hours)
  const upcomingSlots = runsHere
    .flatMap((r) => r.schedule)
    .filter((s) => {
      const start = toMins(s.startTime);
      return s.day === today && start > currentMins && start - currentMins <= 480;
    })
    .sort((a, b) => toMins(a.startTime) - toMins(b.startTime));

  if (upcomingSlots.length > 0) {
    return {
      label: `Tonight ${formatTime(upcomingSlots[0].startTime)}`,
      color: '#D97706',
      bg: 'rgba(245,158,11,0.12)',
    };
  }

  // 3. Has regular scheduled runs (just not today/right now)
  return { label: 'Runs Weekly', color: '#6B7280', bg: 'rgba(107,114,128,0.10)' };
}
