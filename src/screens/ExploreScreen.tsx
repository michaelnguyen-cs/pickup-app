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
import { useNavigation, TabActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SearchBar } from '../components/SearchBar';
import { FilterChipRow } from '../components/FilterChipRow';
import { VenueCard } from '../components/VenueCard';
import { RecurringRunCard } from '../components/RecurringRunCard';
import { DropInScheduleCard } from '../components/DropInScheduleCard';

import { MOCK_CONDITIONS } from '../data/mockConditions';
import { FilterChipId } from '../data/types';
import { dropInSchedules } from '../data/dropInSchedules';
import { FILTER_SPORTS, SportId } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';
import { getVenueStatusBadge, haversineDistance } from '../utils/formatting';
import { rankSearch } from '../utils/search';
import { useLocationContext } from '../context/LocationContext';
import { useVenues } from '../hooks/useVenues';
import { useRuns } from '../hooks/useRuns';
import { useMapFocus } from '../context/MapFocusContext';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type SortOption = 'distance' | 'popularity' | 'sport';
type TabOption = 'venues' | 'runs' | 'drop_in';

// Drop-in sports that map to a filter chip sport (aliases for non-SportId slugs)
const DROP_IN_SPORT_ALIAS: Record<string, string> = {
  beach_volleyball: 'volleyball',
};

const SORT_OPTIONS: Array<{ id: SortOption; label: string }> = [
  { id: 'distance', label: 'Nearest' },
  { id: 'popularity', label: 'Most Popular' },
  { id: 'sport', label: 'By Sport' },
];

export function ExploreScreen() {
  const navigation = useNavigation<Nav>();
  const { coords } = useLocationContext();
  const { venues, isLoading: venuesLoading, error: venuesError, refetch: refetchVenues } = useVenues();
  const { runs, isLoading: runsLoading, error: runsError, refetch: refetchRuns } = useRuns();
  const { setPendingVenueId } = useMapFocus();

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

    // Filter chips
    if (activeFilters.includes('indoor')) filtered = filtered.filter((v) => v.indoorOutdoor !== 'outdoor');
    if (activeFilters.includes('outdoor')) filtered = filtered.filter((v) => v.indoorOutdoor !== 'indoor');
    if (activeFilters.includes('popular_now')) filtered = filtered.filter((v) => (v.popularityScore ?? 0) >= 75);
    const sportFilters = activeFilters.filter((f) => FILTER_SPORTS.includes(f as SportId));
    if (sportFilters.length > 0) {
      filtered = filtered.filter((v) => sportFilters.some((s) => v.sports.includes(s as any)));
    }

    // Active search: rank by relevance (supersedes sortBy while a query is active)
    if (searchQuery.trim()) {
      return rankSearch(filtered, searchQuery, coords);
    }

    // No search: apply sortBy option
    return [...filtered].sort((a, b) => {
      if (sortBy === 'distance') {
        if (!coords) return (b.popularityScore ?? 0) - (a.popularityScore ?? 0); // no location — most popular first
        const da = haversineDistance(coords, a.coordinates);
        const db = haversineDistance(coords, b.coordinates);
        return da - db;
      }
      if (sortBy === 'popularity') return (b.popularityScore ?? 0) - (a.popularityScore ?? 0);
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
    const sportFilters = activeFilters.filter((f) => FILTER_SPORTS.includes(f as SportId));
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
      if (sortBy === 'popularity') return (b.popularityScore ?? 0) - (a.popularityScore ?? 0);
      if (!coords) return 0; // no location — leave order as-is
      return haversineDistance(coords, a.venueCoordinates) - haversineDistance(coords, b.venueCoordinates);
    });
  }, [runs, searchQuery, activeFilters, sortBy, coords]);

  const filteredDropIn = useMemo(() => {
    const sportFilters = activeFilters.filter((f) => FILTER_SPORTS.includes(f as SportId));
    let list = dropInSchedules;
    if (sportFilters.length > 0) {
      list = list.filter((s) => {
        const normalized = DROP_IN_SPORT_ALIAS[s.sport] ?? s.sport;
        return sportFilters.includes(normalized as FilterChipId);
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.venue.toLowerCase().includes(q) ||
          s.sport.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilters, searchQuery]);

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

      {/* Tab toggle: Venues / Runs / Drop-In */}
      <View style={styles.tabRow}>
        {([
          { id: 'venues',  label: 'Venues',        count: filteredVenues.length },
          { id: 'runs',    label: 'Recurring',      count: filteredRuns.length },
          { id: 'drop_in', label: 'Drop-In',        count: filteredDropIn.length },
        ] as Array<{ id: TabOption; label: string; count: number }>).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
            <View style={[styles.tabCount, activeTab === tab.id && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, activeTab === tab.id && styles.tabCountTextActive]}>
                {tab.count}
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
            ) : venuesError ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>⚠️</Text>
                <Text style={styles.emptyTitle}>Couldn't load venues</Text>
                <Text style={styles.emptySubtitle}>{venuesError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refetchVenues} activeOpacity={0.8}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
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
                onShowOnMap={() => {
                  setPendingVenueId(item.id);
                  navigation.dispatch(TabActions.jumpTo('Home'));
                }}
                variant="list"
              />
            );
          }}
        />
      ) : activeTab === 'runs' ? (
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
            ) : runsError ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>⚠️</Text>
                <Text style={styles.emptyTitle}>Couldn't load runs</Text>
                <Text style={styles.emptySubtitle}>{runsError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refetchRuns} activeOpacity={0.8}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
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
      ) : (
        <FlatList
          data={filteredDropIn}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No drop-in sessions found</Text>
              <Text style={styles.emptySubtitle}>Try clearing sport filters or search</Text>
            </View>
          }
          renderItem={({ item }) => <DropInScheduleCard schedule={item} />}
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
  retryBtn: {
    backgroundColor: Colors.accent.orangeSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
});
