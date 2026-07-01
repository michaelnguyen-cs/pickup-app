// PopularityBadge — shows activity level at a venue
// Uses a simple dot + text system — no gamification vibes

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPopularity } from '../utils/formatting';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';

interface PopularityBadgeProps {
  score: number | null | undefined;  // 0–100
  showDot?: boolean;
  style?: object;
}

function getPopularityColor(score: number): string {
  if (score >= 90) return '#EF4444'; // red — packed
  if (score >= 75) return '#F97316'; // orange — popular
  if (score >= 55) return '#EAB308'; // yellow — moderate
  return '#22C55E';                  // green — quiet
}

export function PopularityBadge({ score, showDot = true, style }: PopularityBadgeProps) {
  if (score == null) return null;

  const color = getPopularityColor(score);
  const label = formatPopularity(score);

  return (
    <View style={[styles.container, style]}>
      {showDot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
