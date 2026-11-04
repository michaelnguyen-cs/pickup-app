// CreateRunScreen — modal for creating a one-time pickup run at a selected venue.
//
// Entry: VenueDetailScreen "Create Run Here" → navigate('CreateRun', params)
// Guards:
//   1. Auth: caller ensures user is signed in before navigating here.
//   2. One active run: if activeRun exists, the form is replaced with an
//      existing-run state that lets the user cancel before creating another.
//
// Sport selector is limited to the venue's sports — prevents mismatches.
// Start time is chosen via preset chips (no date-picker package required).
// Duration chips compute endTime from startTime.

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';
import { SPORT_MAP } from '../constants/sports';
import { SportId } from '../constants/sports';
import { SkillLevel } from '../data/types';
import { RootStackParamList } from '../navigation/types';
import { useActiveRun } from '../context/ActiveRunContext';
import { callCreateRun, callCancelRun, RPC_ERROR_MESSAGES } from '../lib/queries/userRuns';

type RouteType = RouteProp<RootStackParamList, 'CreateRun'>;

// ── Constants ─────────────────────────────────────────────────────────────────

type TimePresetId = 'now' | '30m' | '1h' | '2h';
const TIME_PRESETS: Array<{ id: TimePresetId; label: string; offsetMs: number }> = [
  { id: 'now',  label: 'Now',     offsetMs: 0 },
  { id: '30m',  label: '+30 min', offsetMs: 30 * 60 * 1000 },
  { id: '1h',   label: '+1 hr',   offsetMs: 60 * 60 * 1000 },
  { id: '2h',   label: '+2 hr',   offsetMs: 2 * 60 * 60 * 1000 },
];

type DurationId = '30m' | '1h' | '90m' | '2h' | '3h';
const DURATION_OPTIONS: Array<{ id: DurationId; label: string; minutes: number }> = [
  { id: '30m', label: '30 min', minutes: 30 },
  { id: '1h',  label: '1 hr',   minutes: 60 },
  { id: '90m', label: '1.5 hr', minutes: 90 },
  { id: '2h',  label: '2 hr',   minutes: 120 },
  { id: '3h',  label: '3 hr',   minutes: 180 },
];

const SKILL_LEVELS: Array<{ id: SkillLevel; label: string; description: string }> = [
  { id: 'beginner',     label: 'Beginner',     description: 'New to the sport' },
  { id: 'casual',       label: 'Casual',       description: 'Play for fun' },
  { id: 'intermediate', label: 'Intermediate', description: 'Competitive but friendly' },
  { id: 'competitive',  label: 'Competitive',  description: 'Here to win' },
];

const NOTES_MAX = 120;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const min = m.toString().padStart(2, '0');
  return `${hour}:${min} ${ampm}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateRunScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteType>();
  const { venueId, venueName, sports: sportIds, defaultSport } = route.params;
  const { activeRun, setActiveRun, refresh } = useActiveRun();

  const sports = sportIds as SportId[];
  const initialSport: SportId = (defaultSport as SportId) ?? sports[0];

  // Form state
  const [selectedSport, setSelectedSport]     = useState<SportId>(initialSport);
  const [timePreset, setTimePreset]           = useState<TimePresetId>('now');
  const [startTime, setStartTime]             = useState<Date>(() => new Date());
  const [duration, setDuration]               = useState<DurationId>('1h');
  const [maxPlayers, setMaxPlayers]           = useState(10);
  const [skillLevel, setSkillLevel]           = useState<SkillLevel>('casual');
  const [notes, setNotes]                     = useState('');
  const [submitting, setSubmitting]           = useState(false);

  const selectPreset = useCallback((preset: typeof TIME_PRESETS[number]) => {
    setTimePreset(preset.id);
    setStartTime(new Date(Date.now() + preset.offsetMs));
  }, []);

  const endTime = useMemo(() => {
    const mins = DURATION_OPTIONS.find((d) => d.id === duration)?.minutes ?? 60;
    return new Date(startTime.getTime() + mins * 60 * 1000);
  }, [startTime, duration]);

  const isValid = !!selectedSport && !!skillLevel;

  const handleCreate = useCallback(async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const result = await callCreateRun({
        venueId,
        sport: selectedSport,
        startTime,
        endTime,
        skillLevel,
        maxPlayers,
        notes: notes.trim() || undefined,
      });
      if (result.error) {
        Alert.alert('Could not create run', RPC_ERROR_MESSAGES[result.error] ?? result.error);
        return;
      }
      await refresh();
      navigation.goBack();
      Alert.alert('Run Created!', `Your run at ${venueName} is set for ${formatTime(startTime)}.`, [{ text: 'Got it' }]);
    } finally {
      setSubmitting(false);
    }
  }, [isValid, submitting, venueId, selectedSport, startTime, endTime, skillLevel, maxPlayers, notes, refresh, navigation, venueName]);

  const handleCancelActiveRun = useCallback(() => {
    if (!activeRun) return;
    Alert.alert(
      'Cancel Run',
      'Are you sure you want to cancel your current run?',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Run',
          style: 'destructive',
          onPress: async () => {
            const result = await callCancelRun(activeRun.id);
            if (result.error) {
              Alert.alert('Error', RPC_ERROR_MESSAGES[result.error] ?? result.error);
              return;
            }
            setActiveRun(null);
          },
        },
      ]
    );
  }, [activeRun, setActiveRun]);

  // ── Existing run gate ──────────────────────────────────────────────────────
  if (activeRun) {
    const activeSport = SPORT_MAP[activeRun.sport];
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Run</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* Existing run card */}
        <View style={styles.existingRunWrap}>
          <View style={styles.existingRunCard}>
            <View style={styles.existingRunIcon}>
              <Text style={{ fontSize: 28 }}>{activeSport?.emoji ?? '🏃'}</Text>
            </View>
            <View style={styles.existingRunInfo}>
              <Text style={styles.existingRunTitle}>You already have an active run</Text>
              <Text style={styles.existingRunVenue} numberOfLines={1}>
                {activeSport?.label} · {activeRun.venueName}
              </Text>
              <Text style={styles.existingRunTime}>
                {formatTime(activeRun.startTime)} → {formatTime(activeRun.endTime)}
              </Text>
            </View>
          </View>

          <Text style={styles.existingRunHint}>
            You can only have one active run at a time. Cancel it to create a new one.
          </Text>

          <TouchableOpacity
            style={styles.cancelRunBtn}
            onPress={handleCancelActiveRun}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.cancelRunBtnText}>Cancel My Run</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')}
            activeOpacity={0.85}
          >
            <Text style={styles.dismissBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Run creation form ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Run</Text>
        <View style={styles.closeBtn} />
      </View>

      {/* Venue context strip */}
      <View style={styles.venuePill}>
        <Ionicons name="location-sharp" size={13} color={Colors.accent.orange} />
        <Text style={styles.venuePillText} numberOfLines={1}>{venueName}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Sport ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sport</Text>
          <View style={styles.sportRow}>
            {sports.map((id) => {
              const s = SPORT_MAP[id];
              if (!s) return null;
              const active = selectedSport === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.sportChip, active && styles.sportChipActive]}
                  onPress={() => setSelectedSport(id)}
                  activeOpacity={0.82}
                >
                  <Text style={styles.sportChipEmoji}>{s.emoji}</Text>
                  <Text style={[styles.sportChipLabel, active && styles.sportChipLabelActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Start Time ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Start Time</Text>
            <Text style={styles.sectionValue}>{formatTime(startTime)}</Text>
          </View>
          <View style={styles.chipRow}>
            {TIME_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, timePreset === p.id && styles.chipActive]}
                onPress={() => selectPreset(p)}
                activeOpacity={0.82}
              >
                <Text style={[styles.chipText, timePreset === p.id && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Duration ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <Text style={styles.sectionValue}>
              ends {formatTime(endTime)}
            </Text>
          </View>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.chip, duration === d.id && styles.chipActive]}
                onPress={() => setDuration(d.id)}
                activeOpacity={0.82}
              >
                <Text style={[styles.chipText, duration === d.id && styles.chipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Players ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players Needed</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, maxPlayers <= 2 && styles.stepperBtnDisabled]}
              onPress={() => setMaxPlayers((n) => Math.max(2, n - 1))}
              activeOpacity={0.7}
              disabled={maxPlayers <= 2}
            >
              <Ionicons name="remove" size={18} color={maxPlayers <= 2 ? Colors.text.tertiary : Colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.stepperCount}>
              <Text style={styles.stepperCountText}>{maxPlayers}</Text>
              <Text style={styles.stepperCountLabel}>players max</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperBtn, maxPlayers >= 20 && styles.stepperBtnDisabled]}
              onPress={() => setMaxPlayers((n) => Math.min(20, n + 1))}
              activeOpacity={0.7}
              disabled={maxPlayers >= 20}
            >
              <Ionicons name="add" size={18} color={maxPlayers >= 20 ? Colors.text.tertiary : Colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Skill Level ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Level</Text>
          <View style={styles.skillGrid}>
            {SKILL_LEVELS.map((level) => {
              const active = skillLevel === level.id;
              return (
                <TouchableOpacity
                  key={level.id}
                  style={[styles.skillCard, active && styles.skillCardActive]}
                  onPress={() => setSkillLevel(level.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.skillLabel, active && styles.skillLabelActive]}>
                    {level.label}
                  </Text>
                  <Text style={[styles.skillDesc, active && styles.skillDescActive]}>
                    {level.description}
                  </Text>
                  {active && (
                    <View style={styles.skillCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.accent.orange} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Notes <Text style={styles.optional}>(optional)</Text></Text>
            <Text style={[styles.charCount, notes.length >= NOTES_MAX - 10 && styles.charCountWarn]}>
              {notes.length}/{NOTES_MAX}
            </Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder='e.g. "Full court only, bring water"'
            placeholderTextColor={Colors.text.tertiary}
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, NOTES_MAX))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* Sticky submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
          onPress={handleCreate}
          activeOpacity={0.88}
          disabled={!isValid || submitting}
        >
          <Ionicons name="flash" size={18} color="#FFF" />
          <Text style={styles.submitBtnText}>{submitting ? 'Creating…' : 'Create Run'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.sheetCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bg.sheet,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },

  venuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.accent.orangeSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  venuePillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
    flex: 1,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: Spacing.base },

  section: {
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
  optional: {
    fontWeight: FontWeight.regular,
    color: Colors.text.tertiary,
    fontSize: FontSize.sm,
  },

  // Sport chips
  sportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.sheetCard,
  },
  sportChipActive: {
    borderColor: Colors.accent.orange,
    backgroundColor: Colors.accent.orangeSubtle,
  },
  sportChipEmoji: { fontSize: 15 },
  sportChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
  },
  sportChipLabelActive: {
    color: Colors.accent.orange,
  },

  // Time / duration chips (shared)
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.sheetCard,
  },
  chipActive: {
    backgroundColor: Colors.accent.orange,
    borderColor: Colors.accent.orange,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: '#FFF',
  },

  // Player stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg.sheetCard,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperCount: {
    alignItems: 'center',
    minWidth: 72,
  },
  stepperCountText: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    lineHeight: FontSize.xxl * 1.2,
  },
  stepperCountLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: FontWeight.medium,
  },

  // Skill level
  skillGrid: {
    gap: Spacing.sm,
  },
  skillCard: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.bg.sheetCard,
    borderWidth: 1.5,
    borderColor: Colors.border.light,
    position: 'relative',
  },
  skillCardActive: {
    borderColor: Colors.accent.orange,
    backgroundColor: Colors.accent.orangeSubtle,
  },
  skillLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  skillLabelActive: { color: Colors.accent.orange },
  skillDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  skillDescActive: {
    color: Colors.accent.orange,
    opacity: 0.75,
  },
  skillCheck: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },

  // Notes
  notesInput: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    minHeight: 80,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    fontWeight: FontWeight.medium,
  },
  charCountWarn: {
    color: '#D97706',
  },

  // Sticky footer
  footer: {
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.base,
    backgroundColor: Colors.bg.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.light,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent.orange,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md + 2,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },

  // Existing run gate
  existingRunWrap: {
    flex: 1,
    padding: Spacing.base,
    gap: Spacing.base,
  },
  existingRunCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.accent.orange,
  },
  existingRunIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  existingRunInfo: {
    flex: 1,
    gap: 3,
  },
  existingRunTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  existingRunVenue: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  existingRunTime: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
  existingRunHint: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: FontSize.sm * 1.5,
  },
  cancelRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md + 2,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  cancelRunBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: '#DC2626',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  dismissBtnText: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
});
