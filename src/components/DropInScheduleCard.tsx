import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DropInSchedule, AccessRestriction } from '../data/dropInSchedules';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { SPORT_MAP } from '../constants/sports';
import { SportId } from '../constants/sports';

// ── Sport display helpers ──────────────────────────────────────────────────────

// Some drop-in sport slugs don't match SportId directly.
const SPORT_ALIAS: Record<string, SportId> = {
  beach_volleyball: 'volleyball',
};

const SPORT_EMOJI_OVERRIDE: Record<string, string> = {
  open_gym: '🏋️',
};

function getSportEmoji(sport: string): string {
  if (SPORT_EMOJI_OVERRIDE[sport]) return SPORT_EMOJI_OVERRIDE[sport];
  const sportId: SportId = (SPORT_ALIAS[sport] ?? sport) as SportId;
  return SPORT_MAP[sportId]?.emoji ?? '🏃';
}

function getSportLabel(sport: string): string {
  if (sport === 'open_gym') return 'Open Gym';
  if (sport === 'beach_volleyball') return 'Beach Volleyball';
  const sportId: SportId = (SPORT_ALIAS[sport] ?? sport) as SportId;
  return SPORT_MAP[sportId]?.label ?? sport.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Time formatting ────────────────────────────────────────────────────────────

function fmt24(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = fmt24(start);
  const e = fmt24(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  return 'Time TBD';
}

// ── Access badge config ────────────────────────────────────────────────────────

const ACCESS_CONFIG: Record<AccessRestriction, { label: string; bg: string; color: string } | null> = {
  public_paid:                 { label: 'Public · Paid',       bg: Colors.accent.greenSubtle,  color: '#16A34A' },
  membership_or_day_pass:      { label: 'Member / Day Pass',   bg: Colors.accent.blueSubtle,   color: '#2563EB' },
  membership_required:         { label: 'Members Only',        bg: Colors.accent.blueSubtle,   color: '#2563EB' },
  membership_plus_registration:{ label: 'Member + Register',   bg: Colors.accent.blueSubtle,   color: '#2563EB' },
  unknown:                     null,
};

// ── Small pill ─────────────────────────────────────────────────────────────────

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  schedule: DropInSchedule;
}

export function DropInScheduleCard({ schedule }: Props) {
  const accessCfg = ACCESS_CONFIG[schedule.accessRestriction];
  const isAgePlus = schedule.ageRestriction === '18+' || schedule.tags.includes('18_plus');
  const isMayChange = schedule.tags.includes('schedule_may_change');
  const isCapLimited = !!schedule.capacity || schedule.tags.includes('capacity_limited');
  const showConfidence = schedule.confidence !== 'high';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => Linking.openURL(schedule.sourceUrl).catch(() => {})}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.sportIcon}>
          <Text style={styles.sportEmoji}>{getSportEmoji(schedule.sport)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{schedule.title}</Text>
          <Text style={styles.venue} numberOfLines={1}>{schedule.venue}</Text>
        </View>
        <Ionicons name="open-outline" size={14} color={Colors.text.tertiary} />
      </View>

      {/* Sport + day/time row */}
      <View style={styles.infoRow}>
        <Ionicons name="barbell-outline" size={13} color={Colors.text.tertiary} />
        <Text style={styles.infoText}>{getSportLabel(schedule.sport)}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={13} color={Colors.text.tertiary} />
        <Text style={styles.infoText}>{schedule.days.join(', ')}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={13} color={Colors.text.tertiary} />
        <Text style={styles.infoText}>{formatTimeRange(schedule.startTime, schedule.endTime)}</Text>
      </View>

      {/* Cost note */}
      {!!schedule.costNote && (
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={13} color={Colors.text.tertiary} />
          <Text style={styles.infoText} numberOfLines={2}>{schedule.costNote}</Text>
        </View>
      )}

      {/* Badges */}
      <View style={styles.badges}>
        {accessCfg && <Pill label={accessCfg.label} bg={accessCfg.bg} color={accessCfg.color} />}
        {schedule.registrationRequired && (
          <Pill label="Register Required" bg="rgba(245,158,11,0.12)" color="#B45309" />
        )}
        {isCapLimited && (
          <Pill label="Capacity Limited" bg={Colors.accent.orangeSubtle} color={Colors.accent.orange} />
        )}
        {isMayChange && (
          <Pill label="Schedule May Change" bg="rgba(245,158,11,0.12)" color="#B45309" />
        )}
        {isAgePlus && (
          <Pill label="18+" bg={Colors.bg.sheetCard} color={Colors.text.secondary} />
        )}
        {showConfidence && (
          <Pill
            label={`Confidence: ${schedule.confidence}`}
            bg={Colors.accent.redSubtle}
            color="#DC2626"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.card,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sportIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.sheetCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sportEmoji: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  venue: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: FontSize.sm * 1.4,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
