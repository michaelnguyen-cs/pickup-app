// DropInPin — map marker for drop-in / open-play venues.
// Blue distinguishes these from orange venue pins.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PIN_COLOR = '#3B82F6';

interface DropInPinProps {
  isActive?: boolean;
}

export const DropInPin = React.memo(function DropInPin({ isActive = false }: DropInPinProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.pin, isActive && styles.pinActive]}>
        <Text style={styles.emoji}>📅</Text>
      </View>
      <View style={[styles.tail, isActive && styles.tailActive]} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PIN_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinActive: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: PIN_COLOR,
  },
  emoji: { fontSize: 16 },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: PIN_COLOR,
    marginTop: -2,
  },
  tailActive: { borderTopColor: PIN_COLOR },
});
