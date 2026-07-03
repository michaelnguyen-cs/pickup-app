// RunDetailScreen — detail page for a specific recurring run
// Shows: schedule, skill level, turnout, cost, venue info, chat entry
//
// Phase 6 additions:
//   - Bookmark button in the header (save/unsave via SavedContext)
//   - "Count Me In / I'm Going" toggle writes to run_attendance table
//   - Attendance is user-scoped; guests are redirected to SignIn

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { MOCK_CHAT_ROOMS } from '../data/mockChats';
import { RecurringRun, Venue } from '../data/types';
import { fetchRunById } from '../lib/queries/runs';
import { fetchVenueById } from '../lib/queries/venues';
import { supabase } from '../lib/supabase';
import { SPORT_MAP } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { DetailInfoRow } from '../components/DetailInfoRow';
import { ChatPreviewCard } from '../components/ChatPreviewCard';
import { PopularityBadge } from '../components/PopularityBadge';
import {
  formatScheduleSummary,
  formatSkillLevel,
  formatCost,
  formatAddress,
} from '../utils/formatting';
import { RootStackParamList } from '../navigation/types';
import { useSavedContext } from '../context/SavedContext';
import { useAuthContext } from '../context/AuthContext';
import { fetchRunRecentReportCount } from '../lib/queries/reports';
import { fetchRunAttendanceCount } from '../lib/queries/attendance';
import { getTrustSignal } from '../utils/trustSignal';
import { fetchWeather, WeatherResult } from '../lib/weather';

type RouteType = RouteProp<RootStackParamList, 'RunDetail'>;

export function RunDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { runId } = route.params;

  const { user } = useAuthContext();
  const { isRunSaved, toggleRunSaved } = useSavedContext();

  // ── Run + venue fetch ──────────────────────────────────────────────────────
  const [run, setRun] = useState<RecurringRun | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRunById(runId).then((r) => {
      setRun(r);
      setIsLoading(false);
      if (r) {
        fetchVenueById(r.venueId).then(setVenue);
      }
    });
  }, [runId]);

  // ── Recent report count for trust signal ──────────────────────────────────
  const [recentReportCount, setRecentReportCount] = useState(0);

  useEffect(() => {
    fetchRunRecentReportCount(runId).then(setRecentReportCount);
  }, [runId]);

  // ── Weather — outdoor runs only ────────────────────────────────────────────
  const [weather, setWeather] = useState<WeatherResult | null>(null);

  useEffect(() => {
    if (!run || run.isIndoor) return;
    const { latitude, longitude } = run.venueCoordinates;
    if (latitude === 0 && longitude === 0) return;
    fetchWeather(latitude, longitude).then(setWeather);
  }, [run?.isIndoor, run?.venueCoordinates.latitude, run?.venueCoordinates.longitude]);

  // ── Attendance count (all users) ──────────────────────────────────────────
  const [attendanceCount, setAttendanceCount] = useState(0);

  useEffect(() => {
    fetchRunAttendanceCount(runId).then(setAttendanceCount);
  }, [runId]);

  // ── Attendance state ───────────────────────────────────────────────────────
  const [isGoing, setIsGoing] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Load existing attendance once we know both the run ID and the user
  useEffect(() => {
    if (!user?.id || !runId) {
      setIsGoing(false);
      return;
    }
    supabase
      .from('run_attendance')
      .select('status')
      .eq('run_id', runId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        // SDK type inference issue for composite-PK tables — cast explicitly
        setIsGoing((data as { status: string } | null)?.status === 'attending');
      });
  }, [runId, user?.id]);

  const handleReport = useCallback(() => {
    if (!user) {
      (navigation as any).navigate('SignIn');
      return;
    }
    const submit = (reportType: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('run_reports') as any).insert({
        user_id: user.id,
        run_id: runId,
        report_type: reportType,
      });
    };
    Alert.alert(
      'Report an Issue',
      'What problem did you find?',
      [
        { text: 'No one was there', onPress: () => submit('no_one_there') },
        { text: 'Wrong time', onPress: () => submit('wrong_time') },
        { text: 'Closed location', onPress: () => submit('closed_location') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [user, runId, navigation]);

  const handleAttendance = useCallback(async () => {
    if (!user) {
      // Redirect guests to sign in
      (navigation as any).navigate('SignIn');
      return;
    }

    const nextGoing = !isGoing;
    setIsGoing(nextGoing); // optimistic
    setAttendanceCount((prev) => nextGoing ? prev + 1 : Math.max(0, prev - 1)); // optimistic
    setAttendanceLoading(true);

    try {
      if (nextGoing) {
        // Mark as attending — upsert handles the case where a row already exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from('run_attendance')
          .upsert({ user_id: user.id, run_id: runId, status: 'attending' } as any);
        if (error) {
          setIsGoing(false); // rollback
          setAttendanceCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Remove attendance
        const { error } = await supabase
          .from('run_attendance')
          .delete()
          .match({ user_id: user.id, run_id: runId });
        if (error) {
          setIsGoing(true); // rollback
          setAttendanceCount((prev) => prev + 1);
        }
      }
    } finally {
      setAttendanceLoading(false);
    }
  }, [user, isGoing, runId, navigation]);

  // Mock chat matched by venue ID — won't hit for Supabase UUIDs (section is null-guarded)
  const chatRoom = venue ? MOCK_CHAT_ROOMS.find((c) => c.venueId === venue.id) : undefined;

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator size="large" color={Colors.accent.orange} />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={styles.notFound}>
        <Text style={{ color: Colors.text.secondary }}>Run not found</Text>
      </View>
    );
  }

  const sport = SPORT_MAP[run.sport];
  const saved = isRunSaved(runId);
  const trustSignal = getTrustSignal(run, recentReportCount);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header: back | flag + bookmark ────────────────────────── */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleReport} style={styles.backBtn} activeOpacity={0.85}>
              <Ionicons name="flag-outline" size={20} color={Colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleRunSaved(runId)}
              style={styles.backBtn}
              activeOpacity={0.85}
            >
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={saved ? Colors.accent.orange : Colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.content}>
          {/* Sport icon + run name */}
          <View style={styles.heroSection}>
            <View style={styles.sportIconLarge}>
              <Text style={styles.sportEmojiLarge}>{sport?.emoji ?? '🏃'}</Text>
            </View>
            <View style={styles.heroText}>
              <View style={styles.titleRow}>
                <Text style={styles.runName}>{run.name}</Text>
                {run.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.accent.green} />
                    <Text style={styles.verifiedText}>Verified Run</Text>
                  </View>
                )}
              </View>
              <Text style={styles.venueName}>{run.venueName}</Text>
              <PopularityBadge score={run.popularityScore} style={styles.pop} />
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>{run.description}</Text>

          {/* Trust / freshness signal */}
          {trustSignal && (
            <View style={[styles.trustBadge, { backgroundColor: trustSignal.bg }]}>
              <Ionicons name={trustSignal.icon as any} size={13} color={trustSignal.color} />
              <Text style={[styles.trustText, { color: trustSignal.color }]}>
                {trustSignal.label}
              </Text>
            </View>
          )}

          {/* Seasonal warning */}
          {run.isSeasonal && (
            <View style={styles.seasonalBanner}>
              <View style={styles.seasonalHeader}>
                <Ionicons name="calendar-outline" size={14} color={Colors.accent.orange} />
                <Text style={styles.seasonalText}>
                  Seasonal: runs month {run.seasonStartMonth} through month {run.seasonEndMonth}
                </Text>
              </View>
              {run.seasonNotes && (
                <Text style={styles.seasonalNotes}>{run.seasonNotes}</Text>
              )}
            </View>
          )}

          {/* Weather — outdoor runs only */}
          {!run.isIndoor && weather && (
            <View style={[styles.trustBadge, {
              backgroundColor: weather.isRainy ? 'rgba(59,130,246,0.10)' : 'rgba(16,185,129,0.10)',
            }]}>
              <Ionicons
                name={weather.isRainy ? 'rainy-outline' : 'sunny-outline'}
                size={13}
                color={weather.isRainy ? '#3B82F6' : '#059669'}
              />
              <Text style={[styles.trustText, { color: weather.isRainy ? '#3B82F6' : '#059669' }]}>
                {weather.tempF}°F · {weather.isRainy ? 'Rain likely' : 'Clear'}
              </Text>
            </View>
          )}

          {/* ── Info rows ─────────────────────────────────────────────── */}
          <View style={styles.infoCard}>
            <DetailInfoRow
              icon="time-outline"
              label="Schedule"
              value={formatScheduleSummary(run.schedule)}
            />
            {run.typicalTurnout != null && (
              <DetailInfoRow
                icon="people-outline"
                label="Turnout"
                value={`Usually ${run.typicalTurnout}${run.maxPlayers ? `/${run.maxPlayers}` : '+'} players`}
              />
            )}
            <DetailInfoRow
              icon="people-circle-outline"
              label="Attending"
              value={attendanceCount === 0 ? 'Be the first!' : `${attendanceCount} going`}
              valueColor={attendanceCount === 0 ? Colors.text.tertiary : '#16A34A'}
            />
            <DetailInfoRow
              icon="star-outline"
              label="Level"
              value={formatSkillLevel(run.skillLevel)}
            />
            <DetailInfoRow
              icon="card-outline"
              label="Cost"
              value={formatCost(run.costPerSession)}
              valueColor={run.costPerSession ? undefined : '#16A34A'}
            />
            {run.organizer && (
              <DetailInfoRow
                icon="person-outline"
                label="Hosted by"
                value={run.organizer}
                isLast
              />
            )}
          </View>

          {/* ── Full schedule breakdown ────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>
            {run.schedule.map((slot, i) => {
              const dayLabel = slot.day.charAt(0).toUpperCase() + slot.day.slice(1);
              const startH = parseInt(slot.startTime.split(':')[0]);
              const endH = parseInt(slot.endTime.split(':')[0]);
              const startP = startH >= 12 ? 'PM' : 'AM';
              const endP = endH >= 12 ? 'PM' : 'AM';
              const fH = (h: number) => (h % 12 === 0 ? 12 : h % 12);
              const time = `${fH(startH)}${startP !== endP ? ' ' + startP : ''}–${fH(endH)} ${endP}`;

              return (
                <View key={i} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{dayLabel}</Text>
                  <Text style={styles.scheduleTime}>{time}</Text>
                  {slot.isBusy && (
                    <View style={styles.busyBadge}>
                      <Text style={styles.busyText}>Busy</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Venue link */}
          {venue && (
            <TouchableOpacity
              style={styles.venueLink}
              onPress={() => (navigation as any).navigate('VenueDetail', { venueId: venue.id })}
              activeOpacity={0.85}
            >
              <View style={styles.venueLinkLeft}>
                <Ionicons name="location-outline" size={18} color={Colors.accent.orange} />
                <View>
                  <Text style={styles.venueLinkName}>{venue.name}</Text>
                  <Text style={styles.venueLinkAddress}>{formatAddress(venue.address)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}

          {/* Chat */}
          {chatRoom && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coordination Chat</Text>
              <ChatPreviewCard
                room={chatRoom}
                onPress={() => Alert.alert('Chat', 'Chat coming soon!')}
              />
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── Action bar ────────────────────────────────────────────────── */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionSecondary}
          onPress={() => Alert.alert('Share', 'Share this run!')}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={18} color={Colors.text.primary} />
          <Text style={styles.actionSecondaryText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionPrimary, isGoing && styles.actionPrimaryGoing]}
          onPress={handleAttendance}
          activeOpacity={0.85}
          disabled={attendanceLoading}
        >
          {attendanceLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.actionPrimaryText}>
                {isGoing ? "I'm Going" : 'Count Me In'}
              </Text>
              <Ionicons
                name={isGoing ? 'checkmark-circle' : 'arrow-forward'}
                size={18}
                color="#FFF"
              />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.sheet },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'android' ? Spacing.xxxl : Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.sheetCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  content: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  trustText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  seasonalBanner: {
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,92,26,0.10)', // Colors.accent.orange @ 10%
  },
  seasonalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  seasonalText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
  seasonalNotes: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  heroSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  sportIconLarge: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bg.sheetCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportEmojiLarge: { fontSize: 32 },
  heroText: { flex: 1, gap: Spacing.xs },
  titleRow: { gap: Spacing.xs },
  runName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedText: {
    fontSize: FontSize.xs,
    color: Colors.accent.green,
    fontWeight: FontWeight.semibold,
  },
  venueName: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  pop: { marginTop: Spacing.xs },
  description: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: FontSize.base * 1.6,
  },
  infoCard: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
  },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
    gap: Spacing.sm,
  },
  scheduleDay: {
    width: 50,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  scheduleTime: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  busyBadge: {
    backgroundColor: Colors.accent.redSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  busyText: {
    fontSize: FontSize.xs,
    color: Colors.accent.red,
    fontWeight: FontWeight.semibold,
  },
  venueLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  venueLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  venueLinkName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  venueLinkAddress: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
    backgroundColor: Colors.bg.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.light,
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
  actionPrimaryGoing: {
    backgroundColor: '#16A34A', // green when attending
  },
  actionPrimaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
});
