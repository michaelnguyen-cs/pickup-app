// OnboardingSportsScreen — multi-select sport preference
//
// Stores selection in PrefsContext (in-memory only at this point).
// Final save to AsyncStorage happens on the last screen via completeOnboarding().
// All sports optional — user can continue with zero selected.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/types';
import { SPORTS, SportId } from '../../constants/sports';
import { usePrefsContext } from '../../context/PrefsContext';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';
import { ProgressDots } from './OnboardingWelcomeScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Show all 9 sports in a 3-column grid
const SPORT_GRID = SPORTS;

export function OnboardingSportsScreen() {
  const navigation = useNavigation<Nav>();
  const { prefs, updatePrefs } = usePrefsContext();
  const [selected, setSelected] = useState<Set<SportId>>(new Set(prefs.sports));

  const toggle = (id: SportId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = () => {
    updatePrefs({ sports: [...selected] });
    navigation.navigate('OnboardingSkillPrefs');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={Colors.text.inverse} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headline}>What do you play?</Text>
        <Text style={styles.subhead}>Select all that apply</Text>
      </View>

      {/* Sport grid */}
      <View style={styles.grid}>
        {SPORT_GRID.map((sport) => {
          const isSelected = selected.has(sport.id);
          return (
            <TouchableOpacity
              key={sport.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                isSelected && { borderColor: sport.color },
              ]}
              onPress={() => toggle(sport.id)}
              activeOpacity={0.8}
            >
              {/* Color dot indicator when selected */}
              {isSelected && (
                <View style={[styles.selectedDot, { backgroundColor: sport.color }]} />
              )}
              <Text style={styles.chipEmoji}>{sport.emoji}</Text>
              <Text style={[styles.chipLabel, isSelected && { color: Colors.text.inverse }]}>
                {sport.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.88}>
          <Text style={styles.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>

        {selected.size === 0 && (
          <Text style={styles.skipHint}>You can always change this in your profile</Text>
        )}

        <ProgressDots total={4} current={2} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    paddingHorizontal: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    paddingTop: Spacing.base,
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
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignContent: 'flex-start',
  },
  chip: {
    width: '31%', // 3 columns with gap
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    borderRadius: Radius.xl,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: Spacing.xs,
    position: 'relative',
  },
  chipSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipEmoji: {
    fontSize: 28,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  bottom: {
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.xl,
    gap: Spacing.base,
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
