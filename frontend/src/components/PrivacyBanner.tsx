import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

export function PrivacyBanner() {
  return (
    <View style={styles.banner}>
      <ShieldCheck size={16} color={colors.cyan} />
      <Text style={styles.text}>Session only. Close to erase.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(34,211,238,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
});
