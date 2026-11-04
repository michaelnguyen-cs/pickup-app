// HomeScreen — full-screen map + bottom sheet discovery surface
//
// Layout (top→bottom render order):
//   1. Full-screen MapView (base layer)
//   2. Locate button (floating, absolute, right side above sheet)
//      ↳ raises when venue preview card is visible
//   3. Top overlay: SafeAreaView › SearchBar + FilterChipRow
//   4. MapPreviewCard (absolute, above sheet — slides in on pin tap)
//   5. BottomSheet
//       ├── handle indicator
//       ├── sheetHeader: "Nearby" + count + Venues/Runs toggle
//       └── BottomSheetScrollView: venue cards or run cards
//
// Selected venue flow:
//   Tap pin → setSelectedVenueId → map animates to venue → MapPreviewCard slides up
//   Expand sheet (index > 0) → clears selection + card animates out
//   Dismiss via × button or map background tap → clears selection

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Supercluster from 'supercluster';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useMapFocus } from '../context/MapFocusContext';
import { SearchBar } from '../components/SearchBar';
import { FilterChipRow } from '../components/FilterChipRow';
import { VenueCard } from '../components/VenueCard';
import { RecurringRunCard } from '../components/RecurringRunCard';
import { MapPin } from '../components/MapPin';
import { MapPreviewCard } from '../components/MapPreviewCard';
import { DropInPin } from '../components/DropInPin';
import { DropInPreviewCard } from '../components/DropInPreviewCard';

import { MOCK_CONDITIONS } from '../data/mockConditions';
import { dropInSchedules, DropInVenuePin } from '../data/dropInSchedules';
import { geocodeAddress } from '../utils/geocode';
import { useVenues } from '../hooks/useVenues';
import { useRuns } from '../hooks/useRuns';
import { FilterChipId } from '../data/types';
import { FILTER_SPORTS, SportId } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import {
  getVenueStatusBadge,
  haversineDistance,
} from '../utils/formatting';
import { rankSearch } from '../utils/search';
import { useLocationContext } from '../context/LocationContext';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Sheet geometry ────────────────────────────────────────────────────────────
const SHEET_CARD_H   = 112;
const SHEET_HEADER_H = 54;
const HANDLE_H       = 24;
const PEEK_HEIGHT    = Math.round(HANDLE_H + SHEET_HEADER_H + SHEET_CARD_H * 1.6); // ≈ 257

// Safe-area-inclusive tab bar height
const TAB_BAR_H = Platform.OS === 'ios' ? 86 : 62;

// ── Map style ─────────────────────────────────────────────────────────────────
// Dark teal/navy theme. POIs suppressed except parks (sports-relevant).
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0f2137' }] },
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ visibility: 'on' }, { color: '#1a4731' }] },
  { featureType: 'poi.park', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3e8e6b' }] },
  { featureType: 'poi.park', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#253c6e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2744' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2d5086' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a6e' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#0d2137' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4895a0' }] },
];

// Continental US overview shown before location resolves.
const FALLBACK_REGION = {
  latitude: 37.5,
  longitude: -96.0,
  latitudeDelta: 28,
  longitudeDelta: 62,
};

const INTRO_PAUSE_MS = 500;

// Tight neighborhood zoom (~1.8 km) for venue focus animation.
const VENUE_FOCUS_DELTA = 0.018;

// How far the user must pan from the selected venue (in miles) to trigger dismissal.
// At neighborhood zoom (~1.25 mi visible), this is roughly 1/8 of the viewport width —
// clearly intentional but not sensitive enough to fire on micro-adjustments.
const DISMISS_THRESHOLD_MILES = 0.15;

// How long after venue selection to ignore pan-dismiss (covers the fly-to animation).
const DISMISS_GUARD_MS = 700;

// ── Clustering ────────────────────────────────────────────────────────────────
// Pixel radius supercluster groups pins within, and the zoom level past which
// it stops clustering entirely (individual pins only from here in).
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 16;

interface VenuePointProps {
  venueId: string;
}

// Standard web-mercator zoom estimate from a MapView region's longitude span.
function regionToZoom(region: { longitudeDelta: number }): number {
  return Math.max(0, Math.min(20, Math.log2(360 / region.longitudeDelta)));
}

function regionToBBox(region: {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}): [number, number, number, number] {
  return [
    region.longitude - region.longitudeDelta / 2,
    Math.max(-90, region.latitude - region.latitudeDelta / 2),
    region.longitude + region.longitudeDelta / 2,
    Math.min(90, region.latitude + region.latitudeDelta / 2),
  ];
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const hasCenteredMap = useRef(false);
  const mountedAt = useRef(Date.now());

  // Pan-dismiss microinteraction refs — all mutable, no state, no rerenders per frame.
  const tensionAnim = useRef(new Animated.Value(0)).current;
  const hasTriggeredDismiss = useRef(false);
  const dismissGuardActive = useRef(false);
  const dismissGuardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Tracks the selected venue without a stale-closure problem inside onRegionChange.
  const selectedVenueRef = useRef<{ coordinates: { latitude: number; longitude: number } } | null>(null);
  // Android: PROVIDER_GOOGLE propagates Marker.onPress to MapView.onPress in the
  // same event batch. This lock prevents the MapView tap from immediately clearing
  // the selection that handleMarkerPress just made.
  const markerTapLock = useRef(false);

  const { coords } = useLocationContext();
  const { venues, isLoading: venuesLoading, error: venuesError, refetch: refetchVenues } = useVenues();
  const { runs, error: runsError, refetch: refetchRuns } = useRuns();
  const { pendingVenueId, setPendingVenueId } = useMapFocus();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterChipId[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'venues' | 'runs'>('venues');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [dropInPins, setDropInPins] = useState<DropInVenuePin[]>([]);
  const [selectedDropInKey, setSelectedDropInKey] = useState<string | null>(null);
  // Current map viewport — drives cluster recomputation. Updated only on
  // onRegionChangeComplete (gesture/animation settled), never on every pan
  // frame, so re-clustering doesn't fight the continuous onRegionChange
  // handler used for pan-dismiss tracking below.
  const [mapRegion, setMapRegion] = useState<Region>(FALLBACK_REGION);

  const snapPoints = useMemo(() => [PEEK_HEIGHT, '58%', '92%'], []);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Two-phase fly-in to user location on first GPS fix.
  useEffect(() => {
    if (!coords || hasCenteredMap.current) return;
    hasCenteredMap.current = true;

    const elapsed = Date.now() - mountedAt.current;
    const delay = Math.max(0, INTRO_PAUSE_MS - elapsed);
    let t2: ReturnType<typeof setTimeout>;

    const t1 = setTimeout(() => {
      mapRef.current?.animateToRegion(
        { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 2, longitudeDelta: 2 },
        1000,
      );
      t2 = setTimeout(() => {
        mapRef.current?.animateToRegion(
          { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 },
          700,
        );
      }, 1050);
    }, delay);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [coords]);

  // Explore → Home handoff: focus a venue passed via MapFocusContext.
  useEffect(() => {
    if (!pendingVenueId) return;
    const venue = venues.find((v) => v.id === pendingVenueId);
    setSelectedVenueId(pendingVenueId);
    setPendingVenueId(null);
    if (!venue) return;
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: venue.coordinates.latitude,
          longitude: venue.coordinates.longitude,
          latitudeDelta: VENUE_FOCUS_DELTA,
          longitudeDelta: VENUE_FOCUS_DELTA,
        },
        600,
      );
    }, 320);
    return () => clearTimeout(t);
  }, [pendingVenueId, venues, setPendingVenueId]);

  // Geocode unique drop-in venue addresses once on mount.
  // Builds DropInVenuePin entries for map rendering.
  useEffect(() => {
    const seen = new Set<string>();
    const toGeocode: Array<{ key: string; name: string; address: string }> = [];

    for (const s of dropInSchedules) {
      if (!s.address) continue;
      // Skip if coordinates are already embedded in the seed data
      if (s.latitude != null && s.longitude != null) continue;
      if (seen.has(s.venue)) continue;
      seen.add(s.venue);
      toGeocode.push({ key: s.venue, name: s.venue, address: s.address });
    }

    if (toGeocode.length === 0) return;

    let cancelled = false;

    Promise.all(
      toGeocode.map(async ({ key, name, address }) => {
        const coords = await geocodeAddress(address);
        if (!coords) return null;
        const pin: DropInVenuePin = {
          key,
          name,
          address,
          latitude: coords.latitude,
          longitude: coords.longitude,
          schedules: dropInSchedules.filter((s) => s.venue === name),
        };
        return pin;
      }),
    ).then((results) => {
      if (cancelled) return;
      setDropInPins(results.filter((r): r is DropInVenuePin => r !== null));
    });

    return () => { cancelled = true; };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleFilter = useCallback((id: FilterChipId) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  // Tap a map pin: select venue + snap sheet to peek + animate map.
  const handleMarkerPress = useCallback((venueId: string) => {
    // Block MapView.onPress from firing dismissSelection on this same tap.
    // On Android with PROVIDER_GOOGLE, a Marker tap propagates to MapView.onPress
    // in the same JS event batch. Without this lock, dismissSelection() fires
    // immediately after setSelectedVenueId(), clearing the selection before React
    // even re-renders — so the preview card never appears.
    markerTapLock.current = true;
    requestAnimationFrame(() => { markerTapLock.current = false; });

    // Reset pan-dismiss guards synchronously BEFORE animateToRegion so that
    // onRegionChange can't fire a dismiss during the fly-to animation.
    hasTriggeredDismiss.current = false;
    tensionAnim.setValue(0);
    dismissGuardActive.current = true;
    if (dismissGuardTimer.current !== undefined) clearTimeout(dismissGuardTimer.current);
    dismissGuardTimer.current = setTimeout(() => {
      dismissGuardActive.current = false;
    }, DISMISS_GUARD_MS);

    const venue = venues.find((v) => v.id === venueId);
    setSelectedVenueId(venueId);
    setSelectedDropInKey(null);
    if (sheetIndex > 0) {
      bottomSheetRef.current?.snapToIndex(0);
    }
    if (venue) {
      mapRef.current?.animateToRegion(
        {
          latitude: venue.coordinates.latitude,
          longitude: venue.coordinates.longitude,
          latitudeDelta: VENUE_FOCUS_DELTA,
          longitudeDelta: VENUE_FOCUS_DELTA,
        },
        500,
      );
    }
  }, [sheetIndex, venues, tensionAnim]);

  // Tap a drop-in map pin: select it + clear any venue selection.
  // No pan-dismiss for drop-in pins — they dismiss via × or map background tap.
  const handleDropInMarkerPress = useCallback(
    (key: string, coords: { latitude: number; longitude: number }) => {
      markerTapLock.current = true;
      requestAnimationFrame(() => { markerTapLock.current = false; });

      setSelectedDropInKey(key);
      setSelectedVenueId(null);
      if (sheetIndex > 0) bottomSheetRef.current?.snapToIndex(0);
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: VENUE_FOCUS_DELTA, longitudeDelta: VENUE_FOCUS_DELTA },
        500,
      );
    },
    [sheetIndex],
  );

  // Reset dismiss state whenever the selected venue changes.
  // The guard blocks pan-dismiss during the fly-to animation that follows pin tap.
  useEffect(() => {
    hasTriggeredDismiss.current = false;
    tensionAnim.setValue(0);
    dismissGuardActive.current = true;
    if (dismissGuardTimer.current !== undefined) clearTimeout(dismissGuardTimer.current);
    dismissGuardTimer.current = setTimeout(() => {
      dismissGuardActive.current = false;
    }, DISMISS_GUARD_MS);
    return () => { if (dismissGuardTimer.current !== undefined) clearTimeout(dismissGuardTimer.current); };
  }, [selectedVenueId, tensionAnim]);

  // Clear selection: tap map background or × button.
  // Guarded by markerTapLock to ignore the spurious MapView.onPress that
  // Android fires on the same tap event that triggered handleMarkerPress.
  const dismissSelection = useCallback(() => {
    if (markerTapLock.current) return;
    setSelectedVenueId(null);
    setSelectedDropInKey(null);
  }, []);

  // Track map pan distance from selected venue.
  // Called every frame during pan — must NEVER call setState.
  // Only triggers dismissal (one setState) when threshold is crossed.
  const handleRegionChange = useCallback(
    (region: { latitude: number; longitude: number }) => {
      const venue = selectedVenueRef.current;
      if (!venue || hasTriggeredDismiss.current || dismissGuardActive.current) {
        if (!venue) tensionAnim.setValue(0);
        return;
      }

      const distMiles = haversineDistance(
        { latitude: region.latitude, longitude: region.longitude },
        venue.coordinates,
      );

      const progress = Math.min(distMiles / DISMISS_THRESHOLD_MILES, 1);
      tensionAnim.setValue(progress);

      if (distMiles >= DISMISS_THRESHOLD_MILES) {
        hasTriggeredDismiss.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        dismissSelection();
      }
    },
    [dismissSelection, tensionAnim],
  );

  // Cluster recompute trigger — fires once per gesture/animation, not per frame.
  const handleRegionChangeComplete = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  const handleVenuePress = useCallback(
    (venueId: string) => navigation.navigate('VenueDetail', { venueId }),
    [navigation]
  );

  const handleRunPress = useCallback(
    (runId: string) => navigation.navigate('RunDetail', { runId }),
    [navigation]
  );

  // ── Derived data ──────────────────────────────────────────────────────────

  const statusBadges = useMemo(() => {
    const map: Record<string, ReturnType<typeof getVenueStatusBadge>> = {};
    venues.forEach((v) => { map[v.id] = getVenueStatusBadge(v.id, runs); });
    return map;
  }, [venues, runs]);

  const filteredVenues = useMemo(() => {
    let filtered = venues.filter((v) => {
      if (activeFilters.includes('indoor') && v.indoorOutdoor === 'outdoor') return false;
      if (activeFilters.includes('outdoor') && v.indoorOutdoor === 'indoor') return false;
      if (activeFilters.includes('popular_now') && (v.popularityScore ?? 0) < 75) return false;
      if (activeFilters.includes('open_now') && statusBadges[v.id]?.label !== 'Open Now') return false;
      const sportFilters = activeFilters.filter((f) => FILTER_SPORTS.includes(f as SportId));
      if (sportFilters.length > 0 && !sportFilters.some((s) => v.sports.includes(s as any)))
        return false;
      return true;
    });

    if (searchQuery.trim()) return rankSearch(filtered, searchQuery, coords);

    if (coords) {
      return filtered.sort(
        (a, b) =>
          haversineDistance(coords, a.coordinates) -
          haversineDistance(coords, b.coordinates)
      );
    }

    return filtered;
  }, [venues, activeFilters, coords, statusBadges, searchQuery]);

  const venueById = useMemo(() => {
    const map = new Map<string, typeof filteredVenues[number]>();
    filteredVenues.forEach((v) => map.set(v.id, v));
    return map;
  }, [filteredVenues]);

  // Rebuilt whenever the filtered venue set changes — cheap even at thousands
  // of points, since supercluster indexes are built for exactly this.
  const clusterIndex = useMemo(() => {
    const index = new Supercluster<VenuePointProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    });
    index.load(
      filteredVenues.map((v) => ({
        type: 'Feature',
        properties: { venueId: v.id },
        geometry: {
          type: 'Point',
          coordinates: [v.coordinates.longitude, v.coordinates.latitude],
        },
      }))
    );
    return index;
  }, [filteredVenues]);

  // Cluster/point features visible in the current viewport at the current zoom.
  const clusterFeatures = useMemo(
    () => clusterIndex.getClusters(regionToBBox(mapRegion), regionToZoom(mapRegion)),
    [clusterIndex, mapRegion]
  );

  // Tap a cluster badge: zoom in to the level where it splits apart.
  const handleClusterPress = useCallback((clusterId: number, coordinate: { latitude: number; longitude: number }) => {
    const expansionZoom = Math.min(clusterIndex.getClusterExpansionZoom(clusterId), 20);
    const newLongitudeDelta = 360 / Math.pow(2, expansionZoom);
    const aspectRatio = mapRegion.longitudeDelta > 0
      ? mapRegion.latitudeDelta / mapRegion.longitudeDelta
      : 1;
    mapRef.current?.animateToRegion(
      {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: newLongitudeDelta * aspectRatio,
        longitudeDelta: newLongitudeDelta,
      },
      450,
    );
  }, [clusterIndex, mapRegion]);

  const selectedVenue = selectedVenueId
    ? venues.find((v) => v.id === selectedVenueId) ?? null
    : null;

  const selectedDropInVenue = selectedDropInKey
    ? dropInPins.find((p) => p.key === selectedDropInKey) ?? null
    : null;

  // Keep ref in sync so handleRegionChange can read it without stale closures.
  selectedVenueRef.current = selectedVenue;

  const venuePreviewVisible  = !!selectedVenue;
  const dropInPreviewVisible = !!selectedDropInVenue;
  const anyPreviewVisible    = venuePreviewVisible || dropInPreviewVisible;

  const getConditions = (venueId: string) =>
    MOCK_CONDITIONS.find((c) => c.venueId === venueId);

  const openNowCount = useMemo(
    () => filteredVenues.filter((v) => statusBadges[v.id]?.label === 'Open Now').length,
    [filteredVenues, statusBadges]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Full-screen Map ──────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={MAP_STYLE}
        initialRegion={FALLBACK_REGION}
        showsUserLocation
        showsCompass={false}
        showsMyLocationButton={false}
        onPress={dismissSelection}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {clusterFeatures.map((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;

          if ('cluster' in feature.properties && feature.properties.cluster) {
            const { cluster_id: clusterId, point_count: pointCount } = feature.properties;
            return (
              <Marker
                key={`cluster-${clusterId}`}
                coordinate={{ latitude, longitude }}
                onPress={() => handleClusterPress(clusterId, { latitude, longitude })}
                tracksViewChanges={false}
              >
                <MapPin count={pointCount} />
              </Marker>
            );
          }

          const venue = venueById.get(feature.properties.venueId);
          if (!venue) return null;

          return (
            <Marker
              key={venue.id}
              coordinate={venue.coordinates}
              onPress={() => handleMarkerPress(venue.id)}
              tracksViewChanges={false}
            >
              <MapPin
                sport={venue.sports[0]}
                isActive={selectedVenueId === venue.id}
                isPopular={venue.popularityScore != null && venue.popularityScore >= 85}
              />
            </Marker>
          );
        })}

        {/* Drop-in venue pins — geocoded at runtime, blue to distinguish from venues */}
        {dropInPins.map((pin) => (
          <Marker
            key={`dropin-${pin.key}`}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            onPress={() => handleDropInMarkerPress(pin.key, { latitude: pin.latitude, longitude: pin.longitude })}
            tracksViewChanges={false}
          >
            <DropInPin isActive={selectedDropInKey === pin.key} />
          </Marker>
        ))}
      </MapView>

      {/* ── Locate me button ─────────────────────────────────────────────── */}
      <View style={[styles.locateBtn, anyPreviewVisible && styles.locateBtnRaised]}>
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
                600,
              );
            }
          }}
        >
          <Ionicons name="locate" size={20} color={Colors.accent.orange} />
        </TouchableOpacity>
      </View>

      {/* ── Top overlay: search + filter chips ──────────────────────────── */}
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

      {/* ── Venue preview card — floats above sheet when a venue pin is tapped ── */}
      <View style={styles.previewCardWrap} pointerEvents="box-none">
        <MapPreviewCard
          venue={selectedVenue}
          statusBadge={selectedVenue ? statusBadges[selectedVenue.id] : null}
          visible={venuePreviewVisible}
          onViewDetails={handleVenuePress}
          onDismiss={dismissSelection}
          tensionAnim={tensionAnim}
        />
      </View>

      {/* ── Drop-in preview card — same position, shown when a drop-in pin is tapped ── */}
      <View style={styles.previewCardWrap} pointerEvents="box-none">
        <DropInPreviewCard
          venue={selectedDropInVenue}
          visible={dropInPreviewVisible}
          onDismiss={() => setSelectedDropInKey(null)}
        />
      </View>

      {/* ── Bottom Sheet ─────────────────────────────────────────────────── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        enablePanDownToClose={false}
        containerStyle={styles.sheetContainer}
        onChange={(index) => {
          setSheetIndex(index);
          // Clear venue selection when sheet expands — preview card drops away.
          if (index > 0) setSelectedVenueId(null);
        }}
      >

        {/* Header — always visible: title, count, and tab toggle */}
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

        {/* Scrollable venue / run list */}
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
          ) : (activeTab === 'venues' ? venuesError : runsError) ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {activeTab === 'venues' ? venuesError : runsError}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={activeTab === 'venues' ? refetchVenues : refetchRuns}
                activeOpacity={0.8}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'venues'
            ? filteredVenues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  outdoorConditions={getConditions(venue.id)}
                  statusBadge={statusBadges[venue.id]}
                  onPress={() => handleMarkerPress(venue.id)}
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

  // ── Top overlay ────────────────────────────────────────────────────────────
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: Spacing.xs,
    paddingTop: Platform.OS === 'android' ? Spacing.xxxl : 0,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },

  // ── Locate button ──────────────────────────────────────────────────────────
  locateBtn: {
    position: 'absolute',
    right: Spacing.base,
    bottom: PEEK_HEIGHT + TAB_BAR_H + Spacing.lg,
  },
  // Raised when the preview card is visible to avoid overlap.
  locateBtnRaised: {
    bottom: PEEK_HEIGHT + TAB_BAR_H + Spacing.lg + 80,
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

  // ── Venue preview card wrapper ─────────────────────────────────────────────
  previewCardWrap: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    bottom: PEEK_HEIGHT + TAB_BAR_H + Spacing.base,
    zIndex: 99,
    elevation: 99,
  },

  // ── Bottom sheet chrome ────────────────────────────────────────────────────
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
  sheetContainer: {
    zIndex: 100,
    elevation: 100,
  },

  // ── Sheet header ───────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  sheetTitleBlock: {
    gap: 1,
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
    paddingVertical: 4,
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

  // ── Sheet scrollable content ───────────────────────────────────────────────
  sheetContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 80,
  },
  loader: {
    marginTop: Spacing.xxxl,
  },
  errorBox: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.accent.orangeSubtle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
});
