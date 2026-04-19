// OnboardingLocationScreen — explains location use and requests permission
//
// Triggers the actual expo-location permission request on "Enable Location".
// "Skip" navigates forward without granting — app gracefully falls back to mock distances.
// The LocationProvider in App.tsx also requests permission on mount, but doing it
// here gives the user context before the system dialog appears.

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
import * as Location from 'expo-location';

import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';
import { ProgressDots } from './OnboardingWelcomeScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function OnboardingLocationScreen() {
  const navigation = useNavigation<Nav>();
  const [requesting, setRequesting] = useState(false);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      // Request permission — system dialog will appear on first call
      await Location.requestForegroundPermissionsAsync();
      // LocationProvider in App.tsx handles the actual coordinate streaming
      // Here we just need the dialog to fire with context visible to the user
    } catch {
      // Permission request failed — proceed anyway
    } finally {
      setRequesting(false);
      navigation.navigate('OnboardingSports');
    }
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingSports');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={Colors.text.inverse} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="location" size={52} color={Colors.accent.orange} />
        </View>

        <Text style={styles.headline}>How far are{'\n'}you willing to go?</Text>
        <Text style={styles.body}>
          Pick-Up uses your location to show real distances, sort nearby venues, and filter what's open right now.
        </Text>
        <Text style={styles.note}>
          Your location is never shared or stored on a server.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.ctaBtn, requesting && styles.ctaBtnDisabled]}
          onPress={handleEnable}
          activeOpacity={0.88}
          disabled={requesting}
        >
          <Ionicons name="locate" size={16} color="#FFF" />
          <Text style={styles.ctaText}>
            {requesting ? 'Requesting...' : 'Enable Location'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <ProgressDots total={4} current={1} />
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
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.base,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.accent.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.inverse,
    lineHeight: FontSize.xxl * 1.25,
  },
  body: {
    fontSize: FontSize.base,
    color: Colors.text.inverseSecondary,
    lineHeight: FontSize.base * 1.6,
  },
  note: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: FontSize.sm * 1.5,
    marginTop: Spacing.xs,
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
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: FontWeight.medium,
  },
});
