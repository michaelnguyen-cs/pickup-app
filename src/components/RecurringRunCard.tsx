// RecurringRunCard — dedicated card for known recurring pickup runs
// Distinguished from venues: shows schedule, skill level, turnout, verified badge
// These are the CORE product unit in Pick-Up

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecurringRun } from '../data/types';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { SPORT_MAP } from '../constants/sports';
import {
  formatScheduleSummary,
  formatSkillLevel,
  formatCost,
  formatDistance,
  haversineDistance,
} from '../utils/formatting';
import { PopularityBadge } from './PopularityBadge';
import { useLocationContext } from '../context/LocationContext';
import { useSavedContext } from '../context/SavedContext';

interface RecurringRunCardProps {
  run: RecurringRun;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

function SkillLevelPill({ level }: { level: RecurringRun['skillLevel'] }) {
  const colorMap = {
    beginner: { bg: Colors.accent.greenSubtle, text: '#16A34A' },
    casual: { bg: Colors.accent.greenSubtle, text: '#16A34A' },
    intermediate: { bg: 'rgba(234,179,8,0.12)', text: '#CA8A04' },
    competitive: { bg: Colors.accent.redSubtle, text: '#DC2626' },
    mixed: { bg: Colors.accent.blueSubtle, text: '#2563EB' },
  };
  const c = colorMap[level];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]}>{formatSkillLevel(level)}</Text>
    </View>
  );
}

export function RecurringRunCard({ run, onPress, variant = 'default' }: RecurringRunCardProps) {
  const { coords } = useLocationContext();
  const { isRunSaved, toggleRunSaved } = useSavedContext();
  const sport = SPORT_MAP[run.sport];
  const distance = coords ? haversineDistance(coords, run.venueCoordinates) : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.sportIcon}>
          <Text style={styles.sportEmoji}>{sport?.emoji ?? '🏃'}</Text>
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {run.name}
            </Text>
            {run.isVerified && (
              <Ionicons name="checkmark-circle" size={14} color={Colors.accent.green} />
            )}
          </View>
          <Text style={styles.venueName} numberOfLines={1}>
            {run.venueName}
          </Text>
        </View>
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleRunSaved(run.id)}
          style={styles.saveBtn}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isRunSaved(run.id) ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={isRunSaved(run.id) ? Colors.accent.orange : Colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Schedule */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={13} color={Colors.text.tertiary} />
        <Text style={styles.infoText}>{formatScheduleSummary(run.schedule)}</Text>
      </View>

      {/* Players */}
      {run.typicalTurnout != null && (
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={13} color={Colors.text.tertiary} />
          <Text style={styles.infoText}>
            Usually {run.typicalTurnout}
            {run.maxPlayers ? `/${run.maxPlayers}` : '+'} players
          </Text>
        </View>
      )}

      {/* Footer pills */}
      <View style={styles.footer}>
        <SkillLevelPill level={run.skillLevel} />
        <View style={styles.costPill}>
          <Text style={styles.costText}>{formatCost(run.costPerSession)}</Text>
        </View>
        <PopularityBadge score={run.popularityScore} style={styles.popBadge} />
      </View>
    </TouchableOpacity>
  );
}

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
  },
  sportEmoji: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  venueName: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  distanceBadge: {
    backgroundColor: Colors.bg.sheetCard,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  saveBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
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
  costPill: {
    backgroundColor: Colors.accent.greenSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  costText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#16A34A',
  },
  popBadge: {
    marginLeft: 'auto',
  },
});
