// MapPreviewCard — floating venue preview card triggered by tapping a map pin
//
// Animation layers (two nested Animated.Views):
//
//   Outer — tension wrapper (JS-side, driven by HomeScreen's tensionAnim via setValue):
//     • opacity  1.0 → 0.78  as user pans toward dismiss threshold
//     • scale    1.0 → 0.96  (subtle "held" squeeze)
//     • pointerEvents gated on visible so the invisible card never intercepts touches
//
//   Inner — entrance / exit (native driver):
//     • Spring slide-up + fade on enter
//     • "Pop release" on exit: brief scale inflate → scale-down + fade-out
//
// Venue ref pattern:
//   venueRef always holds the last non-null venue so the exit animation has
//   content to render even after the parent sets venue=null.

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
import { Venue } from '../data/types';
import { StatusBadge } from '../utils/formatting';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { SPORT_MAP } from '../constants/sports';
import { formatDistance, haversineDistance, formatAddress } from '../utils/formatting';
import { useLocationContext } from '../context/LocationContext';

interface MapPreviewCardProps {
  venue: Venue | null;
  statusBadge?: StatusBadge | null;
  visible: boolean;
  onViewDetails: (venueId: string) => void;
  onDismiss: () => void;
  // Animated.Value in range [0, 1] representing how far the user has panned
  // toward the dismiss threshold. Driven by HomeScreen via setValue() so it
  // never triggers a React re-render. Optional — no tension effect if absent.
  tensionAnim?: Animated.Value;
}

export function MapPreviewCard({
  venue,
  statusBadge,
  visible,
  onViewDetails,
  onDismiss,
  tensionAnim,
}: MapPreviewCardProps) {
  // ── Animation values ────────────────────────────────────────────────────────

  // Main entrance / exit value (native driver).
  const anim = useRef(new Animated.Value(0)).current;

  // Pop scale for the release exit animation (native driver).
  const popScale = useRef(new Animated.Value(1)).current;

  // Fallback so tension interpolations are always defined (no conditional hooks).
  const fallbackTension = useRef(new Animated.Value(0)).current;
  const activeTension = tensionAnim ?? fallbackTension;

  // ── Venue ref — holds last non-null venue through exit animation ───────────
  const venueRef = useRef<Venue | null>(null);
  if (venue) venueRef.current = venue;

  // ── Enter / exit animation ─────────────────────────────────────────────────
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
      // Stage 1: brief inflate (card "breathes in" before releasing)
      // Stage 2: collapse + fade simultaneously
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

  // ── Location for distance display ──────────────────────────────────────────
  const { coords } = useLocationContext();

  // ── Interpolations — all defined before any conditional return ─────────────

  // Inner (native-driver) entrance slide + fade.
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const innerOpacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.8, 1],
  });

  // Outer (JS-side) tension: subtle squeeze as user pans toward threshold.
  const tensionOpacity = activeTension.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.78],
  });
  const tensionScale = activeTension.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96],
  });

  // ── Derived display data ───────────────────────────────────────────────────
  const renderVenue = venueRef.current;
  const sport = renderVenue ? SPORT_MAP[renderVenue.sports[0]] : null;
  const distance: number | null =
    renderVenue && coords ? haversineDistance(coords, renderVenue.coordinates) : null;

  if (!renderVenue) return null;

  return (
    // Outer: JS-side tension visual (subtle squeeze during pan)
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={{
        opacity: tensionOpacity,
        transform: [{ scale: tensionScale }],
      }}
    >
      {/* Inner: native-driver entrance/exit */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: innerOpacity,
            transform: [{ translateY }, { scale: popScale }],
          },
        ]}
      >
        {/* Sport icon */}
        <View style={[styles.sportIcon, { backgroundColor: (sport?.color ?? '#6B7280') + '22' }]}>
          <Text style={styles.sportEmoji}>{sport?.emoji ?? '📍'}</Text>
        </View>

        {/* Info block */}
        <View style={styles.infoBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.venueName} numberOfLines={1}>
              {renderVenue.name}
            </Text>
            {statusBadge && (
              <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
                <Text style={[styles.statusText, { color: statusBadge.color }]}>
                  {statusBadge.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={Colors.text.tertiary} />
            <Text style={styles.address} numberOfLines={1}>
              {formatAddress(renderVenue.address)}
            </Text>
            <View style={styles.metaDivider} />
            <Text style={styles.distance}>{formatDistance(distance)}</Text>
          </View>
        </View>

        {/* View Details button */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => onViewDetails(renderVenue.id)}
          activeOpacity={0.82}
        >
          <Text style={styles.ctaText}>View Location</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFF" />
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
          <Ionicons name="close" size={15} color={Colors.text.tertiary} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  sportIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sportEmoji: {
    fontSize: 20,
  },
  infoBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'nowrap',
  },
  venueName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    flex: 1,
    flexShrink: 1,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border.medium,
    flexShrink: 0,
  },
  distance: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
    flexShrink: 0,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent.orange,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  ctaText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFF',
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
});
