import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { Message } from '../types/message';
import { useMediaSettingsStore } from '../store/mediaSettingsStore';

interface ChatBubbleProps {
  message: Message;
  mine: boolean;
}

export const ChatBubble = memo(function ChatBubble({ message, mine }: ChatBubbleProps) {
  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);
  const [loadImage, setLoadImage] = useState(false);
  const autoDownloadImages = useMediaSettingsStore((state) => state.autoDownloadImages);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  useEffect(() => {
    if (message.kind !== 'image') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [message.kind]);

  const isExpired = message.media ? message.media.expiresAt <= now : false;
  const secondsLeft = message.media ? Math.max(0, Math.ceil((message.media.expiresAt - now) / 1000)) : 0;

  const inner = message.kind === 'image' && message.media ? (
    <Pressable style={styles.imageCard} onPress={() => setExpanded((value) => !value)}>
      {isExpired ? (
        <View style={styles.expired}>
          <Text style={styles.expiredText}>Image expired</Text>
        </View>
      ) : (
        autoDownloadImages || loadImage ? (
        <>
          <Image
            source={{ uri: expanded ? message.media.mediaUrl : message.media.thumbnail }}
            style={[styles.image, expanded && styles.imageExpanded]}
            contentFit="cover"
            transition={150}
          />
          <Text style={styles.expiry}>Expires in {secondsLeft}s</Text>
        </>
        ) : (
          <Pressable style={styles.expired} onPress={() => setLoadImage(true)}>
            <Text style={styles.expiredText}>Tap to load temporary image</Text>
          </Pressable>
        )
      )}
    </Pressable>
  ) : (
    <Text style={[styles.text, mine && styles.mineText]}>{message.content}</Text>
  );

  return (
    <Animated.View
      style={[
        styles.row,
        mine && styles.mineRow,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {mine ? (
        <LinearGradient colors={[colors.violet, colors.neonBlue]} style={styles.bubble}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.incoming]}>{inner}</View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  mineRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.bubble,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  incoming: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  mineText: {
    color: colors.white,
  },
  imageCard: {
    gap: spacing.xs,
  },
  image: {
    width: 220,
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  imageExpanded: {
    width: 280,
    height: 260,
  },
  expiry: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  expired: {
    width: 220,
    height: 120,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  expiredText: {
    color: colors.muted,
    fontWeight: '900',
  },
});
