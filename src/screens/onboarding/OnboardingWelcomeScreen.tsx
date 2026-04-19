// OnboardingWelcomeScreen — first impression, zero friction
// Dark full-screen surface consistent with the app's map aesthetic
// Single CTA: "Get Started" → goes to location permission screen

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Shared progress dots — used across all 4 onboarding screens
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={dotsStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[dotsStyles.dot, i === current && dotsStyles.dotActive]}
        />
      ))}
    </View>
  );
}

const dotsStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.accent.orange,
    borderRadius: 3,
  },
});

export function OnboardingWelcomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top spacer */}
      <View style={styles.top} />

      {/* Hero content */}
      <View style={styles.hero}>
        <Text style={styles.sportEmojis}>🏀⚽🏐</Text>
        <Text style={styles.appName}>Pick-Up</Text>
        <Text style={styles.tagline}>Find pickup games{'\n'}near you.</Text>
        <Text style={styles.body}>
          Discover open gyms, recurring runs, and venues in your city. No sign-ups, no feeds — just games.
        </Text>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('OnboardingLocation')}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>

        <ProgressDots total={4} current={0} />
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
  top: {
    flex: 1,
  },
  hero: {
    flex: 3,
    justifyContent: 'center',
    gap: Spacing.base,
  },
  sportEmojis: {
    fontSize: 48,
    letterSpacing: 8,
  },
  appName: {
    fontSize: FontSize.xxxl + 8, // 42
    fontWeight: FontWeight.extrabold,
    color: Colors.accent.orange,
    letterSpacing: -1,
    marginTop: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text.inverse,
    lineHeight: FontSize.xxl * 1.25,
  },
  body: {
    fontSize: FontSize.base,
    color: Colors.text.inverseSecondary,
    lineHeight: FontSize.base * 1.6,
  },
  bottom: {
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : Spacing.xl,
    gap: Spacing.xl,
  },
  ctaBtn: {
    backgroundColor: Colors.accent.orange,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base + 2,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
