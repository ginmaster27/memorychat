import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { legalPolicies } from '../src/legal/policies';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';

export default function LegalIndexScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.push('/login')}>
          <ChevronLeft color={colors.text} size={18} />
          <Text style={styles.backText}>Home</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Vibly Legal</Text>
          <Text style={styles.title}>Legal Center</Text>
          <Text style={styles.summary}>
            Read the policies that explain how Vibly works, what users are responsible for, and what conduct is not allowed.
          </Text>
        </View>

        <View style={styles.list}>
          {legalPolicies.map((policy) => (
            <Pressable key={policy.slug} style={styles.card} onPress={() => router.push(policy.slug as never)}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{policy.title}</Text>
                <Text style={styles.cardText}>{policy.summary}</Text>
              </View>
              <ChevronRight color={colors.cyan} size={20} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: { color: colors.text, fontWeight: '900' },
  hero: { gap: spacing.sm, paddingVertical: spacing.lg },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 42, lineHeight: 48, fontWeight: '900' },
  summary: { color: colors.muted, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  list: { gap: spacing.md },
  card: {
    minHeight: 104,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardCopy: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  cardText: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '700' },
});
