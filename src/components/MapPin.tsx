// MapPin — custom map marker component
// Inspired by: orange pin on dark teal map (Pickup app reference screenshots)
// Sport emoji inside, pulsing ring for active/popular venues

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Radius } from '../constants/spacing';
import { SPORT_MAP, SportId } from '../constants/sports';
import { FontSize } from '../constants/typography';

interface MapPinProps {
  sport?: SportId;     // omitted for cluster pins — not rendered in that branch
  isActive?: boolean;
  isPopular?: boolean; // adds subtle ring
  count?: number;      // for cluster pins
}

// React.memo prevents custom marker views from re-rendering on every map state
// change (e.g. sheet drag, filter toggle). Combined with tracksViewChanges={false}
// on the Marker, this eliminates the main source of map FPS drops.
export const MapPin = React.memo(function MapPin({ sport, isActive = false, isPopular = false, count }: MapPinProps) {
  if (count && count > 1) {
    // Cluster pin
    return (
      <View style={styles.cluster}>
        <Text style={styles.clusterText}>{count}</Text>
      </View>
    );
  }

  const sportData = sport ? SPORT_MAP[sport] : undefined;

  return (
    <View style={styles.wrapper}>
      {isPopular && <View style={styles.ring} />}
      <View style={[styles.pin, isActive && styles.pinActive]}>
        <Text style={styles.emoji}>{sportData?.emoji ?? '📍'}</Text>
      </View>
      {/* Teardrop tail */}
      <View style={[styles.tail, isActive && styles.tailActive]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,92,26,0.18)',
    top: -6,
    left: -6,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.pin.default,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinActive: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: Colors.accent.orange,
  },
  emoji: {
    fontSize: 18,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.pin.default,
    marginTop: -2,
  },
  tailActive: {
    borderTopColor: '#FFF',
  },
  cluster: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 6,
    backgroundColor: Colors.pin.cluster,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.pin.clusterText,
  },
});
