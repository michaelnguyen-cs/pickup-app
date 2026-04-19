// ExploreScreen — searchable list view of all nearby venues + runs
// Design: "Events Around You" from dark sports app ref + DoorDash list card quality
// Sort options, filter chips, strong scannable cards

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SearchBar } from '../components/SearchBar';
import { FilterChipRow } from '../components/FilterChipRow';
import { VenueCard } from '../components/VenueCard';
import { RecurringRunCard } from '../components/RecurringRunCard';

import { MOCK_CONDITIONS } from '../data/mockConditions';
import { FilterChipId } from '../data/types';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';
import { getVenueStatusBadge, haversineDistance, mockDistance } from '../utils/formatting';
import { useLocationContext } from '../context/LocationContext';
import { useVenues } from '../hooks/useVenues';
import { useRuns } from '../hooks/useRuns';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortOption = 'distance' | 'popularity' | 'sport';
type TabOption = 'venues' | 'runs';

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'distance', label: 'Nearest' },
  { id: 'popularity', label: 'Most Popular' },
  { id: 'sport', label: 'By Sport' },
];

export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const { coords } = useLocationContext();
  const { venues, isLoading: venuesLoading } = useVenues();
  const { runs, isLoading: runsLoading } = useRuns();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterChipId[]>([]);
  const [activeTab, setActiveTab] = useState<TabOption>('venues');
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const toggleFilter = (id: FilterChipId) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const filteredVenues = useMemo(() => {
    let filtered = venues;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q) ||
          v.sports.some((s) => s.includes(q))
      );
    }

    // Filter chips
    if (activeFilters.includes('indoor')) filtered = filtered.filter((v) => v.indoorOutdoor !== 'outdoor');
    if (activeFilters.includes('outdoor')) filtered = filtered.filter((v) => v.indoorOutdoor !== 'indoor');
    if (activeFilters.includes('popular_now')) filtered = filtered.filter((v) => v.popularityScore >= 75);
    const sportFilters = activeFilters.filter((f) =>
      ['basketball', 'volleyball', 'soccer', 'tennis', 'running', 'pickleball'].includes(f)
    );
    if (sportFilters.length > 0) {
      filtered = filtered.filter((v) => sportFilters.some((s) => v.sports.includes(s as any)));
    }

    // Sort — use real Haversine distance when available, fallback to mock
    return [...filtered].sort((a, b) => {
      if (sortBy === 'distance') {
        const da = coords ? haversineDistance(coords, a.coordinates) : mockDistance(a.id);
        const db = coords ? haversineDistance(coords, b.coordinates) : mockDistance(b.id);
        return da - db;
      }
      if (sortBy === 'popularity') return b.popularityScore - a.popularityScore;
      if (sortBy === 'sport') return a.sports[0].localeCompare(b.sports[0]);
      return 0;
    });
  }, [venues, searchQuery, activeFilters, sortBy, coords]);

  const filteredRuns = useMemo(() => {
    let filteredR = runs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredR = filteredR.filter(
        (r) => r.name.toLowerCase().includes(q) || r.venueName.toLowerCase().includes(q)
      );
    }
    const sportFilters = activeFilters.filter((f) =>
      ['basketball', 'volleyball', 'soccer', 'tennis', 'running', 'pickleball'].includes(f)
    );
    if (sportFilters.length > 0) {
      filteredR = filteredR.filter((r) => sportFilters.includes(r.sport as FilterChipId));
    }
    if (activeFilters.includes('casual'))
      filteredR = filteredR.filter((r) => r.skillLevel === 'casual' || r.skillLevel === 'beginner');
    if (activeFilters.includes('competitive'))
      filteredR = filteredR.filter((r) => r.skillLevel === 'competitive');
    if (activeFilters.includes('free'))
      filteredR = filteredR.filter((r) => !r.costPerSession);
    return [...filteredR].sort((a, b) => {
      if (sortBy === 'popularity') return b.popularityScore - a.popularityScore;
      return mockDistance(a.venueId) - mockDistance(b.venueId);
    });
  }, [runs, searchQuery, activeFilters, sortBy]);

  const renderHeader = () => (
    <View>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Around You</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSortMenu((v) => !v)}
          activeOpacity={0.85}
        >
          <Ionicons name="swap-vertical-outline" size={16} color={Colors.text.primary} />
          <Text style={styles.sortBtnText}>
            {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={styles.sortOption}
              onPress={() => { setSortBy(opt.id); setShowSortMenu(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.id && styles.sortOptionActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.id && (
                <Ionicons name="checkmark" size={16} color={Colors.accent.orange} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tab toggle: Venues / Runs */}
      <View style={styles.tabRow}>
        {(['venues', 'runs'] as TabOption[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'venues' ? 'Venues' : 'Recurring Runs'}
            </Text>
            <View style={[styles.tabCount, activeTab === tab && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, activeTab === tab && styles.tabCountTextActive]}>
                {tab === 'venues' ? filteredVenues.length : filteredRuns.length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        <FilterChipRow activeFilters={activeFilters} onToggle={toggleFilter} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search */}
      <View style={styles.searchRow}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search venues, runs, sports..."
        />
      </View>

      {activeTab === 'venues' ? (
        <FlatList
          data={filteredVenues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            venuesLoading ? (
              <ActivityIndicator
                size="small"
                color={Colors.accent.orange}
                style={styles.loader}
              />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const conditions = MOCK_CONDITIONS.find((c) => c.venueId === item.id);
            const statusBadge = getVenueStatusBadge(item.id, runs);
            return (
              <VenueCard
                venue={item}
                statusBadge={statusBadge}
                outdoorConditions={conditions}
                onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
                variant="list"
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={filteredRuns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            runsLoading ? (
              <ActivityIndicator
                size="small"
                color={Colors.accent.orange}
                style={styles.loader}
              />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
              </View>
            )
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
  searchRow: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bg.sheetCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  sortBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  sortMenu: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  sortOptionText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },
  sortOptionActive: {
    color: Colors.accent.orange,
    fontWeight: FontWeight.semibold,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
  tabCount: {
    backgroundColor: Colors.border.light,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabCountText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.text.secondary,
  },
  tabCountTextActive: {
    color: '#FFF',
  },
  filterRow: {
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
    marginBottom: Spacing.sm,
  },
  loader: {
    marginTop: Spacing.xxxl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  emptySubtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },
});
