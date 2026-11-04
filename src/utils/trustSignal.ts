// trustSignal.ts — derives a single display-ready trust/freshness signal from
// a run's provenance fields and its recent report count.
//
// Priority order (highest first):
//   1. issue_reports      — actionable warning, overrides everything
//   2. low_confidence     — AI-extracted run with uncertain schedule data
//   3. verified_recently  — positive confirmation, schedule was recently checked
//   4. not_recently_verified — stale, but no active warning
//
// Returns null for admin-entered runs with no provenance data (confidence_score
// and last_verified_at both null) — these are implicitly trusted and showing a
// label would add noise without information.

import { Colors } from '../constants/colors';

// Thresholds
const RECENT_DAYS = 30;           // last_verified_at within this → verified_recently
const STALE_DAYS = 60;            // last_verified_at beyond this  → not_recently_verified
const LOW_CONFIDENCE = 0.70;      // confidence_score below this   → low_confidence
const REPORT_THRESHOLD = 2;       // report count at or above this → issue_reports

export type TrustSignalType =
  | 'issue_reports'
  | 'low_confidence'
  | 'verified_recently'
  | 'not_recently_verified';

export interface TrustSignal {
  type: TrustSignalType;
  label: string;
  icon: string;   // Ionicons name
  color: string;  // text + icon tint
  bg: string;     // pill background
}

export function getTrustSignal(
  run: { confidenceScore?: number | null; lastVerifiedAt?: string | null },
  recentReportCount: number
): TrustSignal | null {
  const daysSinceVerified = run.lastVerifiedAt
    ? (Date.now() - new Date(run.lastVerifiedAt).getTime()) / 86_400_000
    : null;

  // ── Issue reports — highest priority warning ───────────────────────────────
  if (recentReportCount >= REPORT_THRESHOLD) {
    const n = recentReportCount;
    return {
      type: 'issue_reports',
      label: n === 1 ? '1 recent issue report' : `${n} recent issue reports`,
      icon: 'warning-outline',
      color: '#D97706',
      bg: 'rgba(245,158,11,0.10)',
    };
  }

  // ── Low confidence — AI-extracted with uncertain schedule data ─────────────
  if (run.confidenceScore !== null && run.confidenceScore !== undefined
      && run.confidenceScore < LOW_CONFIDENCE) {
    return {
      type: 'low_confidence',
      label: 'Unverified schedule',
      icon: 'help-circle-outline',
      color: Colors.text.tertiary,
      bg: Colors.bg.sheetCard,
    };
  }

  // ── Verified recently — positive freshness signal ──────────────────────────
  if (daysSinceVerified !== null && daysSinceVerified <= RECENT_DAYS) {
    return {
      type: 'verified_recently',
      label: 'Verified recently',
      icon: 'checkmark-circle-outline',
      color: '#16A34A',
      bg: Colors.accent.greenSubtle,
    };
  }

  // ── Not recently verified — stale but no active warning ───────────────────
  if (daysSinceVerified !== null && daysSinceVerified > STALE_DAYS) {
    return {
      type: 'not_recently_verified',
      label: 'Not recently verified',
      icon: 'time-outline',
      color: Colors.text.tertiary,
      bg: Colors.bg.sheetCard,
    };
  }

  // No signal: admin-entered run with no provenance metadata
  return null;
}
