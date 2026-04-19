// SportChip — pill filter chip for sport selection and filter rows
// Used on home screen filter bar and explore screen

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Sport } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';

interface SportChipProps {
  sport: Sport;
  isActive?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function SportChip({ sport, isActive = false, onPress, size = 'md' }: SportChipProps) {
  const isSmall = size === 'sm';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        isSmall && styles.chipSmall,
        isActive
          ? { backgroundColor: Colors.accent.orange, borderColor: Colors.accent.orange }
          : { backgroundColor: Colors.bg.sheetCard, borderColor: Colors.border.light },
      ]}
    >
      <Text style={[styles.emoji, isSmall && styles.emojiSmall]}>{sport.emoji}</Text>
      <Text
        style={[
          styles.label,
          isSmall && styles.labelSmall,
          { color: isActive ? '#FFF' : Colors.text.primary },
        ]}
      >
        {sport.label}
      </Text>
    </TouchableOpacity>
  );
}

// A standalone text-only filter chip for non-sport filters like "Open Now", "Indoor", etc.
interface FilterChipProps {
  label: string;
  emoji?: string;
  isActive?: boolean;
  onPress?: () => void;
}

export function FilterChip({ label, emoji, isActive = false, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        isActive
          ? { backgroundColor: Colors.accent.orange, borderColor: Colors.accent.orange }
          : { backgroundColor: Colors.bg.sheetCard, borderColor: Colors.border.light },
      ]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[
          styles.label,
          { color: isActive ? '#FFF' : Colors.text.primary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  emoji: {
    fontSize: FontSize.sm,
  },
  emojiSmall: {
    fontSize: FontSize.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: FontSize.xs,
  },
});
