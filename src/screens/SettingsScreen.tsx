// SettingsScreen — app-level device and permission settings
//
// Distinct from ProfileScreen (which holds sport/skill preferences).
// This screen covers OS-level concerns: location, notifications, privacy, app info.
// Modelled on the Instagram pattern: profile = your content/prefs, settings = device config.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Spacing } from '../constants/spacing';
import { useLocationContext } from '../context/LocationContext';

type SettingRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
};

function SettingRow({ icon, label, value, onPress, destructive }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={18} color={destructive ? '#DC2626' : Colors.text.secondary} />
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const { permissionStatus } = useLocationContext();

  const locationStatusLabel =
    permissionStatus === 'granted' ? 'Allowed' :
    permissionStatus === 'denied'  ? 'Denied'  : 'Not set';

  const locationStatusColor =
    permissionStatus === 'granted' ? Colors.accent.green :
    permissionStatus === 'denied'  ? Colors.accent.red   : Colors.text.tertiary;

  const openSystemSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Permissions ──────────────────────────────────────────────── */}
        <SectionHeader title="Permissions" />
        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.rowLabel}>Location</Text>
            <Text style={[styles.rowValue, { color: locationStatusColor }]}>
              {locationStatusLabel}
            </Text>
          </View>
          {permissionStatus !== 'granted' && (
            <SettingRow
              icon="open-outline"
              label="Open system settings to enable"
              onPress={openSystemSettings}
            />
          )}
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={18} color={Colors.text.secondary} />
            <Text style={styles.rowLabel}>Notifications</Text>
            <TouchableOpacity onPress={openSystemSettings} activeOpacity={0.7}>
              <Text style={styles.manageLink}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Privacy ──────────────────────────────────────────────────── */}
        <SectionHeader title="Privacy" />
        <View style={styles.section}>
          <SettingRow
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://pickupapp.io/privacy')}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://pickupapp.io/terms')}
          />
        </View>

        {/* ── About ────────────────────────────────────────────────────── */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <SettingRow icon="golf-outline" label="App" value="Pick-Up" />
          <SettingRow icon="code-slash-outline" label="Version" value="1.0.0" />
          <SettingRow
            icon="bug-outline"
            label="Report a bug"
            onPress={() => Linking.openURL('mailto:support@pickupapp.io')}
          />
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.sheetCard },

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
  backBtn: {
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

  sectionHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.bg.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border.light,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
  },
  rowLabelDestructive: {
    color: '#DC2626',
  },
  rowValue: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  manageLink: {
    fontSize: FontSize.sm,
    color: Colors.accent.orange,
    fontWeight: FontWeight.semibold,
  },
});
