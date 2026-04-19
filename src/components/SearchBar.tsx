// SearchBar — map overlay search input
// Positioned at the top of the map screen
// Clean, rounded, with shadow to lift above map

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { FontSize } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  onFocus,
  onClear,
  placeholder = 'Search venues, sports, locations...',
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={17} color={Colors.text.tertiary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.tertiary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} activeOpacity={0.7} style={styles.clearBtn}>
          <Ionicons name="close-circle" size={17} color={Colors.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.select({ ios: Spacing.sm + 2, android: Spacing.xs }),
    ...Shadow.lg,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    padding: 0,
  },
  clearBtn: {
    marginLeft: Spacing.xs,
    padding: Spacing.xs,
  },
});
