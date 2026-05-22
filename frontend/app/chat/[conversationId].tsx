import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Flag, ImagePlus, Send, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, PulseDot } from '../../src/components/Avatar';
import { ChatBubble } from '../../src/components/ChatBubble';
import { PrivacyBanner } from '../../src/components/PrivacyBanner';
import { emitTyping, reportUser, sendMediaMessage, sendMessage } from '../../src/services/socket';
import { MEDIA_CONFIG } from '../../src/services/media/config';
import { pickAndUploadImage } from '../../src/services/upload/mediaUpload';
import { useAuthStore } from '../../src/store/authStore';
import { useChatStore } from '../../src/store/chatStore';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { Message } from '../../src/types/message';
import { ModerationResult, moderateMessage } from '../../src/utils/moderation';

type PendingModeration = {
  content: string;
  result: ModerationResult;
};

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const decodedId = decodeURIComponent(conversationId || '');
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCheckedStoredSession = useAuthStore((state) => state.hasCheckedStoredSession);
  const activeConversations = useChatStore((state) => state.activeConversations);
  const messagesByConversationId = useChatStore((state) => state.messagesByConversationId);
  const moderationByConversationId = useChatStore((state) => state.moderationByConversationId);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const closeConversation = useChatStore((state) => state.closeConversation);
  const markConversationRead = useChatStore((state) => state.markConversationRead);
  const recordModerationWarning = useChatStore((state) => state.recordModerationWarning);
  const recordModerationBlock = useChatStore((state) => state.recordModerationBlock);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [pendingModeration, setPendingModeration] = useState<PendingModeration | null>(null);
  const [blockedModeration, setBlockedModeration] = useState<ModerationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ stage: string; progress: number } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = useMemo(
    () => activeConversations.find((item) => item.id === decodedId),
    [activeConversations, decodedId],
  );
  const messages = messagesByConversationId[decodedId] || [];
  const moderationMetadata = moderationByConversationId[decodedId];
  const shouldShowSafetyReminder = (moderationMetadata?.warningCount || 0) >= 2;

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!conversation) {
      router.replace('/conversations');
      return;
    }
    markConversationRead(decodedId);
  }, [conversation?.id, decodedId, isAuthenticated, markConversationRead]);

  if (!hasCheckedStoredSession) return null;

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const updateDraft = (value: string) => {
    setDraft(value);
    if (!conversation) return;
    emitTyping(conversation.participantId, value.trim().length > 0);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(conversation.participantId, false), 1100);
  };

  const sendAllowedMessage = async (content: string) => {
    if (!content || !conversation || !user) return;
    if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const optimisticId = `message:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const optimistic: Message = {
      id: optimisticId,
      from: user,
      to: conversation.participantId,
      content,
      timestamp: Date.now(),
      delivered: false,
      status: 'sending',
    };

    setDraft('');
    setError(null);
    emitTyping(conversation.participantId, false);
    addMessage(conversation.id, optimistic, true);

    try {
      const result = await sendMessage({ recipientId: conversation.participantId, content });
      updateMessage(
        conversation.id,
        optimistic.id,
        {
          id: result.messageId || optimistic.id,
          delivered: result.delivered,
          status: result.delivered ? 'delivered' : 'sent',
        },
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send');
      updateMessage(conversation.id, optimistic.id, { status: 'failed' });
    }
  };

  const submit = async () => {
    const content = draft.trim();
    if (!content || !conversation || !user) return;

    const moderation = moderateMessage(content);
    if (moderation.action === 'block') {
      recordModerationBlock(conversation.id, moderation.categories, moderation.score);
      setBlockedModeration(moderation);
      setError(null);
      return;
    }

    if (moderation.action === 'warn') {
      recordModerationWarning(conversation.id, moderation.categories, moderation.score);
      setPendingModeration({ content, result: moderation });
      setError(null);
      return;
    }

    await sendAllowedMessage(content);
  };

  const sendPendingMessage = async () => {
    if (!pendingModeration) return;
    const content = pendingModeration.content;
    setPendingModeration(null);
    await sendAllowedMessage(content);
  };

  const sendImage = async () => {
    if (!conversation || !user || uploadProgress) return;
    const imageCount = messages.filter((message) => message.kind === 'image').length;
    if (imageCount >= MEDIA_CONFIG.maxImagesPerChat) {
      setError('Image limit reached for this chat.');
      return;
    }

    try {
      setError(null);
      const media = await pickAndUploadImage({
        senderId: user.id,
        chatId: conversation.id,
        onProgress: (stage, progress) => setUploadProgress({ stage, progress }),
      });
      if (!media) {
        setUploadProgress(null);
        return;
      }

      const optimisticId = `media:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const optimistic: Message = {
        id: optimisticId,
        from: user,
        to: conversation.participantId,
        content: '',
        kind: 'image',
        media,
        timestamp: Date.now(),
        delivered: false,
        status: 'sending',
      };
      addMessage(conversation.id, optimistic, true);
      const result = await sendMediaMessage({ recipientId: conversation.participantId, media });
      updateMessage(conversation.id, optimisticId, {
        id: result.messageId || optimisticId,
        delivered: result.delivered,
        status: result.delivered ? 'delivered' : 'sent',
      });
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Unable to send image');
    } finally {
      setUploadProgress(null);
    }
  };

  const closeRoom = async () => {
    if (!conversation) return;
    if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    closeConversation(conversation.id);
    router.replace('/conversations');
  };

  const submitReport = async (reason: 'illegal_content' | 'harassment_or_abuse' | 'spam_or_scam' | 'other_abuse') => {
    if (!conversation) return;
    if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const result = await reportUser({
        reportedUserId: conversation.participantId,
        reason,
      });
      setReportOpen(false);
      setReportStatus(result.actionTaken ? 'Report received. This user has been removed.' : 'Report received. Thank you for helping keep Vibly safer.');
      setError(null);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Unable to submit report');
    }
  };

  if (!conversation) return null;

  return (
    <LinearGradient colors={[colors.bg, colors.bg2]} style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={styles.header}>
            <View style={styles.profile}>
              <Avatar user={conversation.participantProfile} />
              <View style={styles.profileCopy}>
                <Text style={styles.name}>@{conversation.participantProfile.username}</Text>
                <Text style={styles.status}>
                  {conversation.isParticipantTyping
                    ? 'typing...'
                    : conversation.isParticipantOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
              <PulseDot online={conversation.isParticipantOnline} />
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton} onPress={() => setReportOpen((value) => !value)}>
                <Flag color={colors.coral} size={19} />
              </Pressable>
              <Pressable style={styles.iconButton} onPress={closeRoom}>
                <X color={colors.text} size={20} />
              </Pressable>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <PrivacyBanner />
          </View>

          {reportOpen ? (
            <View style={styles.reportPanel}>
              <Text style={styles.reportTitle}>Report @{conversation.participantProfile.username}</Text>
              <Text style={styles.reportText}>Report illegal content, unsafe requests, harassment, scams, or any abuse.</Text>
              <View style={styles.reportGrid}>
                <Pressable style={styles.reportOption} onPress={() => void submitReport('illegal_content')}>
                  <Text style={styles.reportOptionText}>Illegal content</Text>
                </Pressable>
                <Pressable style={styles.reportOption} onPress={() => void submitReport('harassment_or_abuse')}>
                  <Text style={styles.reportOptionText}>Harassment or abuse</Text>
                </Pressable>
                <Pressable style={styles.reportOption} onPress={() => void submitReport('spam_or_scam')}>
                  <Text style={styles.reportOptionText}>Spam or scam</Text>
                </Pressable>
                <Pressable style={styles.reportOption} onPress={() => void submitReport('other_abuse')}>
                  <Text style={styles.reportOptionText}>Other abuse</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            renderItem={({ item }) => <ChatBubble message={item} mine={item.from.id === user?.id} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Session only</Text>
                <Text style={styles.emptyText}>No history. No archive. Just now.</Text>
              </View>
            }
          />

          {reportStatus ? <Text style={styles.notice}>{reportStatus}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {shouldShowSafetyReminder ? (
            <View style={styles.safetyReminder}>
              <Text style={styles.safetyReminderText}>
                Reminder: Vibly chats are private by design, but unsafe or illegal conversations are not allowed.
              </Text>
            </View>
          ) : null}
          <Text style={styles.imageNotice}>
            Images are temporary and may disappear after expiration. Recipients may still save, screenshot, or capture content.
          </Text>
          {uploadProgress ? (
            <View style={styles.uploadProgress}>
              <Text style={styles.uploadText}>
                {uploadProgress.stage} {Math.round(uploadProgress.progress * 100)}%
              </Text>
            </View>
          ) : null}

          <View style={styles.composer}>
            <Pressable style={styles.imageButton} onPress={() => void sendImage()} disabled={Boolean(uploadProgress)}>
              <ImagePlus color={colors.cyan} size={20} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={updateDraft}
              placeholder="Message"
              placeholderTextColor={colors.subtle}
              multiline
              style={styles.input}
            />
            <Pressable style={[styles.send, !draft.trim() && styles.sendDisabled]} onPress={submit} disabled={!draft.trim()}>
              <Send color={colors.white} size={20} />
            </Pressable>
          </View>

          <Modal transparent animationType="fade" visible={Boolean(pendingModeration)} onRequestClose={() => setPendingModeration(null)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Safety reminder</Text>
                <Text style={styles.modalText}>
                  This message may violate Vibly’s safety rules. Sexual, exploitative, coercive, or illegal conversations are not allowed.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable style={[styles.modalButton, styles.modalSecondary]} onPress={() => setPendingModeration(null)}>
                    <Text style={styles.modalSecondaryText}>Edit message</Text>
                  </Pressable>
                  <Pressable style={[styles.modalButton, styles.modalPrimary]} onPress={() => void sendPendingMessage()}>
                    <Text style={styles.modalPrimaryText}>Send anyway</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          <Modal transparent animationType="fade" visible={Boolean(blockedModeration)} onRequestClose={() => setBlockedModeration(null)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Message blocked</Text>
                <Text style={styles.modalText}>
                  This content cannot be sent because it appears to involve underage, exploitative, illegal, or unsafe content.
                </Text>
                <Pressable style={[styles.modalButton, styles.modalPrimary]} onPress={() => setBlockedModeration(null)}>
                  <Text style={styles.modalPrimaryText}>Rewrite message</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  keyboard: {
    flex: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  profileCopy: { flex: 1 },
  name: { color: colors.text, fontSize: 18, fontWeight: '900' },
  status: { color: colors.muted, fontWeight: '700', marginTop: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: { paddingHorizontal: spacing.md },
  reportPanel: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.26)',
    backgroundColor: 'rgba(251,113,133,0.10)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  reportTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  reportText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reportOption: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.28)',
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  reportOptionText: { color: colors.text, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  messages: {
    flexGrow: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  emptyText: { color: colors.muted, fontWeight: '700' },
  notice: { color: colors.success, textAlign: 'center', fontWeight: '800', paddingHorizontal: spacing.md },
  error: { color: colors.coral, textAlign: 'center', fontWeight: '800', paddingHorizontal: spacing.md },
  safetyReminder: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.20)',
    backgroundColor: 'rgba(34,211,238,0.08)',
    padding: spacing.md,
  },
  safetyReminderText: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  imageNotice: {
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  uploadProgress: {
    marginHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.26)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  uploadText: { color: colors.text, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  composer: {
    margin: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neonBlue,
  },
  sendDisabled: { opacity: 0.45 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  modalText: { color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  modalPrimary: { backgroundColor: colors.neonBlue },
  modalSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  modalPrimaryText: { color: colors.white, fontWeight: '900' },
  modalSecondaryText: { color: colors.text, fontWeight: '900' },
});
