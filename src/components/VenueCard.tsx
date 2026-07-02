// VenueCard — primary discovery card, used in bottom sheet and explore list
//
// Two variants:
//   'sheet'  — redesigned for the home screen bottom sheet
//              Horizontal layout, taller card, prominent status badge
//              Goal: feels like a destination, not a list row
//
//   'list'   — full vertical card for the Explore screen
//              Full-bleed image, save button, weather + popularity footer
//
// Phase 2 additions:
//   - Image loading skeleton (both variants)
//   - Sport emoji fallback on image error (both variants)
//   - statusBadge prop (Open Now / Tonight / Runs Weekly)
//   - Sheet variant redesigned with clearer hierarchy

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Venue, OutdoorConditions } from '../data/types';
import { StatusBadge, formatDistance, haversineDistance } from '../utils/formatting';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { SPORT_MAP } from '../constants/sports';
import { WeatherBadge } from './WeatherBadge';
import { PopularityBadge } from './PopularityBadge';
import { useLocationContext } from '../context/LocationContext';
import { useSavedContext } from '../context/SavedContext';

interface VenueCardProps {
  venue: Venue;
  outdoorConditions?: OutdoorConditions;
  statusBadge?: StatusBadge | null;  // derived from recurring runs in parent
  onPress?: () => void;
  onSave?: () => void;
  onShowOnMap?: () => void;           // list variant only — switches to Map tab focused on venue
  variant?: 'sheet' | 'list';
}

// ── Image with skeleton + fallback ───────────────────────────────────────────
// Shared across both variants. Shows a gray skeleton while loading,
// then a sport emoji on gray bg if the URL fails.
interface VenueImageProps {
  uri: string;
  style: object;
  sportEmoji: string;
  sportColor: string;
  borderRadius?: number;
}

function VenueImage({ uri, style, sportEmoji, sportColor, borderRadius = 0 }: VenueImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <View style={[style, { overflow: 'hidden', borderRadius }]}>
      {/* Skeleton — visible until image loads or errors */}
      {!loaded && !error && (
        <View style={[StyleSheet.absoluteFillObject, styles.skeleton]} />
      )}

      {/* Error fallback — sport emoji on tinted background */}
      {error && (
        <View style={[StyleSheet.absoluteFillObject, styles.errorBg, { backgroundColor: sportColor + '22' }]}>
          <Text style={styles.errorEmoji}>{sportEmoji}</Text>
        </View>
      )}

      {/* Actual image — rendered always; hidden via opacity until loaded */}
      {!error && (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, { opacity: loaded ? 1 : 0 }]}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function VenueCard({
  venue,
  outdoorConditions,
  statusBadge,
  onPress,
  onSave,
  onShowOnMap,
  variant = 'list',
}: VenueCardProps) {
  const { coords } = useLocationContext();
  const { isSaved, toggleSaved } = useSavedContext();
  const primarySport = venue.sports[0];
  const sport = SPORT_MAP[primarySport];
  // Use real Haversine distance when location is available; otherwise show '—'
  const distance = coords ? haversineDistance(coords, venue.coordinates) : null;
  const isOutdoor = venue.indoorOutdoor === 'outdoor' || venue.indoorOutdoor === 'both';

  // ── Sheet variant ─────────────────────────────────────────────────────────
  // Redesigned for Phase 2: taller card, stronger hierarchy, status badge
  if (variant === 'sheet') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.sheetCard}>
        {/* Image left column */}
        <VenueImage
          uri={venue.imageUrl}
          style={styles.sheetImage}
          sportEmoji={sport?.emoji ?? '🏟'}
          sportColor={sport?.color ?? '#6B7280'}
          borderRadius={Radius.lg}
        />

        {/* Info right column */}
        <View style={styles.sheetInfo}>
          {/* Name + distance on same row */}
          <View style={styles.sheetTopRow}>
            <Text style={styles.sheetName} numberOfLines={1}>
              {venue.name}
            </Text>
            <View style={styles.distancePill}>
              <Ionicons name="location-sharp" size={9} color={Colors.accent.orange} />
              <Text style={styles.distancePillText}>{formatDistance(distance)}</Text>
            </View>
          </View>

          {/* Sport + indoor/outdoor */}
          <View style={styles.sheetMetaRow}>
            <Text style={styles.sportEmoji}>{sport?.emoji}</Text>
            <Text style={styles.sheetMeta}>{sport?.label}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.sheetMeta}>
              {venue.indoorOutdoor === 'indoor'
                ? 'Indoor'
                : venue.indoorOutdoor === 'outdoor'
                ? 'Outdoor'
                : 'Indoor/Outdoor'}
            </Text>
          </View>

          {/* Status badge — the key new element */}
          {statusBadge && (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
              <Text style={[styles.statusLabel, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          )}

          {/* Weather warning for outdoor venues */}
          {isOutdoor && outdoorConditions && outdoorConditions.playCondition === 'poor' && (
            <View style={styles.weatherRow}>
              <Ionicons name="warning-outline" size={11} color="#D97706" />
              <Text style={styles.weatherWarn} numberOfLines={1}>
                {outdoorConditions.warning ?? 'Check conditions'}
              </Text>
            </View>
          )}
          {isOutdoor && outdoorConditions && outdoorConditions.playCondition !== 'poor' && (
            <WeatherBadge conditions={outdoorConditions} variant="compact" />
          )}
        </View>

        {/* Right arrow affordance */}
        <Ionicons
          name="chevron-forward"
          size={14}
          color={Colors.text.tertiary}
          style={styles.sheetChevron}
        />
      </TouchableOpacity>
    );
  }

  // ── List variant ──────────────────────────────────────────────────────────
  // Full-bleed card for Explore screen. Phase 2: image loading + status badge
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.listCard}>
      {/* Image — locked aspect ratio 16:9 */}
      <View style={styles.listImageContainer}>
        <VenueImage
          uri={venue.imageUrl}
          style={styles.listImageInner}
          sportEmoji={sport?.emoji ?? '🏟'}
          sportColor={sport?.color ?? '#6B7280'}
        />
        {/* Distance overlaid on image */}
        <View style={styles.listDistancePill}>
          <Ionicons name="location-sharp" size={9} color="#FFF" />
          <Text style={styles.listDistanceText}>{formatDistance(distance)}</Text>
        </View>
        {/* Save button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => { toggleSaved(venue.id); onSave?.(); }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSaved(venue.id) ? 'bookmark' : 'bookmark-outline'}
            size={17}
            color={isSaved(venue.id) ? Colors.accent.orange : '#FFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.listInfo}>
        {/* Sport tags */}
        <View style={styles.tagRow}>
          {venue.sports.slice(0, 3).map((s) => {
            const sp = SPORT_MAP[s];
            return sp ? (
              <View key={s} style={styles.sportTag}>
                <Text style={styles.sportTagText}>{sp.emoji} {sp.label}</Text>
              </View>
            ) : null;
          })}
          {venue.indoorOutdoor !== 'both' && (
            <View style={styles.ioTag}>
              <Text style={styles.sportTagText}>
                {venue.indoorOutdoor === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
              </Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.listName}>{venue.name}</Text>
        <Text style={styles.listAddress} numberOfLines={1}>
          {venue.address}, {venue.city}
        </Text>

        {/* Footer: status + popularity + weather + optional map shortcut */}
        <View style={styles.listFooter}>
          <View style={styles.listFooterBadges}>
            {statusBadge && (
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusBadge.color }]} />
                <Text style={[styles.statusLabel, { color: statusBadge.color }]}>
                  {statusBadge.label}
                </Text>
              </View>
            )}
            <PopularityBadge score={venue.popularityScore} />
            {isOutdoor && outdoorConditions && (
              <WeatherBadge conditions={outdoorConditions} variant="compact" />
            )}
          </View>
          {onShowOnMap && (
            <TouchableOpacity
              style={styles.mapPill}
              onPress={onShowOnMap}
              activeOpacity={0.82}
            >
              <Ionicons name="map-outline" size={11} color={Colors.accent.orange} />
              <Text style={styles.mapPillText}>Map</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Shared image components ───────────────────────────────────────────────
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  errorBg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorEmoji: {
    fontSize: 28,
  },

  // ── Sheet card ────────────────────────────────────────────────────────────
  sheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  sheetImage: {
    width: 96,
    height: 96,
    // borderRadius applied via prop on VenueImage
    flexShrink: 0,
  },
  sheetInfo: {
    flex: 1,
    gap: 6,
    minWidth: 0, // allows text to truncate correctly in flex child
  },
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  sheetName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    flex: 1,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent.orangeSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.accent.orange,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sportEmoji: {
    fontSize: 13,
  },
  sheetMeta: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border.medium,
  },

  // Status badge — shared between both variants
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.1,
  },

  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherWarn: {
    fontSize: FontSize.xs,
    color: '#D97706',
    flex: 1,
  },
  sheetChevron: {
    flexShrink: 0,
    marginRight: Spacing.xs,
  },

  // ── List card ─────────────────────────────────────────────────────────────
  listCard: {
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.base,
    ...Shadow.md,
  },
  listImageContainer: {
    width: '100%',
    // 16:9 aspect ratio — locked, no flash on load
    aspectRatio: 16 / 9,
    backgroundColor: Colors.bg.sheetCard,
    position: 'relative',
  },
  listImageInner: {
    width: '100%',
    height: '100%',
  },
  listDistancePill: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  listDistanceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  saveBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: Radius.full,
    padding: Spacing.sm,
  },
  listInfo: {
    padding: Spacing.base,
    gap: Spacing.xs + 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  sportTag: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  ioTag: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  sportTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.text.secondary,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  listAddress: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  listFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: Spacing.sm,
  },
  listFooterBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent.orange,
    flexShrink: 0,
  },
  mapPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
});
