// FilterChipRow — horizontal scrolling filter strip
// Used on home map screen and explore screen
// Combines sport chips + utility filters (Open Now, Indoor, Popular Now, etc.)

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { FilterChip, SportChip } from './SportChip';
import { SPORTS, HOME_FILTER_SPORTS, Sport } from '../constants/sports';
import { FilterChipId } from '../data/types';
import { Spacing } from '../constants/spacing';

const UTILITY_FILTERS: Array<{ id: FilterChipId; label: string; emoji?: string }> = [
  { id: 'open_now', label: 'Open Now', emoji: '🟢' },
  { id: 'popular_now', label: 'Popular Now', emoji: '🔥' },
  { id: 'indoor', label: 'Indoor' },
  { id: 'outdoor', label: 'Outdoor' },
  { id: 'casual', label: 'Casual' },
  { id: 'competitive', label: 'Competitive' },
  { id: 'free', label: 'Free' },
];

interface FilterChipRowProps {
  activeFilters: FilterChipId[];
  onToggle: (id: FilterChipId) => void;
  showSports?: boolean;
}

export function FilterChipRow({
  activeFilters,
  onToggle,
  showSports = true,
}: FilterChipRowProps) {
  const visibleSports = SPORTS.filter((s) => HOME_FILTER_SPORTS.includes(s.id));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {/* Utility filters first (highest utility) */}
      {UTILITY_FILTERS.map((f) => (
        <FilterChip
          key={f.id}
          label={f.label}
          emoji={f.emoji}
          isActive={activeFilters.includes(f.id)}
          onPress={() => onToggle(f.id)}
        />
      ))}

      {/* Sport chips */}
      {showSports &&
        visibleSports.map((sport) => (
          <SportChip
            key={sport.id}
            sport={sport}
            isActive={activeFilters.includes(sport.id as FilterChipId)}
            onPress={() => onToggle(sport.id as FilterChipId)}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
});
