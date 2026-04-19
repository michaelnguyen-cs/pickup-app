// DetailInfoRow — labeled info row for venue/run detail screens
// Clean two-column layout: icon + label on left, value on right

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Spacing } from '../constants/spacing';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface DetailInfoRowProps {
  icon: IoniconsName;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}

export function DetailInfoRow({ icon, label, value, valueColor, isLast }: DetailInfoRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Ionicons name={icon} size={16} color={Colors.text.tertiary} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : undefined]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    width: 90,
    fontWeight: FontWeight.medium,
  },
  value: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    fontWeight: FontWeight.medium,
    textAlign: 'right',
  },
});
