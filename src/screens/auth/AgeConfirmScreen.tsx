// AgeConfirmScreen — one-time age gate before a user can create or join runs.
//
// Flow:
//   VenueDetailScreen detects profile.age_confirmed === false
//   → navigate('AgeConfirm', { pendingCreateRun: params })
//   → user checks box + taps Confirm
//   → confirmAge() sets profiles.age_confirmed = true in Supabase + refreshes profile
//   → navigation.replace('CreateRun', pendingCreateRun) — no extra back-stack entry

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';
import { RootStackParamList } from '../../navigation/types';
import { useAuthContext } from '../../context/AuthContext';

type RouteType = RouteProp<RootStackParamList, 'AgeConfirm'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function AgeConfirmScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();
  const { pendingCreateRun } = route.params;
  const { confirmAge } = useAuthContext();

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!checked) return;
    setLoading(true);
    setError(null);
    const err = await confirmAge();
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    // Replace this screen with CreateRun — no extra entry in the back-stack
    navigation.replace('CreateRun', pendingCreateRun);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Age Confirmation</Text>
        <View style={styles.closeBtn} />
      </View>

      <View style={styles.body}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={48} color={Colors.accent.orange} />
        </View>

        <Text style={styles.title}>One quick step</Text>
        <Text style={styles.subtitle}>
          Pick-Up's run and social features are intended for users aged 16 and older.
          You only need to confirm this once.
        </Text>

        {/* Checkbox row */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setChecked((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkLabel}>
            I confirm that I am at least{' '}
            <Text style={styles.checkLabelBold}>16 years old</Text>
          </Text>
        </TouchableOpacity>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.confirmBtn, (!checked || loading) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.88}
          disabled={!checked || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              <Text style={styles.confirmBtnText}>Confirm &amp; Continue</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          This is a lightweight self-attestation. Full identity verification is not required at this stage.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
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

  body: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    gap: Spacing.lg,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: FontSize.base * 1.55,
    textAlign: 'center',
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    backgroundColor: Colors.bg.sheetCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent.orange,
    borderColor: Colors.accent.orange,
  },
  checkLabel: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    lineHeight: FontSize.base * 1.4,
  },
  checkLabelBold: {
    fontWeight: FontWeight.bold,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(220,38,38,0.07)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#DC2626',
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent.orange,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },

  disclaimer: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: FontSize.xs * 1.5,
    paddingBottom: Platform.OS === 'ios' ? Spacing.sm : 0,
  },
});
