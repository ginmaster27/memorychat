import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, PulseDot } from './Avatar';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { Conversation } from '../types/conversation';

interface ConversationCardProps {
  conversation: Conversation;
  preview?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const ConversationCard = memo(function ConversationCard({
  conversation,
  preview,
  onPress,
  onLongPress,
}: ConversationCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress}>
      <Avatar user={conversation.participantProfile} />
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>@{conversation.participantProfile.username}</Text>
          <PulseDot online={conversation.isParticipantOnline} />
        </View>
        <Text numberOfLines={1} style={styles.preview}>
          {conversation.isParticipantTyping ? 'typing...' : preview || 'Nothing stays unless the room is open.'}
        </Text>
      </View>
      {conversation.unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 250,
    minHeight: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  preview: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
  },
});
