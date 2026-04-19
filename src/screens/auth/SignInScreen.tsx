// SignInScreen — email + password sign in
// Presented as a bottom modal sheet from the Profile tab (or any auth-gated action).
// On success: session is set in AuthContext, modal dismisses automatically.
// Error messages are shown inline (not Alert.alert).

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthContext } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/types';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SignInScreen() {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const errorMsg = await signIn(email, password);
    if (errorMsg) {
      setError(errorMsg);
      setLoading(false);
    } else {
      // Auth state change fires in AuthContext — just dismiss
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Sign In</Text>
        <View style={styles.closeBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Sign in to save venues, track games, and mark your attendance.
          </Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.text.tertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
          </View>

          {/* Inline error */}
          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.88}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.ctaText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Switch to sign up */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.7}
            >
              <Text style={styles.switchLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.sheet,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  body: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    lineHeight: FontSize.base * 1.5,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  input: {
    backgroundColor: Colors.bg.sheetCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.light,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text.primary,
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
  ctaBtn: {
    backgroundColor: Colors.accent.orange,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base + 2,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  ctaBtnDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  switchText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  switchLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.accent.orange,
  },
});
