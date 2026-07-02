// AdminCandidateReviewScreen — internal tool for reviewing AI-extracted run candidates
//
// Access: enforced server-side — get_pending_run_candidates() and the
//         approve/reject/flag RPCs all raise 42501 unless public.is_admin()
//         is true for the caller. This screen has no client-side gate of
//         its own; a non-admin who navigates here just sees failed requests.
//
// Actions:
//   Approve  → calls approve_run_candidate(); removes card from list on success
//   Reject   → calls reject_run_candidate(); removes card from list on success
//   Flag     → calls flag_run_candidate_for_clarification(); removes card from list
//
// Venue selection:
//   If a candidate's venue_id is null, tapping Approve opens a venue picker
//   modal before calling the approve function. Candidates with a linked venue
//   are approved directly.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import {
  CandidateListItem,
  fetchPendingCandidates,
  approveCandidateRpc,
  rejectCandidateRpc,
  flagCandidateRpc,
} from '../../lib/queries/candidates';
import { useAuthContext } from '../../context/AuthContext';
import { useVenues } from '../../hooks/useVenues';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';

// ── Formatting helpers ─────────────────────────────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function confidenceColor(score: number): string {
  if (score >= 0.80) return '#16A34A';
  if (score >= 0.60) return '#D97706';
  return '#DC2626';
}

function confidenceBg(score: number): string {
  if (score >= 0.80) return Colors.accent.greenSubtle;
  if (score >= 0.60) return 'rgba(245,158,11,0.10)';
  return Colors.accent.redSubtle;
}

// ── Candidate card ─────────────────────────────────────────────────────────────

interface CandidateCardProps {
  item: CandidateListItem;
  isProcessing: boolean;
  onApprove: (item: CandidateListItem) => void;
  onReject: (item: CandidateListItem) => void;
  onFlag: (item: CandidateListItem) => void;
}

function CandidateCard({ item, isProcessing, onApprove, onReject, onFlag }: CandidateCardProps) {
  return (
    <View style={styles.card}>
      {/* Title row */}
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleLeft}>
          {item.needs_review && <View style={styles.needsReviewDot} />}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        <View style={[styles.confidencePill, { backgroundColor: confidenceBg(item.confidence_score) }]}>
          <Text style={[styles.confidenceText, { color: confidenceColor(item.confidence_score) }]}>
            {Math.round(item.confidence_score * 100)}%
          </Text>
        </View>
      </View>

      {/* Schedule */}
      <Text style={styles.cardMeta}>
        {DAY_LABELS[item.day_of_week] ?? item.day_of_week}
        {'  '}
        {fmtTime(item.start_time)} – {fmtTime(item.end_time)}
        {'  ·  '}
        {item.sport_id}
        {item.is_indoor ? '  ·  Indoor' : ''}
      </Text>

      {/* Venue */}
      <Text style={styles.cardMeta}>
        {item.venue_name
          ? `Venue: ${item.venue_name}`
          : <Text style={styles.noVenueWarning}>No venue linked — will need selection on approve</Text>
        }
      </Text>

      {/* Source */}
      <Text style={styles.cardSource} numberOfLines={1}>
        {item.source_type}{item.source_name ? ` · ${item.source_name}` : ''}
      </Text>
      {item.source_url && (
        <TouchableOpacity
          style={styles.sourceLinkRow}
          onPress={() => Linking.openURL(item.source_url!)}
          activeOpacity={0.7}
        >
          <Ionicons name="link-outline" size={11} color="#3B82F6" />
          <Text style={styles.sourceLinkText} numberOfLines={1}>{item.source_url}</Text>
        </TouchableOpacity>
      )}

      {/* Status */}
      <View style={styles.cardStatusRow}>
        <View style={[
          styles.statusPill,
          item.review_status === 'needs_clarification' && styles.statusPillAmber,
        ]}>
          <Text style={[
            styles.statusText,
            item.review_status === 'needs_clarification' && styles.statusTextAmber,
          ]}>
            {item.review_status}
          </Text>
        </View>
      </View>

      {/* Notes (if any) */}
      {item.notes != null && (
        <Text style={styles.cardNotes} numberOfLines={3}>{item.notes}</Text>
      )}

      {/* Action buttons */}
      {isProcessing ? (
        <ActivityIndicator size="small" color={Colors.accent.orange} style={styles.actionLoader} />
      ) : (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onApprove(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={14} color="#FFF" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onReject(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={14} color="#DC2626" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.flagBtn]}
            onPress={() => onFlag(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={14} color="#D97706" />
            <Text style={styles.flagBtnText}>Flag</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function AdminCandidateReviewScreen() {
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const { venues } = useVenues();

  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Venue picker modal state
  const [venuePickerFor, setVenuePickerFor] = useState<CandidateListItem | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchPendingCandidates();
      setCandidates(result);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeCandidate = (id: string) =>
    setCandidates((prev) => prev.filter((c) => c.id !== id));

  // ── Approve ──────────────────────────────────────────────────────────────────

  const handleApprove = useCallback((item: CandidateListItem) => {
    if (!item.venue_id) {
      // Venue must be selected before approving
      setVenuePickerFor(item);
      return;
    }
    submitApprove(item.id, item.venue_id);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const submitApprove = useCallback(async (candidateId: string, venueId: string) => {
    setVenuePickerFor(null);
    setProcessingId(candidateId);
    try {
      await approveCandidateRpc(candidateId, user!.id, venueId);
      removeCandidate(candidateId);
    } catch (e: unknown) {
      Alert.alert('Approve failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setProcessingId(null);
    }
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reject ───────────────────────────────────────────────────────────────────

  const handleReject = useCallback((item: CandidateListItem) => {
    Alert.alert(
      'Reject candidate?',
      `"${item.title}" will be marked rejected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(item.id);
            try {
              await rejectCandidateRpc(item.id, user!.id);
              removeCandidate(item.id);
            } catch (e: unknown) {
              Alert.alert('Reject failed', e instanceof Error ? e.message : 'Unknown error');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Flag ─────────────────────────────────────────────────────────────────────

  const handleFlag = useCallback((item: CandidateListItem) => {
    const submit = async (note?: string) => {
      setProcessingId(item.id);
      try {
        await flagCandidateRpc(item.id, user!.id, note);
        removeCandidate(item.id);
      } catch (e: unknown) {
        Alert.alert('Flag failed', e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setProcessingId(null);
      }
    };

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Flag for clarification',
        'Add a note (optional):',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Flag', onPress: (note: string | undefined) => submit(note ?? undefined) },
        ],
        'plain-text'
      );
    } else {
      Alert.alert(
        'Flag for clarification',
        `Mark "${item.title}" as needing clarification?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Flag', onPress: () => submit() },
        ]
      );
    }
  }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Candidate Review</Text>
          {!isLoading && (
            <Text style={styles.headerCount}>{candidates.length} pending</Text>
          )}
        </View>
        <TouchableOpacity onPress={load} style={styles.backBtn}>
          <Ionicons name="refresh-outline" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent.orange} />
        </View>
      ) : candidates.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>No pending candidates</Text>
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CandidateCard
              item={item}
              isProcessing={processingId === item.id}
              onApprove={handleApprove}
              onReject={handleReject}
              onFlag={handleFlag}
            />
          )}
        />
      )}

      {/* Venue picker modal — shown when approving a candidate with null venue_id */}
      <Modal
        visible={venuePickerFor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVenuePickerFor(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Venue</Text>
            <TouchableOpacity onPress={() => setVenuePickerFor(null)}>
              <Ionicons name="close" size={22} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          {venuePickerFor && (
            <Text style={styles.modalSubtitle} numberOfLines={2}>
              Approving: {venuePickerFor.title}
            </Text>
          )}
          <ScrollView contentContainerStyle={styles.venueList}>
            {venues.map((venue) => (
              <TouchableOpacity
                key={venue.id}
                style={styles.venueItem}
                onPress={() => venuePickerFor && submitApprove(venuePickerFor.id, venue.id)}
                activeOpacity={0.85}
              >
                <View style={styles.venueItemText}>
                  <Text style={styles.venueItemName}>{venue.name}</Text>
                  <Text style={styles.venueItemAddress}>{venue.address}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.sheetCard },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.base, color: Colors.text.tertiary },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  headerCount: { fontSize: FontSize.xs, color: Colors.text.tertiary },

  // List
  list: { padding: Spacing.base, gap: Spacing.md },

  // Card
  card: {
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cardTitleLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  needsReviewDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#D97706', marginTop: 5, flexShrink: 0,
  },
  cardTitle: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  confidencePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  confidenceText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  cardMeta: { fontSize: FontSize.sm, color: Colors.text.secondary },
  noVenueWarning: { color: '#D97706' },
  cardSource: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  sourceLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sourceLinkText: { flex: 1, fontSize: FontSize.xs, color: '#3B82F6', textDecorationLine: 'underline' },

  cardStatusRow: { flexDirection: 'row' },
  statusPill: {
    backgroundColor: Colors.bg.sheetCard,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusPillAmber: { backgroundColor: 'rgba(245,158,11,0.10)' },
  statusText: { fontSize: FontSize.xs, color: Colors.text.tertiary, fontWeight: FontWeight.medium },
  statusTextAmber: { color: '#D97706' },

  cardNotes: { fontSize: FontSize.xs, color: Colors.text.secondary, fontStyle: 'italic' },

  actionLoader: { alignSelf: 'center', marginVertical: Spacing.sm },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1,
  },
  approveBtn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  approveBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#FFF' },
  rejectBtn: { backgroundColor: Colors.bg.sheetCard, borderColor: Colors.border.light },
  rejectBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#DC2626' },
  flagBtn: { backgroundColor: Colors.bg.sheetCard, borderColor: Colors.border.light },
  flagBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#D97706' },

  // Venue picker modal
  modalContainer: { flex: 1, backgroundColor: Colors.bg.sheet },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  modalSubtitle: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  venueList: { paddingBottom: Spacing.xxxl },
  venueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  venueItemText: { flex: 1, gap: 2 },
  venueItemName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  venueItemAddress: { fontSize: FontSize.sm, color: Colors.text.secondary },
});
