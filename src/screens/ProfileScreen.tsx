// ProfileScreen — user preferences and settings
// No social profile, no followers, no stats
// Just: sports preferences, skill level, radius, notifications

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SportChip } from '../components/SportChip';
import { SPORTS } from '../constants/sports';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';
import { SkillLevel } from '../data/types';
import { SportId } from '../constants/sports';
import { useAuthContext } from '../context/AuthContext';
import { usePrefsContext } from '../context/PrefsContext';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SKILL_LEVELS: Array<{ id: SkillLevel; label: string; description: string }> = [
  { id: 'beginner', label: 'Beginner', description: 'New to the sport' },
  { id: 'casual', label: 'Casual', description: 'Play for fun' },
  { id: 'intermediate', label: 'Intermediate', description: 'Competitive but friendly' },
  { id: 'competitive', label: 'Competitive', description: 'Here to win' },
];

const RADIUS_OPTIONS = [1, 3, 5, 10, 25];

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, profile, signOut } = useAuthContext();
  const { prefs, completeOnboarding } = usePrefsContext();

  const [radiusMiles, setRadiusMiles] = useState(5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const toggleSport = (sportId: SportId) => {
    const next = prefs.sports.includes(sportId)
      ? prefs.sports.filter((s) => s !== sportId)
      : [...prefs.sports, sportId];
    completeOnboarding({ ...prefs, sports: next });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Preferences</Text>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            We use these to personalize what you see nearby.
          </Text>
        </View>

        {/* ── Auth section ───────────────────────────────────────────── */}
        {user ? (
          // Signed in — show account info
          <View style={styles.authCard}>
            <View style={styles.authAvatar}>
              <Ionicons name="person" size={22} color={Colors.accent.orange} />
            </View>
            <View style={styles.authInfo}>
              <Text style={styles.authName} numberOfLines={1}>
                {profile?.full_name ?? profile?.username ?? 'Pick-Up Player'}
              </Text>
              <Text style={styles.authEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        ) : (
          // Not signed in — prompt to sign in
          <View style={styles.anonSection}>
            <Text style={styles.anonTitle}>Save venues & track games</Text>
            <Text style={styles.anonSubtitle}>
              Sign in to bookmark spots, mark attendance, and sync your preferences.
            </Text>
            <View style={styles.anonBtns}>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => navigation.navigate('SignIn')}
                activeOpacity={0.88}
              >
                <Text style={styles.signInBtnText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => navigation.navigate('SignUp')}
                activeOpacity={0.88}
              >
                <Text style={styles.createBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Sports ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Sports</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.sportGrid}>
            {SPORTS.map((sport) => (
              <SportChip
                key={sport.id}
                sport={sport}
                isActive={prefs.sports.includes(sport.id)}
                onPress={() => toggleSport(sport.id)}
              />
            ))}
          </View>
        </View>

        {/* ── Skill Level ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Level</Text>
          <Text style={styles.sectionSubtitle}>Used to match you with runs at your level</Text>
          <View style={styles.skillGrid}>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.skillCard,
                  prefs.skillLevel === level.id && styles.skillCardActive,
                ]}
                onPress={() => completeOnboarding({ ...prefs, skillLevel: level.id })}
                activeOpacity={0.85}
              >
                <Text style={[styles.skillLabel, prefs.skillLevel === level.id && styles.skillLabelActive]}>
                  {level.label}
                </Text>
                <Text style={[styles.skillDesc, prefs.skillLevel === level.id && styles.skillDescActive]}>
                  {level.description}
                </Text>
                {prefs.skillLevel === level.id && (
                  <View style={styles.skillCheck}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.accent.orange} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Search Radius ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Radius</Text>
          <Text style={styles.sectionSubtitle}>How far to look for venues and runs</Text>
          <Text style={styles.deviceOnlyNote}>Saved on this device only</Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, radiusMiles === r && styles.radiusChipActive]}
                onPress={() => setRadiusMiles(r)}
              >
                <Text style={[styles.radiusText, radiusMiles === r && styles.radiusTextActive]}>
                  {r} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Notifications ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.deviceOnlyNote}>Saved on this device only</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Nearby activity alerts</Text>
              <Text style={styles.settingDesc}>Get notified when a run is starting near you</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.border.medium, true: Colors.accent.orange }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* ── App settings ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          {[
            { label: 'Share Pick-Up', icon: 'share-outline' as const },
            { label: 'Send Feedback', icon: 'chatbubble-outline' as const },
            { label: 'About', icon: 'information-circle-outline' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.appRow}
              onPress={() => Alert.alert(item.label, 'Coming soon!')}
              activeOpacity={0.85}
            >
              <Ionicons name={item.icon} size={18} color={Colors.text.secondary} />
              <Text style={styles.appRowText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ))}
          {user && (
            <TouchableOpacity
              style={[styles.appRow, styles.signOutRow]}
              onPress={handleSignOut}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
          {user?.email === process.env.EXPO_PUBLIC_ADMIN_EMAIL && (
            <TouchableOpacity
              style={styles.appRow}
              onPress={() => navigation.navigate('AdminCandidateReview')}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-outline" size={18} color={Colors.text.secondary} />
              <Text style={styles.appRowText}>Candidate Review</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.sheetCard,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.bg.sheet,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.bg.sheet,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: -Spacing.xs,
  },
  deviceOnlyNote: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: -Spacing.xs,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  skillGrid: {
    gap: Spacing.sm,
  },
  skillCard: {
    borderRadius: Radius.xl,
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
  skillLabelActive: {
    color: Colors.accent.orange,
  },
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
  radiusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  radiusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.sheetCard,
  },
  radiusChipActive: {
    backgroundColor: Colors.accent.orange,
    borderColor: Colors.accent.orange,
  },
  radiusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
  },
  radiusTextActive: {
    color: '#FFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  settingDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  appRowText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  signOutRow: {
    borderBottomWidth: 0,
  },
  signOutText: {
    flex: 1,
    fontSize: FontSize.base,
    color: '#DC2626',
    fontWeight: FontWeight.semibold,
  },

  // Auth section — shown when not signed in
  anonSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.bg.sheet,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  anonTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  anonSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: FontSize.sm * 1.5,
    marginTop: -Spacing.xs,
  },
  anonBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  signInBtn: {
    flex: 1,
    backgroundColor: Colors.accent.orange,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  signInBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  createBtn: {
    flex: 1,
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  createBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },

  // Auth section — shown when signed in
  authCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.bg.sheet,
    marginTop: Spacing.sm,
  },
  authAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authInfo: {
    flex: 1,
    gap: 2,
  },
  authName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  authEmail: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
});
