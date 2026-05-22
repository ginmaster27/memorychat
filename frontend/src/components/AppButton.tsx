import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

interface AppButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

export function AppButton({ children, onPress, variant = 'primary', disabled, style }: AppButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const handlePress = async () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    onPress();
  };

  const content = typeof children === 'string' ? <Text style={styles.text}>{children}</Text> : children;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && styles.disabled, style]}>
      <Pressable onPress={handlePress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled}>
        {variant === 'primary' ? (
          <LinearGradient colors={[colors.violet, colors.neonBlue, colors.cyan]} style={styles.button}>
            {content}
          </LinearGradient>
        ) : (
          <Animated.View style={[styles.button, variant === 'danger' ? styles.danger : styles.ghost]}>{content}</Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  ghost: {
    backgroundColor: colors.glass,
  },
  danger: {
    backgroundColor: 'rgba(251,113,133,0.16)',
    borderColor: 'rgba(251,113,133,0.38)',
  },
  disabled: {
    opacity: 0.45,
  },
});
