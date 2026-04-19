// HomeScreen — full-screen map + bottom sheet discovery surface
//
// Phase 2 changes:
//   1. Snap points now pixel-based so peek shows exactly ~1.5 cards
//   2. Map pin tap → shows MapPreviewCard floating above bottom sheet
//      (replaces the old "just snap sheet to index 1" behavior)
//   3. Sheet header simplified — subtitle updates to show selected venue context
//   4. statusBadge computed from live run schedule and passed to every VenueCard
//   5. Map background tap dismisses selected pin + preview card
//   6. Locate button repositioned to not conflict with preview card

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SearchBar } from '../components/SearchBar';
import { FilterChipRow } from '../components/FilterChipRow';
import { VenueCard } from '../components/VenueCard';
import { RecurringRunCard } from '../components/RecurringRunCard';
import { MapPin } from '../components/MapPin';
import { MapPreviewCard } from '../components/MapPreviewCard';

import { MOCK_CONDITIONS } from '../data/mockConditions';
import { useVenues } from '../hooks/useVenues';
import { useRuns } from '../hooks/useRuns';
import { FilterChipId } from '../data/types';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { getVenueStatusBadge, haversineDistance } from '../utils/formatting';
import { useLocationContext } from '../context/LocationContext';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Snap point calculation ────────────────────────────────────────────────────
// Card height: 96px image + 2*8px padding = 112px total incl. margin
// Sheet header: ~74px (title row + tab toggle + hairline)
// Peek = header + 1 full card + 0.55 of a second card → feels like a list
const SHEET_CARD_H = 112;
const SHEET_HEADER_H = 74;
const PEEK_HEIGHT = Math.round(SHEET_HEADER_H + SHEET_CARD_H * 1.55); // ≈ 247

// Estimated tab bar height (accounts for safe-area padding on iOS)
const TAB_BAR_H = Platform.OS === 'ios' ? 86 : 62;

// Dark map style — teal/navy from design references
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0f2137' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6d9886' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#1a4731' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3e8e6b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#253c6e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d5086' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a6e' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0d2137' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4895a0' }] },
];

// Fallback region shown before location resolves (or if permission denied)
// Centered on continental US so the map isn't blank on first load
const FALLBACK_REGION = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 60,
  longitudeDelta: 60,
};

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const hasCenteredMap = useRef(false); // animate to user location only once on first fix

  const { coords, isLocating } = useLocationContext();
  const { venues, isLoading: venuesLoading } = useVenues();
  const { runs } = useRuns();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterChipId[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'venues' | 'runs'>('venues');
  // Track sheet index so we can hide preview card when sheet is expanded
  const [sheetIndex, setSheetIndex] = useState(0);

  // Pixel-based snap points: precise peek, comfortable half, near-full
  const snapPoints = useMemo(() => [PEEK_HEIGHT, '58%', '92%'], []);

  // Animate map to user's location on first GPS fix (only once per session)
  useEffect(() => {
    if (coords && !hasCenteredMap.current) {
      hasCenteredMap.current = true;
      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.06, // ~4 mile radius — good for city-level discovery
          longitudeDelta: 0.06,
        },
        800 // ms animation duration
      );
    }
  }, [coords]);

  const toggleFilter = useCallback((id: FilterChipId) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  // Tapping a pin: select venue + show preview card (don't auto-expand sheet)
  const handleMarkerPress = useCallback((venueId: string) => {
    setSelectedVenueId(venueId);
    // If sheet is expanded past peek, bring it back to peek so preview card is visible
    if (sheetIndex > 0) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [sheetIndex]);

  const dismissSelection = useCallback(() => {
    setSelectedVenueId(null);
  }, []);

  const handleVenuePress = useCallback(
    (venueId: string) => navigation.navigate('VenueDetail', { venueId }),
    [navigation]
  );

  const handleRunPress = useCallback(
    (runId: string) => navigation.navigate('RunDetail', { runId }),
    [navigation]
  );

  // Pre-compute status badges for all venues once (not per render)
  // Must be declared before filteredVenues since the open_now filter reads it
  const statusBadges = useMemo(() => {
    const map: Record<string, ReturnType<typeof getVenueStatusBadge>> = {};
    venues.forEach((v) => {
      map[v.id] = getVenueStatusBadge(v.id, runs);
    });
    return map;
  }, [venues, runs]);

  // Filter venues by active chips, then sort by real distance when available
  const filteredVenues = useMemo(() => {
    let filtered = venues.filter((v) => {
      if (activeFilters.includes('indoor') && v.indoorOutdoor === 'outdoor') return false;
      if (activeFilters.includes('outdoor') && v.indoorOutdoor === 'indoor') return false;
      if (activeFilters.includes('popular_now') && v.popularityScore < 75) return false;
      // "Open Now" chip now uses real schedule logic via statusBadges
      if (activeFilters.includes('open_now') && statusBadges[v.id]?.label !== 'Open Now')
        return false;
      const sportFilters = activeFilters.filter((f) =>
        ['basketball', 'volleyball', 'soccer', 'tennis', 'running', 'pickleball'].includes(f)
      );
      if (sportFilters.length > 0 && !sportFilters.some((s) => v.sports.includes(s as any)))
        return false;
      return true;
    });

    // Sort by real distance when we have a GPS fix; fallback popularity order otherwise
    if (coords) {
      return filtered.sort(
        (a, b) =>
          haversineDistance(coords, a.coordinates) -
          haversineDistance(coords, b.coordinates)
      );
    }

    return filtered;
  }, [venues, activeFilters, coords, statusBadges]);

  const selectedVenue = selectedVenueId
    ? venues.find((v) => v.id === selectedVenueId) ?? null
    : null;

  const getConditions = (venueId: string) =>
    MOCK_CONDITIONS.find((c) => c.venueId === venueId);

  // Count how many venues have "Open Now" status (shown in sheet subtitle)
  const openNowCount = useMemo(
    () =>
      filteredVenues.filter(
        (v) => statusBadges[v.id]?.label === 'Open Now'
      ).length,
    [filteredVenues, statusBadges]
  );

  // Preview card should only be visible when a pin is selected AND sheet is at peek
  const previewVisible = selectedVenueId !== null && sheetIndex === 0;

  return (
    <View style={styles.container}>
      {/* ── Full-screen Map ────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_STYLE}
        initialRegion={FALLBACK_REGION}
        showsUserLocation
        showsCompass={false}
        showsMyLocationButton={false}
        onPress={dismissSelection}  // tap map background → clear selection
      >
        {filteredVenues.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={venue.coordinates}
            onPress={() => handleMarkerPress(venue.id)}
            tracksViewChanges={false}
          >
            <MapPin
              sport={venue.sports[0]}
              isActive={selectedVenueId === venue.id}
              isPopular={venue.popularityScore >= 85}
            />
          </Marker>
        ))}
      </MapView>

      {/* ── Locate me button (repositioned above preview card zone) ─────── */}
      <View
        style={[
          styles.locateBtn,
          // Raise locate button when preview card is visible
          previewVisible && styles.locateBtnRaised,
        ]}
      >
        <TouchableOpacity
          style={styles.locateBtnInner}
          activeOpacity={0.85}
          onPress={() => {
            if (coords) {
              mapRef.current?.animateToRegion(
                {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                  latitudeDelta: 0.06,
                  longitudeDelta: 0.06,
                },
                600
              );
            }
          }}
        >
          <Ionicons name="locate" size={20} color={Colors.accent.orange} />
        </TouchableOpacity>
      </View>

      {/* ── Top overlay: search + filter chips ────────────────────────────── */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </View>
        <FilterChipRow activeFilters={activeFilters} onToggle={toggleFilter} />
      </SafeAreaView>

      {/* ── Map preview card — floats above bottom sheet, below filter chips ─ */}
      {/* Always mounted; animated in/out via `visible` prop */}
      <View
        style={[
          styles.previewCardWrap,
          { bottom: TAB_BAR_H + PEEK_HEIGHT + 10 },
        ]}
        pointerEvents="box-none"
      >
        <MapPreviewCard
          venue={selectedVenue}
          statusBadge={selectedVenueId ? statusBadges[selectedVenueId] : null}
          visible={previewVisible}
          onViewDetails={handleVenuePress}
          onDismiss={dismissSelection}
        />
      </View>

      {/* ── Bottom Sheet ───────────────────────────────────────────────────── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
        onChange={(index) => {
          setSheetIndex(index);
          // Expanding past peek → dismiss preview card (map is hidden anyway)
          if (index > 0) setSelectedVenueId(null);
        }}
      >
        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleBlock}>
            <Text style={styles.sheetTitle}>Nearby</Text>
            <Text style={styles.sheetSubtitle}>
              {openNowCount > 0
                ? `${openNowCount} open now · ${filteredVenues.length} total`
                : `${filteredVenues.length} spots found`}
            </Text>
          </View>

          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'venues' && styles.tabBtnActive]}
              onPress={() => setActiveTab('venues')}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabBtnText, activeTab === 'venues' && styles.tabBtnTextActive]}>
                Venues
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'runs' && styles.tabBtnActive]}
              onPress={() => setActiveTab('runs')}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabBtnText, activeTab === 'runs' && styles.tabBtnTextActive]}>
                Runs
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sheet content */}
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {venuesLoading ? (
            <ActivityIndicator
              size="small"
              color={Colors.accent.orange}
              style={styles.loader}
            />
          ) : activeTab === 'venues'
            ? filteredVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  outdoorConditions={getConditions(venue.id)}
                  statusBadge={statusBadges[venue.id]}
                  onPress={() => handleVenuePress(venue.id)}
                  variant="sheet"
                />
              ))
            : runs.map((run) => (
                <RecurringRunCard
                  key={run.id}
                  run={run}
                  onPress={() => handleRunPress(run.id)}
                />
              ))}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2744',
  },

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: Spacing.sm,
    paddingTop: Platform.OS === 'android' ? Spacing.xxxl : 0,
  },
  searchRow: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },

  // Locate button — default position is right side, above sheet peek
  locateBtn: {
    position: 'absolute',
    right: Spacing.base,
    bottom: PEEK_HEIGHT + TAB_BAR_H + Spacing.lg,
  },
  // When preview card is showing, raise it further so they don't overlap
  locateBtnRaised: {
    bottom: PEEK_HEIGHT + TAB_BAR_H + 90,
  },
  locateBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },

  // Preview card container — absolute, sits just above the sheet
  previewCardWrap: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
  },

  // Bottom sheet
  sheetBg: {
    backgroundColor: Colors.bg.sheet,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
  },
  sheetHandle: {
    backgroundColor: Colors.border.medium,
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  sheetTitleBlock: {
    gap: 2,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  sheetSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.full,
    padding: 3,
  },
  tabBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  tabBtnActive: {
    backgroundColor: Colors.bg.sheet,
    ...Shadow.sm,
  },
  tabBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.text.secondary,
  },
  tabBtnTextActive: {
    color: Colors.text.primary,
    fontWeight: FontWeight.semibold,
  },
  sheetContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  loader: {
    marginTop: Spacing.xxxl,
  },
});
