// WeatherBadge — compact inline weather pill
// Inspired by glassmorphism weather chips (see design refs)
// Used on venue cards and detail screens for outdoor locations only

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OutdoorConditions } from '../data/types';
import { getWeatherBadge, getPlayConditionDisplay } from '../utils/weather';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';

interface WeatherBadgeProps {
  conditions: OutdoorConditions;
  variant?: 'compact' | 'full'; // compact = just emoji+temp, full = adds play condition
}

export function WeatherBadge({ conditions, variant = 'compact' }: WeatherBadgeProps) {
  const badge = getWeatherBadge(conditions.condition, conditions.tempF);
  const playDisplay = getPlayConditionDisplay(conditions.playCondition);

  if (variant === 'compact') {
    return (
      <View style={[styles.pill, { backgroundColor: badge.backgroundColor }]}>
        <Text style={styles.emoji}>{badge.emoji}</Text>
        <Text style={[styles.label, { color: badge.textColor }]}>{badge.label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullRow}>
      <View style={[styles.pill, { backgroundColor: badge.backgroundColor }]}>
        <Text style={styles.emoji}>{badge.emoji}</Text>
        <Text style={[styles.label, { color: badge.textColor }]}>{badge.label}</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: playDisplay.backgroundColor }]}>
        <Text style={[styles.label, { color: playDisplay.color }]}>{playDisplay.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 4,
  },
  emoji: {
    fontSize: FontSize.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.1,
  },
  fullRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
});
