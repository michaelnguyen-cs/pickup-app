// VenueDetailScreen — full venue info page
// Accessed by tapping a venue card on home or explore
// Layout: hero image → details → runs at this venue → chat → actions
//
// Design refs:
// - Full-bleed hero photo (dark sports app event detail screen)
// - Clean structured info rows (DoorDash detail)
// - Save + Directions + Join as primary actions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { MOCK_CONDITIONS, MOCK_POPULARITY } from '../data/mockConditions';
import { MOCK_CHAT_ROOMS } from '../data/mockChats';
import { SPORT_MAP } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';

import { WeatherBadge } from '../components/WeatherBadge';
import { PopularityBadge } from '../components/PopularityBadge';
import { RecurringRunCard } from '../components/RecurringRunCard';
import { ChatPreviewCard } from '../components/ChatPreviewCard';
import { DetailInfoRow } from '../components/DetailInfoRow';
import {
  formatIndoorOutdoor,
  formatOccupancy,
  formatAddress,
} from '../utils/formatting';
import { getOutdoorSummary } from '../utils/weather';
import { RootStackParamList } from '../navigation/types';
import { useSavedContext } from '../context/SavedContext';
import { useAuthContext } from '../context/AuthContext';
import { Venue, RecurringRun, ReservationPolicy } from '../data/types';
import { fetchVenueById } from '../lib/queries/venues';
import { fetchRunsByVenueId } from '../lib/queries/runs';
import {
  getVenueTier,
  getValidSports,
  TIER_CONFIG,
  TIER_2_DISCLAIMER,
  NO_COMPATIBLE_SPORTS_REASON,
} from '../constants/venueValidation';

type RouteType = RouteProp<RootStackParamList, 'VenueDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const RESERVATION_POLICY_CONFIG: Record<ReservationPolicy, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }> = {
  required:    { icon: 'lock-closed-outline',        color: '#EF4444', label: 'Reservation required'                   },
  peak_only:   { icon: 'time-outline',               color: '#F59E0B', label: 'Reservation needed for peak hours'       },
  recommended: { icon: 'calendar-outline',           color: '#3B82F6', label: 'Reservation recommended'                 },
  first_come:  { icon: 'walk-outline',               color: '#22C55E', label: 'First-come, first-served'               },
};

export function VenueDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { venueId } = route.params;

  const { isSaved, toggleSaved } = useSavedContext();
  const { user, isEmailVerified, resendVerificationEmail, profile } = useAuthContext();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [runsHere, setRunsHere] = useState<RecurringRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchVenueById(venueId),
      fetchRunsByVenueId(venueId),
    ]).then(([v, r]) => {
      setVenue(v);
      setRunsHere(r);
      setIsLoading(false);
    });
  }, [venueId]);

  // Mock conditions/popularity/chat matched by venue mock IDs — won't hit for
  // Supabase UUIDs, so these sections simply won't render (null-guarded in JSX)
  const conditions = MOCK_CONDITIONS.find((c) => c.venueId === venueId);
  const popularity = MOCK_POPULARITY.find((p) => p.venueId === venueId);
  const chatRoom = MOCK_CHAT_ROOMS.find((c) => c.venueId === venueId);

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator size="large" color={Colors.accent.orange} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Venue not found</Text>
      </View>
    );
  }

  const isOutdoor = venue.indoorOutdoor !== 'indoor';
  const tier = getVenueTier(venue);
  const tierCfg = TIER_CONFIG[tier];

  // Sports that are both listed on the venue AND compatible with its type.
  // Filters out data-quality mismatches (e.g. basketball_court listing 'swimming').
  const validSports = getValidSports(venue);
  const hasCompatibleSports = validSports.length > 0;
  const canCreateRunHere = tier !== 3 && hasCompatibleSports;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── Hero Image ─────────────────────────────────────────────── */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: venue.imageUrl }} style={styles.heroImage} />
          {/* Gradient scrim for nav buttons */}
          <View style={styles.heroScrim} />

          {/* Back button */}
          <SafeAreaView style={styles.heroNav}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => toggleSaved(venueId)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isSaved(venueId) ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isSaved(venueId) ? Colors.accent.orange : '#FFF'}
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Venue name overlay on image */}
          <View style={styles.heroLabel}>
            <View style={styles.heroSportBadge}>
              {venue.sports.slice(0, 2).map((s) => (
                <Text key={s} style={styles.heroSportEmoji}>
                  {SPORT_MAP[s]?.emoji}
                </Text>
              ))}
            </View>
            <Text style={styles.heroTitle}>{venue.name}</Text>
            <Text style={styles.heroAddress}>{formatAddress(venue.address)}</Text>
          </View>
        </View>

        {/* ── Content ────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Status bar: popularity + weather + indoor/outdoor + tier */}
          <View style={styles.statusBar}>
            <PopularityBadge score={venue.popularityScore} />
            <View style={styles.dot} />
            <Text style={styles.ioLabel}>{formatIndoorOutdoor(venue.indoorOutdoor)}</Text>
            {isOutdoor && conditions && (
              <>
                <View style={styles.dot} />
                <WeatherBadge conditions={conditions} variant="compact" />
              </>
            )}
            <View style={styles.dot} />
            <View style={[styles.tierBadge, { backgroundColor: tierCfg.bg }]}>
              <Ionicons name={tierCfg.icon} size={11} color={tierCfg.color} />
              <Text style={[styles.tierBadgeText, { color: tierCfg.color }]}>{tierCfg.label}</Text>
            </View>
          </View>

          {/* Outdoor warning */}
          {isOutdoor && conditions && conditions.playCondition !== 'great' && (
            <View style={styles.weatherWarning}>
              <Ionicons name="warning-outline" size={14} color="#D97706" />
              <Text style={styles.weatherWarningText}>{getOutdoorSummary(conditions)}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={styles.description}>{venue.description}</Text>

          {/* ── Info rows ─────────────────────────────────────────────── */}
          <View style={styles.infoCard}>
            <DetailInfoRow
              icon="location-outline"
              label="Address"
              value={formatAddress(venue.address)}
            />
            <DetailInfoRow
              icon="home-outline"
              label="Type"
              value={formatIndoorOutdoor(venue.indoorOutdoor)}
            />
            {venue.phone && (
              <DetailInfoRow icon="call-outline" label="Phone" value={venue.phone} />
            )}
            {popularity && (
              <DetailInfoRow
                icon="people-outline"
                label="Right Now"
                value={
                  venue.currentOccupancy && venue.maxOccupancy
                    ? formatOccupancy(venue.currentOccupancy, venue.maxOccupancy)
                    : `~${venue.popularityScore ?? 0}% capacity`
                }
              />
            )}
            {popularity && popularity.bestTimesToGo.length > 0 && (
              <DetailInfoRow
                icon="time-outline"
                label="Best Times"
                value={popularity.bestTimesToGo.join(' · ')}
                isLast
              />
            )}
          </View>

          {/* ── Reservation awareness ────────────────────────────────── */}
          {(venue.reservationPolicy || venue.busyHoursNote) && (() => {
            const policyCfg = venue.reservationPolicy
              ? RESERVATION_POLICY_CONFIG[venue.reservationPolicy]
              : null;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reservations</Text>
                <View style={styles.reservationCard}>
                  {policyCfg && (
                    <View style={styles.reservationStatusRow}>
                      <Ionicons name={policyCfg.icon} size={15} color={policyCfg.color} />
                      <Text style={[styles.reservationStatusText, { color: policyCfg.color }]}>
                        {policyCfg.label}
                      </Text>
                    </View>
                  )}
                  {venue.busyHoursNote && (
                    <Text style={styles.busyHoursNote}>{venue.busyHoursNote}</Text>
                  )}
                  {venue.reservationUrl && (
                    <TouchableOpacity
                      style={styles.reserveBtn}
                      onPress={() => Linking.openURL(venue.reservationUrl!).catch(() => {})}
                      activeOpacity={0.82}
                    >
                      <Ionicons name="calendar-outline" size={15} color={Colors.accent.orange} />
                      <Text style={styles.reserveBtnText}>Reserve Court</Text>
                      <Ionicons name="open-outline" size={13} color={Colors.accent.orange} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })()}

          {/* ── Amenities ─────────────────────────────────────────────── */}
          {venue.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenityRow}>
                {venue.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Recurring Runs at this venue ──────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recurring Runs Here</Text>
            {runsHere.length > 0 ? (
              runsHere.map((run) => <RecurringRunCard key={run.id} run={run} />)
            ) : (
              <View style={styles.emptyRunsCard}>
                <Ionicons name="calendar-clear-outline" size={22} color={Colors.text.tertiary} />
                <Text style={styles.emptyRunsTitle}>No scheduled runs yet</Text>
                <Text style={styles.emptyRunsSubtitle}>
                  {canCreateRunHere
                    ? 'Be the first — tap "Create Run Here" below to start one.'
                    : 'Check back later or explore other venues nearby.'}
                </Text>
              </View>
            )}
          </View>

          {/* ── Group Chat ────────────────────────────────────────────── */}
          {chatRoom && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coordination Chat</Text>
              <Text style={styles.chatDisclaimer}>
                Temporary group chat for this venue. For coordinating runs — not a social feed.
              </Text>
              <ChatPreviewCard
                room={chatRoom}
                onPress={() => Alert.alert('Chat', 'Chat coming in Phase 7!')}
              />
            </View>
          )}

          <View style={styles.bottomPadding} />
        </View>
      </ScrollView>

      {/* ── Sticky action bar ──────────────────────────────────────────── */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionSecondary}
          onPress={() => {
            const query = encodeURIComponent(formatAddress(venue.address));
            const appleUrl = `maps://?q=${query}`;
            const googleUrl = `https://maps.google.com/?q=${query}`;
            Linking.canOpenURL(appleUrl)
              .then((supported) => Linking.openURL(supported ? appleUrl : googleUrl))
              .catch(() => Linking.openURL(googleUrl));
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-outline" size={18} color={Colors.text.primary} />
          <Text style={styles.actionSecondaryText}>Directions</Text>
        </TouchableOpacity>
        {tier === 3 ? (
          <View style={styles.actionBlocked}>
            <Ionicons name="lock-closed-outline" size={16} color={TIER_CONFIG[3].color} />
            <Text style={styles.actionBlockedText}>Not Available — Private Facility</Text>
          </View>
        ) : !hasCompatibleSports ? (
          <View style={styles.actionBlocked}>
            <Ionicons name="alert-circle-outline" size={16} color={TIER_CONFIG[3].color} />
            <Text style={styles.actionBlockedText}>{NO_COMPATIBLE_SPORTS_REASON}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.actionPrimary}
            onPress={() => {
              if (!user) {
                navigation.navigate('SignIn');
                return;
              }
              if (!isEmailVerified) {
                Alert.alert(
                  'Verify Your Email',
                  'Please check your inbox and click the verification link before creating a run.',
                  [
                    {
                      text: 'Resend Email',
                      onPress: async () => {
                        const err = await resendVerificationEmail();
                        if (err) Alert.alert('Error', err);
                        else Alert.alert('Sent', 'Verification email resent. Check your inbox.');
                      },
                    },
                    { text: 'OK', style: 'cancel' },
                  ]
                );
                return;
              }
              const createRunParams = {
                venueId,
                venueName: venue.name,
                sports: validSports as string[],
                defaultSport: validSports[0] as string,
              };
              const proceed = () => {
                if (!profile?.age_confirmed) {
                  navigation.navigate('AgeConfirm', { pendingCreateRun: createRunParams });
                } else {
                  navigation.navigate('CreateRun', createRunParams);
                }
              };
              if (tier === 2) {
                Alert.alert('Public Space', TIER_2_DISCLAIMER, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Continue', onPress: proceed },
                ]);
              } else {
                proceed();
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="flash-outline" size={18} color="#FFF" />
            <Text style={styles.actionPrimaryText}>Create Run Here</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.sheet,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
  },

  // Hero
  heroWrapper: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'android' ? Spacing.xxxl : Spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.base,
    right: Spacing.base,
  },
  heroSportBadge: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  heroSportEmoji: {
    fontSize: 24,
  },
  heroTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: '#FFF',
  },
  heroAddress: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },

  // Content
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.border.medium,
  },
  ioLabel: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  weatherWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(245,158,11,0.1)',
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  weatherWarningText: {
    fontSize: FontSize.sm,
    color: '#92400E',
    flex: 1,
  },
  description: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: FontSize.base * 1.6,
  },

  // Info card
  infoCard: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
  },

  // Section
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  emptyRunsCard: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.xl,
  },
  emptyRunsTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  emptyRunsSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  chatDisclaimer: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
  },

  // Amenities
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  amenityChip: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  amenityText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
    textTransform: 'capitalize',
  },

  bottomPadding: {
    height: 100,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
    backgroundColor: Colors.bg.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.light,
    ...Shadow.md,
  },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bg.sheetCard,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  actionSecondaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  actionPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.accent.orange,
  },
  actionPrimaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  actionBlocked: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  actionBlockedText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: TIER_CONFIG[3].color,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.1,
  },

  // ── Reservation section ────────────────────────────────────────────────────
  reservationCard: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  reservationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reservationStatusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  busyHoursNote: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: FontSize.sm * 1.5,
  },
  reserveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.orangeSubtle,
    marginTop: Spacing.xs,
  },
  reserveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
});
