// DropInPreviewCard — floating preview triggered by tapping a drop-in map pin.
// Same spring-entrance / pop-release exit as MapPreviewCard.
// Shows venue name, up to 3 sessions, and cost note.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DropInVenuePin } from '../data/dropInSchedules';
import { SPORT_MAP, SportId } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';

// ── Tiny helpers (duplicated from DropInScheduleCard to keep both self-contained) ──

const SPORT_EMOJI_OVERRIDE: Record<string, string> = { open_gym: '🏋️' };

function sportEmoji(sport: string): string {
  return SPORT_EMOJI_OVERRIDE[sport]
    ?? SPORT_MAP[sport === 'beach_volleyball' ? 'volleyball' : (sport as SportId)]?.emoji
    ?? '🏃';
}

function fmtTime(t: string | null | undefined): string | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = fmtTime(start);
  const e = fmtTime(end);
  if (s && e) return `${s}–${e}`;
  if (s) return `From ${s}`;
  return 'Time TBD';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  venue: DropInVenuePin | null;
  visible: boolean;
  onDismiss: () => void;
}

export function DropInPreviewCard({ venue, visible, onDismiss }: Props) {
  const anim     = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(1)).current;

  // Hold last non-null venue through exit animation.
  const venueRef = useRef<DropInVenuePin | null>(null);
  if (venue) venueRef.current = venue;

  useEffect(() => {
    if (visible) {
      popScale.setValue(1);
      Animated.spring(anim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.sequence([
        Animated.timing(popScale, {
          toValue: 1.04,
          duration: 55,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(popScale, {
            toValue: 0.88,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 190,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, anim, popScale]);

  const renderVenue = venueRef.current;
  if (!renderVenue) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.8, 1] });

  const MAX_SESSIONS = 3;
  const sessions     = renderVenue.schedules.slice(0, MAX_SESSIONS);
  const extraCount   = renderVenue.schedules.length - MAX_SESSIONS;
  const costNote     = renderVenue.schedules.find((s) => s.costNote)?.costNote ?? null;

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={{ opacity, transform: [{ translateY }, { scale: popScale }] }}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Text style={styles.headerEmoji}>📅</Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.venueName} numberOfLines={1}>{renderVenue.name}</Text>
            <Text style={styles.typeLabel}>Drop-In / Open Play</Text>
          </View>
          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Ionicons name="close" size={15} color={Colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Session rows */}
        <View style={styles.sessions}>
          {sessions.map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <Text style={styles.sessionEmoji}>{sportEmoji(s.sport)}</Text>
              <Text style={styles.sessionText} numberOfLines={1}>
                {s.days.join(', ')} · {fmtRange(s.startTime, s.endTime)}
              </Text>
            </View>
          ))}
          {extraCount > 0 && (
            <Text style={styles.moreText}>+{extraCount} more session{extraCount > 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Cost note */}
        {!!costNote && (
          <View style={styles.costRow}>
            <Ionicons name="cash-outline" size={12} color={Colors.text.tertiary} />
            <Text style={styles.costText} numberOfLines={2}>{costNote}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerEmoji: { fontSize: 18 },
  titleBlock: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  venueName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  typeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#3B82F6',
  },
  dismissBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bg.sheetCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sessions: {
    gap: 3,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionEmoji: { fontSize: 13 },
  sessionText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  moreText: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.light,
  },
  costText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    lineHeight: FontSize.xs * 1.5,
  },
});
