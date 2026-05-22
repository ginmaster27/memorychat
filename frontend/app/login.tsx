import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { CheckCircle2, Chrome, LockKeyhole, MessageCircle, Sparkles, TimerReset, UsersRound } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { AppButton } from '../src/components/AppButton';
import { PrivacyBanner } from '../src/components/PrivacyBanner';
import { saveSessionSnapshot } from '../src/services/sessionSnapshot';
import { connectSocket } from '../src/services/socket';
import { useAuthStore } from '../src/store/authStore';
import { useChatStore } from '../src/store/chatStore';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';
import { UserGender } from '../src/types/user';

const USERNAME_WORDS = ['river', 'cedar', 'ember', 'atlas', 'nova', 'harbor', 'meadow', 'summit', 'willow', 'orbit'];
const BLOCKED_WORDS = ['admin', 'system', 'support', 'fuck', 'shit', 'bitch', 'asshole', 'nigger', 'nigga', 'faggot', 'retard'];
const GOOGLE_CLIENT_ID_PLACEHOLDER = 'missing-google-client-id.apps.googleusercontent.com';
const logo = require('../assets/logo.png');

function latestAdultDob() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().slice(0, 10);
}

function randomUsername() {
  const word = USERNAME_WORDS[Math.floor(Math.random() * USERNAME_WORDS.length)];
  return `${word}_${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function validateUsername(value: string) {
  if (!/^[a-z0-9_]{3,20}$/.test(value)) return 'Use 3-20 letters, numbers, or underscores.';
  if (BLOCKED_WORDS.some((word) => value.includes(word))) return 'Choose a different username.';
  return null;
}

function getRedirectUri() {
  if (Platform.OS === 'web') {
    return (globalThis as unknown as { location?: { origin?: string } }).location?.origin || 'http://localhost:8081';
  }

  return makeRedirectUri({ scheme: 'vibly' });
}

export default function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const setOnlineUsers = useChatStore((state) => state.setOnlineUsers);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState(latestAdultDob());
  const [username, setUsername] = useState(randomUsername());
  const [gender, setGender] = useState<UserGender>('male');
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const adultMax = useMemo(() => latestAdultDob(), []);
  const redirectUri = useMemo(() => getRedirectUri(), []);
  const googleClientId = useMemo(() => {
    if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }, []);
  const isGoogleConfigured = Boolean(googleClientId && !googleClientId.startsWith('your-google-'));

  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID_PLACEHOLDER,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_CLIENT_ID_PLACEHOLDER,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_CLIENT_ID_PLACEHOLDER,
    redirectUri,
  });

  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 6500 }), -1, true);
  }, [drift]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * 24 }, { translateX: drift.value * -18 }],
  }));

  useEffect(() => {
    if (response?.type === 'success') {
      setIdToken(response.params.id_token || null);
      setError(null);
    }
  }, [response, setError]);

  const handleGoogle = async () => {
    if (!isGoogleConfigured) {
      setError('Add your Google OAuth client id to frontend/.env, then restart Expo.');
      return;
    }
    if (Platform.OS !== 'web') await Haptics.selectionAsync();
    await promptAsync();
  };

  const enterChat = async () => {
    const usernameError = validateUsername(username);
    if (!idToken) {
      setError('Sign in with Google first.');
      return;
    }
    if (usernameError) {
      setError(usernameError);
      return;
    }
    if (!acceptedLegal) {
      setError('Confirm the age requirement and agree to Vibly’s legal policies before entering chat.');
      return;
    }

    try {
      setLoading(true);
      const { profile, onlineUsers } = await connectSocket({
        idToken,
        dateOfBirth,
        username,
        gender,
      });
      saveSessionSnapshot({
        profile,
        payload: {
          idToken,
          dateOfBirth,
          username,
          gender,
        },
      });
      setSession(profile, idToken);
      setOnlineUsers(onlineUsers.filter((user) => user.id !== profile.id));
      router.replace('/conversations');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Login failed');
    }
  };

  return (
    <LinearGradient colors={[colors.bg, '#121225', colors.bg]} style={styles.screen}>
      <Animated.View entering={FadeIn.duration(700)} style={[styles.orb, styles.orbA, orbStyle]} />
      <Animated.View entering={FadeIn.duration(900)} style={[styles.orb, styles.orbB]} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.brand}>
            <View style={styles.logo}>
              <Image source={logo} style={styles.logoImage} contentFit="contain" />
            </View>
            <View>
              <Text style={styles.brandText}>Vibly</Text>
              <Text style={styles.brandTagline}>Chat. Feel. Fade</Text>
            </View>
          </Animated.View>
          <PrivacyBanner />
        </View>

        <View style={styles.columns}>
          <Animated.View entering={FadeInDown.delay(80).springify().damping(16)} style={styles.leftColumn}>
            <Text style={styles.eyebrow}>Private live messaging</Text>
            <Text style={styles.title}>Vibly is messaging that feels lighter.</Text>
            <Text style={styles.subtitle}>
              Not every conversation needs to become history. Vibly is built around the idea that moments are meant to be experienced, not stored forever. Chats stay alive while they matter and disappear when you decide to move on.
            </Text>
            <Text style={styles.statement}>Private. Fast. Present.</Text>
            <Text style={styles.supporting}>
              A place where conversations feel more like real life and less like permanent records.
            </Text>

            <View style={styles.featureGrid}>
              <View style={styles.featureCard}>
                <LockKeyhole color={colors.cyan} size={20} />
                <Text style={styles.featureTitle}>Live by design</Text>
                <Text style={styles.featureText}>Messages live in active app memory, not in history.</Text>
              </View>
              <View style={styles.featureCard}>
                <TimerReset color={colors.coral} size={20} />
                <Text style={styles.featureTitle}>Close to erase</Text>
                <Text style={styles.featureText}>Ending a chat wipes that room from the session.</Text>
              </View>
              <View style={styles.featureCard}>
                <UsersRound color={colors.violet} size={20} />
                <Text style={styles.featureTitle}>Online people only</Text>
                <Text style={styles.featureText}>Start conversations with people currently active.</Text>
              </View>
              <View style={styles.featureCard}>
                <Sparkles color={colors.neonBlue} size={20} />
                <Text style={styles.featureTitle}>Feel lighter</Text>
                <Text style={styles.featureText}>Your public identity is a username, not your email.</Text>
              </View>
            </View>

            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <LockKeyhole color={colors.cyan} size={16} />
                <Text style={styles.trustText}>No archive</Text>
              </View>
              <View style={styles.trustItem}>
                <TimerReset color={colors.coral} size={16} />
                <Text style={styles.trustText}>No recovery</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).springify().damping(16)} style={styles.rightColumn}>
            <View style={styles.messagePreview}>
              <View style={[styles.previewBubble, styles.previewIncoming]}>
                <MessageCircle color={colors.cyan} size={18} />
                <Text style={styles.previewText}>You there?</Text>
              </View>
              <View style={[styles.previewBubble, styles.previewOutgoing]}>
                <Text style={styles.previewTextStrong}>Only while this room is open.</Text>
              </View>
              <View style={[styles.previewBubble, styles.previewIncoming]}>
                <TimerReset color={colors.coral} size={18} />
                <Text style={styles.previewText}>Close to erase.</Text>
              </View>
            </View>

            <View style={styles.panel}>
              {!idToken ? (
                <>
                  <Text style={styles.panelTitle}>Enter Vibly</Text>
                  <Text style={styles.panelText}>Continue with Google to verify this session. Your email stays private.</Text>
                  <AppButton onPress={handleGoogle} variant="ghost">
                    <View style={styles.googleContent}>
                      <Chrome color={colors.text} size={20} />
                      <Text style={styles.googleText}>Continue with Google</Text>
                    </View>
                  </AppButton>
                  {!isGoogleConfigured ? (
                    <Text style={styles.help}>
                      Missing Google client id for {Platform.OS}. Update frontend/.env and restart Expo.
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={styles.connected}>
                    <CheckCircle2 color={colors.success} size={18} />
                    <Text style={styles.connectedText}>Google connected. Create your public chat identity.</Text>
                  </View>
                  <View style={styles.formRow}>
                    <Text style={styles.label}>Legal date of birth</Text>
                    <TextInput value={dateOfBirth} onChangeText={setDateOfBirth} style={styles.input} placeholder={adultMax} placeholderTextColor={colors.subtle} />
                    <Text style={styles.help}>Latest allowed date: {adultMax}</Text>
                  </View>
                  <View style={styles.formRow}>
                    <Text style={styles.label}>Public username</Text>
                    <TextInput value={username} onChangeText={(value) => setUsername(normalizeUsername(value))} style={styles.input} placeholder="river_1234" placeholderTextColor={colors.subtle} autoCapitalize="none" />
                  </View>
                  <View style={styles.genderRow}>
                    {(['male', 'female'] as UserGender[]).map((item) => (
                      <AppButton key={item} onPress={() => setGender(item)} variant={gender === item ? 'primary' : 'ghost'} style={styles.genderButton}>
                        <Text style={styles.googleText}>{item}</Text>
                      </AppButton>
                    ))}
                  </View>

                  <View style={styles.safetyNotice}>
                    <Text style={styles.safetyNoticeText}>
                      Vibly is for lawful, respectful conversations only. Illegal, exploitative, harmful, or abusive use is prohibited and may result in account termination and reporting where required by law.
                    </Text>
                  </View>

                  <Pressable style={styles.checkboxRow} onPress={() => setAcceptedLegal((value) => !value)}>
                    <View style={[styles.checkbox, acceptedLegal && styles.checkboxChecked]}>
                      {acceptedLegal ? <Text style={styles.checkboxMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.checkboxText}>
                      I confirm I am at least 18 years old, or the minimum age required in my country, and I agree to the{' '}
                      <Text style={styles.inlineLink} onPress={() => router.push('/terms-of-service')}>Terms of Service</Text>
                      ,{' '}
                      <Text style={styles.inlineLink} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
                      , and{' '}
                      <Text style={styles.inlineLink} onPress={() => router.push('/acceptable-use-policy')}>Acceptable Use Policy</Text>.
                    </Text>
                  </Pressable>

                  <AppButton onPress={enterChat} disabled={isLoading || !acceptedLegal}>
                    {isLoading ? 'Opening room...' : 'Enter Chat'}
                  </AppButton>
                </>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </Animated.View>
        </View>

        <View style={styles.footerLinks}>
          <Text style={styles.footerLink} onPress={() => router.push('/privacy-policy')}>Privacy Policy</Text>
          <Text style={styles.footerDot}>•</Text>
          <Text style={styles.footerLink} onPress={() => router.push('/terms-of-service')}>Terms</Text>
          <Text style={styles.footerDot}>•</Text>
          <Text style={styles.footerLink} onPress={() => router.push('/acceptable-use-policy')}>Acceptable Use</Text>
          <Text style={styles.footerDot}>•</Text>
          <Text style={styles.footerLink} onPress={() => router.push('/legal')}>Legal</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    minHeight: '100%',
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.28,
  },
  orbA: { top: 70, right: -70, backgroundColor: colors.violet },
  orbB: { bottom: 80, left: -90, backgroundColor: colors.cyan },
  topBar: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandText: { color: colors.text, fontSize: 22, fontWeight: '900' },
  brandTagline: { color: colors.cyan, fontSize: 12, fontWeight: '900', marginTop: 2 },
  columns: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  leftColumn: {
    flex: 1.08,
    minWidth: 320,
    gap: spacing.lg,
  },
  rightColumn: {
    flex: 0.92,
    minWidth: 340,
    gap: spacing.lg,
  },
  messagePreview: {
    minHeight: 180,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  previewBubble: {
    maxWidth: '88%',
    minHeight: 48,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewIncoming: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewOutgoing: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(37,99,235,0.48)',
  },
  previewText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  previewTextStrong: { color: colors.white, fontSize: 16, fontWeight: '900' },
  eyebrow: { color: colors.cyan, fontWeight: '900', textTransform: 'uppercase', fontSize: 12 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.muted, lineHeight: 26 },
  statement: { color: colors.text, fontSize: 22, fontWeight: '900' },
  supporting: { color: colors.muted, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  featureTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  featureText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trustText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  panel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  panelText: { color: colors.muted, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  googleText: { color: colors.text, fontWeight: '900', textTransform: 'capitalize' },
  connected: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.22)',
    padding: spacing.md,
  },
  connectedText: { color: colors.text, fontWeight: '800', flex: 1 },
  formRow: { gap: spacing.xs },
  label: { color: colors.text, fontWeight: '800' },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glass,
  },
  help: { color: colors.subtle, fontSize: 12, fontWeight: '700' },
  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderButton: { flex: 1 },
  safetyNotice: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.30)',
    backgroundColor: 'rgba(139,92,246,0.12)',
    padding: spacing.md,
  },
  safetyNoticeText: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  checkboxMark: { color: colors.white, fontSize: 15, fontWeight: '900' },
  checkboxText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  inlineLink: { color: colors.cyan, fontWeight: '900' },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  footerLink: { color: colors.cyan, fontSize: 13, fontWeight: '900' },
  footerDot: { color: colors.subtle, fontSize: 13, fontWeight: '900' },
  error: { color: colors.coral, fontWeight: '800', textAlign: 'center' },
});
