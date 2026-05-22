import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, PulseDot } from './Avatar';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { UserProfile } from '../types/user';

interface OnlineUserCardProps {
  user: UserProfile;
  onPress: () => void;
}

export const OnlineUserCard = memo(function OnlineUserCard({ user, onPress }: OnlineUserCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Avatar user={user} size={44} />
      <View style={styles.copy}>
        <Text style={styles.name}>@{user.username}</Text>
        <Text style={styles.caption}>Live now</Text>
      </View>
      <PulseDot online />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
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
  },
  name: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  caption: {
    color: colors.muted,
    fontWeight: '700',
    marginTop: 2,
  },
});
