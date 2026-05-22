import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { UserProfile } from '../types/user';

interface AvatarProps {
  user?: UserProfile | null;
  size?: number;
}

export function Avatar({ user, size = 48 }: AvatarProps) {
  const initials = (user?.username || 'VB').slice(0, 2).toUpperCase();

  return (
    <LinearGradient
      colors={user?.gender === 'female' ? [colors.coral, colors.violet] : [colors.cyan, colors.neonBlue]}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.34) }]}>{initials}</Text>
    </LinearGradient>
  );
}

export function PulseDot({ online }: { online: boolean }) {
  return (
    <View style={[styles.dotWrap, online ? styles.onlineGlow : styles.offlineGlow]}>
      <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.danger }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '900',
  },
  dotWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  onlineGlow: {
    backgroundColor: 'rgba(52,211,153,0.18)',
  },
  offlineGlow: {
    backgroundColor: 'rgba(251,113,133,0.18)',
  },
});
