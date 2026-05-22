import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { LogOut, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/Avatar';
import { ConversationCard } from '../src/components/ConversationCard';
import { OnlineUserCard } from '../src/components/OnlineUserCard';
import { PrivacyBanner } from '../src/components/PrivacyBanner';
import { clearMediaCache } from '../src/services/cache/mediaCache';
import { logout } from '../src/services/auth';
import { useAuthStore } from '../src/store/authStore';
import { useChatStore } from '../src/store/chatStore';
import { useMediaSettingsStore } from '../src/store/mediaSettingsStore';
import { colors } from '../src/theme/colors';
import { radius, spacing } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';

export default function ConversationsScreen() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCheckedStoredSession = useAuthStore((state) => state.hasCheckedStoredSession);
  const activeConversations = useChatStore((state) => state.activeConversations);
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const messagesByConversationId = useChatStore((state) => state.messagesByConversationId);
  const startConversation = useChatStore((state) => state.startConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const autoDownloadImages = useMediaSettingsStore((state) => state.autoDownloadImages);
  const uploadOnWifiOnly = useMediaSettingsStore((state) => state.uploadOnWifiOnly);
  const toggleAutoDownloadImages = useMediaSettingsStore((state) => state.toggleAutoDownloadImages);
  const toggleUploadOnWifiOnly = useMediaSettingsStore((state) => state.toggleUploadOnWifiOnly);
  const activeCount = activeConversations.length;
  const greeting = useMemo(() => `Hi @${user?.username || 'there'}`, [user?.username]);

  if (!hasCheckedStoredSession) return null;

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const openConversation = async (conversationId: string) => {
    if (Platform.OS !== 'web') await Haptics.selectionAsync();
    selectConversation(conversationId);
    router.push(`/chat/${encodeURIComponent(conversationId)}`);
  };

  const openUser = async (targetUser: typeof onlineUsers[number]) => {
    if (Platform.OS !== 'web') await Haptics.selectionAsync();
    const conversationId = startConversation(targetUser);
    router.push(`/chat/${encodeURIComponent(conversationId)}`);
  };

  return (
    <LinearGradient colors={[colors.bg, colors.bg2]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Live Conversations</Text>
              <Text style={styles.title}>{greeting}</Text>
              <Text style={styles.subtitle}>Nothing stays unless the room is open.</Text>
            </View>
            <Pressable style={styles.avatarButton}>
              <Avatar user={user} size={56} />
            </Pressable>
          </View>

          <PrivacyBanner />

          <View style={styles.settingsPanel}>
            <Text style={styles.sectionTitle}>Media & Privacy</Text>
            <Pressable style={styles.settingRow} onPress={toggleAutoDownloadImages}>
              <Text style={styles.settingText}>Auto download images</Text>
              <Text style={styles.settingValue}>{autoDownloadImages ? 'On' : 'Off'}</Text>
            </Pressable>
            <Pressable style={styles.settingRow} onPress={toggleUploadOnWifiOnly}>
              <Text style={styles.settingText}>Upload on WiFi only</Text>
              <Text style={styles.settingValue}>{uploadOnWifiOnly ? 'On' : 'Off'}</Text>
            </Pressable>
            <Pressable style={styles.settingRow} onPress={clearMediaCache}>
              <Text style={styles.settingText}>Clear temporary cache</Text>
              <Text style={styles.settingValue}>Clear</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active chats</Text>
            <Text style={styles.sectionMeta}>{activeCount}</Text>
          </View>
          {activeConversations.length === 0 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.emptyCard}>
              <Sparkles color={colors.cyan} size={32} />
              <Text style={styles.emptyTitle}>Nothing stays. Start a live conversation.</Text>
              <Text style={styles.emptyText}>When you close a room, its messages vanish from memory.</Text>
            </Animated.View>
          ) : (
            <FlatList
              data={activeConversations}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <ConversationCard
                  conversation={item}
                  preview={messagesByConversationId[item.id]?.[messagesByConversationId[item.id].length - 1]?.content}
                  onPress={() => void openConversation(item.id)}
                />
              )}
            />
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Online now</Text>
            <Text style={styles.sectionMeta}>{onlineUsers.length}</Text>
          </View>
          <View style={styles.onlineList}>
            {onlineUsers.length === 0 ? <Text style={styles.emptyText}>No other live users yet.</Text> : null}
            {onlineUsers.map((onlineUser) => (
              <OnlineUserCard key={onlineUser.id} user={onlineUser} onPress={() => void openUser(onlineUser)} />
            ))}
          </View>

          <Pressable style={styles.logout} onPress={logout}>
            <LogOut color={colors.coral} size={18} />
            <Text style={styles.logoutText}>Logout and erase session</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontWeight: '900', marginBottom: spacing.xs },
  title: { ...typography.heading, color: colors.text },
  subtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  avatarButton: {
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionMeta: { color: colors.muted, fontWeight: '900' },
  horizontalList: { gap: spacing.md, paddingRight: spacing.lg },
  onlineList: { gap: spacing.md },
  settingsPanel: {
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  settingRow: {
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  settingText: { color: colors.text, fontWeight: '800' },
  settingValue: { color: colors.cyan, fontWeight: '900' },
  emptyCard: {
    minHeight: 180,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  emptyText: { color: colors.muted, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  logout: {
    minHeight: 58,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.24)',
    backgroundColor: 'rgba(251,113,133,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logoutText: { color: colors.coral, fontWeight: '900' },
});
