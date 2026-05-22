import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { LegalPolicy } from '../legal/policies';

interface LegalLayoutProps {
  policy: LegalPolicy;
}

export function LegalLayout({ policy }: LegalLayoutProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.push('/legal')}>
          <ChevronLeft color={colors.text} size={18} />
          <Text style={styles.backText}>Legal</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Vibly Legal</Text>
          <Text style={styles.title}>{policy.title}</Text>
          <Text style={styles.summary}>{policy.summary}</Text>
          <Text style={styles.meta}>Effective date / Last updated: {policy.effectiveDate}</Text>
        </View>

        <View style={styles.toc}>
          <Text style={styles.tocTitle}>Contents</Text>
          {policy.sections.map((section) => (
            <Text key={section.id} style={styles.tocItem}>
              {section.title}
            </Text>
          ))}
        </View>

        <View style={styles.sections}>
          {policy.sections.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.body.map((paragraph) => (
                <Text key={paragraph} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.map((bullet) => (
                <Text key={bullet} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
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
  hero: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 40, lineHeight: 46, fontWeight: '900' },
  summary: { color: colors.muted, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  meta: { color: colors.subtle, fontSize: 13, fontWeight: '800' },
  toc: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tocTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: spacing.xs },
  tocItem: { color: colors.muted, fontSize: 14, lineHeight: 22, fontWeight: '700' },
  sections: { gap: spacing.md },
  section: {
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '900' },
  paragraph: { color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  bullet: { color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: '700' },
});
