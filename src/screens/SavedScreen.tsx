// SavedScreen — user's saved venues and favorite runs
// Simple, clean list. No social feed. Purely utility.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { VenueCard } from '../components/VenueCard';
import { RecurringRunCard } from '../components/RecurringRunCard';
import { MOCK_CONDITIONS } from '../data/mockConditions';
import { getVenueStatusBadge } from '../utils/formatting';
import { useVenues } from '../hooks/useVenues';
import { useRuns } from '../hooks/useRuns';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';
import { RootStackParamList } from '../navigation/types';
import { useSavedContext } from '../context/SavedContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SavedTab = 'venues' | 'runs';

export function SavedScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<SavedTab>('venues');
  const { savedIds, savedRunIds } = useSavedContext();
  const { venues } = useVenues();
  const { runs } = useRuns();

  const savedVenues = venues.filter((v) => savedIds.has(v.id));
  const savedRuns = runs.filter((r) => savedRunIds.has(r.id));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
      </View>

      {/* Tab row */}
      <View style={styles.tabRow}>
        {(['venues', 'runs'] as SavedTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'venues' ? `Venues (${savedVenues.length})` : `Runs (${savedRuns.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {activeTab === 'venues' ? (
        <FlatList
          data={savedVenues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the bookmark icon on any venue or run to save it here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const conditions = MOCK_CONDITIONS.find((c) => c.venueId === item.id);
            const statusBadge = getVenueStatusBadge(item.id, runs);
            return (
              <VenueCard
                venue={item}
                outdoorConditions={conditions}
                statusBadge={statusBadge}
                onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
                variant="list"
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={savedRuns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the bookmark icon on any venue or run to save it here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RecurringRunCard
              run={item}
              onPress={() => navigation.navigate('RunDetail', { runId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.sheetCard,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
  },
  tabBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.sheetCard,
  },
  tabBtnActive: {
    backgroundColor: Colors.accent.orange,
    borderColor: Colors.accent.orange,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: FontSize.base * 1.5,
  },
});
