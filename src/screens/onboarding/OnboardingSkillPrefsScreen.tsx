// OnboardingSkillPrefsScreen — skill level + indoor/outdoor preference
//
// Last onboarding screen. "Let's Go!" calls completeOnboarding() which:
//   1. Persists all prefs to AsyncStorage
//   2. Sets hasOnboarded = true in PrefsContext
//   3. React Navigation's conditional rendering automatically swaps
//      the onboarding screens out and shows the main app — no navigate() needed.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/types';
import { usePrefsContext, UserPrefs } from '../../context/PrefsContext';
import { SkillLevel, IndoorOutdoor } from '../../data/types';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';
import { ProgressDots } from './OnboardingWelcomeScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SKILL_OPTIONS: Array<{ id: SkillLevel; label: string; description: string; color: string }> = [
  { id: 'beginner', label: 'Beginner', description: "Still learning the game", color: '#22C55E' },
  { id: 'casual', label: 'Casual', description: "Play for fun, no pressure", color: '#22C55E' },
  { id: 'intermediate', label: 'Intermediate', description: "Know the rules, play regularly", color: '#F59E0B' },
  { id: 'competitive', label: 'Competitive', description: "Play to win", color: '#EF4444' },
  { id: 'mixed', label: 'All Levels', description: "Happy to play with anyone", color: '#3B82F6' },
];

const IO_OPTIONS: Array<{ id: IndoorOutdoor; label: string; emoji: string }> = [
  { id: 'indoor', label: 'Indoor', emoji: '🏠' },
  { id: 'both', label: 'Either', emoji: '🌤' },
  { id: 'outdoor', label: 'Outdoor', emoji: '☀️' },
];

export function OnboardingSkillPrefsScreen() {
  const navigation = useNavigation<Nav>();
  const { prefs, completeOnboarding } = usePrefsContext();

  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(prefs.skillLevel);
  const [indoorOutdoor, setIndoorOutdoor] = useState<IndoorOutdoor | null>(prefs.indoorOutdoor);
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    const finalPrefs: UserPrefs = {
      sports: prefs.sports,
      skillLevel,
      indoorOutdoor,
    };
    await completeOnboarding(finalPrefs);
    // No navigation.navigate() needed — PrefsContext.hasOnboarded flipping to true
    // causes AppNavigator to unmount onboarding screens and mount the main app.
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={Colors.text.inverse} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headline}>Your playing style</Text>
          <Text style={styles.subhead}>Helps us surface the right games for you</Text>
        </View>

        {/* Skill level section */}
        <Text style={styles.sectionLabel}>Skill level</Text>
        <View style={styles.skillList}>
          {SKILL_OPTIONS.map((opt) => {
            const isSelected = skillLevel === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.skillRow, isSelected && styles.skillRowSelected]}
                onPress={() => setSkillLevel(isSelected ? null : opt.id)}
                activeOpacity={0.8}
              >
                {/* Selection indicator */}
                <View style={[styles.radioOuter, isSelected && { borderColor: opt.color }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: opt.color }]} />}
                </View>

                <View style={styles.skillText}>
                  <Text style={[styles.skillLabel, isSelected && styles.skillLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.skillDesc}>{opt.description}</Text>
                </View>

                {isSelected && (
                  <View style={[styles.levelDot, { backgroundColor: opt.color + '22', borderColor: opt.color }]}>
                    <Text style={[styles.levelDotText, { color: opt.color }]}>{opt.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Indoor/Outdoor section */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Venue preference</Text>
        <View style={styles.ioRow}>
          {IO_OPTIONS.map((opt) => {
            const isSelected = indoorOutdoor === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.ioChip, isSelected && styles.ioChipSelected]}
                onPress={() => setIndoorOutdoor(isSelected ? null : opt.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.ioEmoji}>{opt.emoji}</Text>
                <Text style={[styles.ioLabel, isSelected && styles.ioLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.scrollPad} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaBtn, saving && styles.ctaBtnDisabled]}
          onPress={handleFinish}
          activeOpacity={0.88}
          disabled={saving}
        >
          <Text style={styles.ctaText}>{saving ? 'Almost there...' : "Let's Go!"}</Text>
          {!saving && <Ionicons name="flash" size={16} color="#FFF" />}
        </TouchableOpacity>

        {(!skillLevel && !indoorOutdoor) && (
          <Text style={styles.skipHint}>You can skip this — set it later in your profile</Text>
        )}

        <ProgressDots total={4} current={3} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginLeft: Spacing.xl,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
  },
  header: {
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.inverse,
  },
  subhead: {
    fontSize: FontSize.base,
    color: Colors.text.inverseSecondary,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  skillList: {
    gap: Spacing.sm,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#1A1A1A',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  skillRowSelected: {
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  skillText: {
    flex: 1,
    gap: 2,
  },
  skillLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255,255,255,0.5)',
  },
  skillLabelSelected: {
    color: Colors.text.inverse,
  },
  skillDesc: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.3)',
  },
  levelDot: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  levelDotText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },

  // Indoor/outdoor
  ioRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ioChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: Radius.xl,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.xs,
  },
  ioChipSelected: {
    borderColor: Colors.accent.orange,
    backgroundColor: Colors.accent.orangeSubtle,
  },
  ioEmoji: {
    fontSize: 24,
  },
  ioLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255,255,255,0.5)',
  },
  ioLabelSelected: {
    color: Colors.accent.orange,
  },

  scrollPad: {
    height: Spacing.xxl,
  },

  // Bottom
  bottom: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.xl,
    gap: Spacing.base,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent.orange,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base + 2,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  skipHint: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.28)',
  },
});
