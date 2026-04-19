// ChatPreviewCard — utility group chat entry point
// Minimal: shows room label, member count, last message preview
// No social feed vibes — purely for coordination

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatRoom } from '../data/types';
import { Colors } from '../constants/colors';
import { FontSize, FontWeight } from '../constants/typography';
import { Radius, Shadow, Spacing } from '../constants/spacing';
import { formatRelativeTime } from '../utils/formatting';

interface ChatPreviewCardProps {
  room: ChatRoom;
  onPress?: () => void;
}

export function ChatPreviewCard({ room, onPress }: ChatPreviewCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="chatbubbles-outline" size={20} color={Colors.accent.orange} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.label} numberOfLines={1}>
            {room.label}
          </Text>
          {room.lastMessageAt && (
            <Text style={styles.time}>{formatRelativeTime(room.lastMessageAt)}</Text>
          )}
        </View>
        {room.lastMessage && (
          <Text style={styles.preview} numberOfLines={1}>
            {room.lastMessage}
          </Text>
        )}
        <View style={styles.footer}>
          <Ionicons name="people-outline" size={12} color={Colors.text.tertiary} />
          <Text style={styles.memberCount}>{room.memberCount} in chat</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.sheet,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent.orangeSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
    flex: 1,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },
  preview: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  memberCount: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
  },
});
