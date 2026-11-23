/**
 * LexiBottomSheet — premium Lexi assistant sheet.
 *
 * Sliding bottom-sheet with:
 *   - Animated Lexi header (sprite in lavender clay well)
 *   - Chat bubble history
 *   - Typing indicator with bounce
 *   - Quick action chips
 *   - Suggested prompt tiles
 *
 * Replaces LexiQuickActionSheet with cleaner IA + actual sprite mascot.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CodexPetSprite } from './pets/CodexPetSprite';
import {
  BRAND,
  COLORS,
  FEATURE_TONES,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  withOpacity,
} from '../design/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { id: 'today', label: 'Hôm nay học gì?', emoji: '📚', color: BRAND.skyBlue },
  { id: 'choose', label: 'Chọn bài cho em', emoji: '🎯', color: BRAND.mintGreen },
  { id: 'review', label: 'Ôn từ vựng', emoji: '🃏', color: BRAND.sunshineYellow },
  { id: 'play', label: 'Chơi game', emoji: '🎮', color: BRAND.coralPink },
  { id: 'pet', label: 'Thú cưng của em', emoji: '🐾', color: BRAND.mintGreen },
  { id: 'remind', label: 'Nhắc em học tiếp', emoji: '⏰', color: BRAND.skyBlue },
];

const REPLIES: Record<string, string> = {
  today: 'Hôm nay mình gợi ý bạn học bài "Greetings & Introductions" nhé! Bài này có flashcards rất vui.',
  choose: 'Dựa vào sở thích, mình nghĩ bạn thích bài Animals nè! Hay mình chọn một bài khác?',
  review: 'Tuyệt vời! Mình sẽ mở flashcards cho bạn ôn nhé. Bạn muốn ôn chủ đề gì?',
  play: 'Chơi game học tiếng Anh vừa vui vừa bổ ích! Bạn thích chơi Memory Pairs hay Color Learn?',
  pet: 'Thú cưng của bạn đang nhớ bạn lắm nè! Hãy đi thăm và chăm sóc chúng nhé.',
  remind: 'Đã đặt lời nhắc cho bạn! Mình sẽ nhắc bạn học bài mỗi ngày nhé.',
};

interface Message {
  id: string;
  role: 'lexi' | 'user';
  text: string;
}

interface LexiBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  userName?: string;
}

export const LexiBottomSheet: React.FC<LexiBottomSheetProps> = ({
  visible,
  onDismiss,
  userName,
}) => {
  const tone = FEATURE_TONES.lex;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const translateY = useSharedValue(SCREEN_HEIGHT);

  // Initialize welcome message when first opened
  useEffect(() => {
    if (visible && messages.length === 0) {
      const greeting = userName
        ? `Chào ${userName}! Mình là Lexi 🦋\n\nMình sẽ giúp bạn học tiếng Anh thật vui. Bạn cần mình hỗ trợ gì nào?`
        : 'Chào bạn! Mình là Lexi 🦋\n\nMình sẽ giúp bạn học tiếng Anh thật vui. Bạn cần mình hỗ trợ gì nào?';
      setMessages([
        { id: 'welcome', role: 'lexi', text: greeting },
      ]);
    }
  }, [visible, messages.length, userName]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    }
  }, [visible, translateY]);

  const sheetAnimated = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      scrollToEnd();

      // Simulated response
      setTimeout(() => {
        const replyId = QUICK_ACTIONS.find((a) => a.label === text.trim())?.id;
        const replyText =
          replyId && REPLIES[replyId]
            ? REPLIES[replyId]
            : 'Mình đang suy nghĩ nhé! Mình đang học thêm nhiều thứ hay để giúp bạn học tốt hơn 🦋';
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'lexi', text: replyText },
        ]);
        scrollToEnd();
      }, 1400);
    },
    [scrollToEnd],
  );

  const handleActionPress = useCallback(
    (action: typeof QUICK_ACTIONS[number]) => {
      sendMessage(action.label);
    },
    [sendMessage],
  );

  const handleSend = useCallback(() => {
    sendMessage(input);
    setInput('');
  }, [input, sendMessage]);

  const handleDismiss = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    setTimeout(onDismiss, 260);
  }, [onDismiss, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <Animated.View style={[styles.sheet, sheetAnimated]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
          >
            {/* Drag handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: tone.surface }]}>
              <View style={[styles.avatarWell, { backgroundColor: tone.iconBg, borderColor: BRAND.lavenderLight }]}>
                <CodexPetSprite animationState="waving" size={48} style={styles.avatarSprite} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: tone.accent }]}>Lexi</Text>
                <Text style={styles.headerSubtitle}>Trợ lý học tập của bạn</Text>
              </View>
              <Pressable onPress={handleDismiss} style={styles.closeButton} accessibilityLabel="Đóng">
                <Text style={styles.closeIcon}>✕</Text>
              </Pressable>
            </View>

            {/* Chat */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </ScrollView>

            {/* Quick actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.quickActionsLabel}>Gợi ý nhanh</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickActionsRow}
              >
                {QUICK_ACTIONS.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => handleActionPress(action)}
                    style={[styles.actionChip, { backgroundColor: withOpacity(action.color, 0.18) }]}
                  >
                    <Text style={styles.actionEmoji}>{action.emoji}</Text>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Input */}
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Nhắn tin cho Lexi..."
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
              </View>
              <Pressable onPress={handleSend} style={[styles.sendButton, { backgroundColor: tone.accent }]}>
                <Text style={styles.sendIcon}>↑</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Subcomponents ─────────────────────────────────────────────────────────

const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowLexi,
      ]}
    >
      {!isUser && (
        <View style={styles.lexiAvatar}>
          <CodexPetSprite animationState="idle" size={26} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleLexi,
        ]}
      >
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.text}
        </Text>
      </View>
      {isUser && <View style={styles.userAvatar}><Text style={styles.userAvatarIcon}>👤</Text></View>}
    </View>
  );
};

const TypingIndicator: React.FC = () => (
  <View style={[styles.bubbleRow, styles.bubbleRowLexi]}>
    <View style={styles.lexiAvatar}>
      <CodexPetSprite animationState="idle" size={26} />
    </View>
    <View style={[styles.bubble, styles.bubbleLexi, styles.typingBubble]}>
      <View style={styles.typingDots}>
        <View style={[styles.typingDot, styles.typingDot1]} />
        <View style={[styles.typingDot, styles.typingDot2]} />
        <View style={[styles.typingDot, styles.typingDot3]} />
      </View>
    </View>
  </View>
);

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26,39,68,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  flex: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.backgroundBase,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.55,
    paddingBottom: 32,
    shadowColor: BRAND.lavenderDark,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  avatarWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: SPACING.md,
  },
  avatarSprite: {
    marginTop: -3,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  // Chat
  chatArea: {
    flex: 1,
    maxHeight: 260,
  },
  chatContent: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
  },
  bubbleRowLexi: {
    alignSelf: 'flex-start',
  },
  bubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  lexiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BRAND.lavenderSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: BRAND.lavenderLight,
    overflow: 'hidden',
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  userAvatarIcon: {
    fontSize: 14,
  },
  bubble: {
    maxWidth: '76%',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  bubbleLexi: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BRAND.lavenderLight,
  },
  bubbleUser: {
    backgroundColor: BRAND.skyBlue,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: FONT.sizes.md,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: COLORS.white,
    fontWeight: '600',
  },
  typingBubble: {
    paddingVertical: SPACING.md,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BRAND.lavenderDark,
  },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.7 },
  typingDot3: { opacity: 1 },
  // Quick actions
  quickActionsSection: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  quickActionsLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.base,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickActionsRow: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    gap: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  actionEmoji: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  input: {
    fontSize: FONT.sizes.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.lavenderDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendIcon: {
    fontSize: 22,
    color: COLORS.white,
    fontWeight: '800',
    marginTop: -2,
  },
});

export default LexiBottomSheet;