// MapPreviewCard — floating venue preview card triggered by tapping a map pin
//
// Positioned above the bottom sheet, below the map's surface.
// Animates in with a spring slide-up + fade when a venue is selected.
// Animates out quickly on dismiss.
//
// Design: DoorDash-style focused venue popup over the map.
// Contains: sport emoji, venue name, short address, distance, status badge,
//           "View Details" CTA, and a dismiss (×) button.
//
// The parent (HomeScreen) owns visibility — this component is always mounted
// and animates based on the `visible` prop. This avoids unmount/remount jank.

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
import { formatDistance, mockDistance, haversineDistance } from '../utils/formatting';
import { useLocationContext } from '../context/LocationContext';

interface MapPreviewCardProps {
  venue: Venue | null;
  statusBadge?: StatusBadge | null;
  visible: boolean;
  onViewDetails: (venueId: string) => void;
  onDismiss: () => void;
}

export function MapPreviewCard({
  venue,
  statusBadge,
  visible,
  onViewDetails,
  onDismiss,
}: MapPreviewCardProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Spring slide-up entrance
      Animated.spring(anim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      // Quick fade-slide exit
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Don't render DOM at all when fully hidden
  if (!venue) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.8, 1],
  });

  const { coords } = useLocationContext();
  const sport = SPORT_MAP[venue.sports[0]];
  const distance = coords
    ? haversineDistance(coords, venue.coordinates)
    : mockDistance(venue.id);

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY }] }]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      {/* Sport icon */}
      <View style={[styles.sportIcon, { backgroundColor: (sport?.color ?? '#6B7280') + '22' }]}>
        <Text style={styles.sportEmoji}>{sport?.emoji ?? '📍'}</Text>
      </View>

      {/* Info block */}
      <View style={styles.infoBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.venueName} numberOfLines={1}>
            {venue.name}
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
            {venue.address}
          </Text>
          <View style={styles.metaDivider} />
          <Text style={styles.distance}>{formatDistance(distance)}</Text>
        </View>
      </View>

      {/* View Details button */}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => onViewDetails(venue.id)}
        activeOpacity={0.82}
      >
        <Text style={styles.ctaText}>View</Text>
        <Ionicons name="arrow-forward" size={13} color="#FFF" />
      </TouchableOpacity>

      {/* Dismiss */}
      <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
        <Ionicons name="close" size={15} color={Colors.text.tertiary} />
      </TouchableOpacity>
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
    // Stronger shadow for a floating feel
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
