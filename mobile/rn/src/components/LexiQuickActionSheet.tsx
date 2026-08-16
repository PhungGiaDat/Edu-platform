/**
 * LexiQuickActionSheet — bottom-sheet-style chat panel for Lexi chatbot.
 *
 * Shows a friendly greeting from Lexi + suggested quick-action tiles.
 * Designed as a shell/placeholder that can be extended with a real AI backend.
 *
 * States:
 * - default: greeting + quick actions
 * - empty: no messages
 * - loading: while "thinking"
 * - error: if something fails
 *
 * Usage:
 *   <LexiQuickActionSheet
 *     visible={lexiVisible}
 *     onDismiss={() => setLexiVisible(false)}
 *     onActionPress={(action) => handleAction(action)}
 *   />
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, BRAND, SHADOWS, SPACING, RADIUS } from '../design/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuickAction {
  id: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'learn-today',
    label: 'Hôm nay học gì?',
    emoji: '📚',
    color: BRAND.skyBlue,
    description: 'Xem bài học được gợi ý',
  },
  {
    id: 'choose-lesson',
    label: 'Giúp em chọn bài học',
    emoji: '🎯',
    color: BRAND.mintGreen,
    description: 'Tìm bài phù hợp với em',
  },
  {
    id: 'review-vocab',
    label: 'Ôn từ vựng',
    emoji: '🃏',
    color: BRAND.sunshineYellow,
    description: 'Luyện tập flashcards',
  },
  {
    id: 'play-games',
    label: 'Chơi game',
    emoji: '🎮',
    color: BRAND.coralPink,
    description: 'Học mà chơi, chơi mà học',
  },
  {
    id: 'visit-pets',
    label: 'Thú cưng của em',
    emoji: '🐾',
    color: BRAND.mintGreen,
    description: 'Chăm sóc thú cưng',
  },
  {
    id: 'remind-me',
    label: 'Nhắc em học tiếp',
    emoji: '⏰',
    color: BRAND.skyBlue,
    description: 'Đặt lời nhắc học bài',
  },
];

interface LexiMessage {
  id: string;
  role: 'lexi' | 'user';
  text: string;
  time: Date;
}

interface LexiQuickActionSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onActionPress?: (action: QuickAction) => void;
}

const ActionTile: React.FC<{
  action: QuickAction;
  onPress: (action: QuickAction) => void;
}> = ({ action, onPress }) => (
  <Pressable
    onPress={() => onPress(action)}
    style={({ pressed }) => [
      styles.actionTile,
      { backgroundColor: action.color },
      pressed && styles.actionTilePressed,
    ]}
  >
    <Text style={styles.actionEmoji}>{action.emoji}</Text>
    <Text style={styles.actionLabel} numberOfLines={2}>
      {action.label}
    </Text>
  </Pressable>
);

const ChatBubble: React.FC<{ message: LexiMessage; isUser: boolean }> = ({
  message,
  isUser,
}) => (
  <View
    style={[
      styles.chatBubbleRow,
      isUser ? styles.chatBubbleRowUser : styles.chatBubbleRowLexi,
    ]}
  >
    {!isUser && (
      <View style={styles.lexiAvatar}>
        <Text style={styles.lexiAvatarEmoji}>🦋</Text>
      </View>
    )}
    <View
      style={[
        styles.chatBubble,
        isUser ? styles.chatBubbleUser : styles.chatBubbleLexi,
      ]}
    >
      <Text
        style={[styles.chatBubbleText, isUser && styles.chatBubbleTextUser]}
      >
        {message.text}
      </Text>
    </View>
    {isUser && (
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarEmoji}>👤</Text>
      </View>
    )}
  </View>
);

export const LexiQuickActionSheet: React.FC<LexiQuickActionSheetProps> = ({
  visible,
  onDismiss,
  onActionPress,
}) => {
  const [messages, setMessages] = React.useState<LexiMessage[]>([
    {
      id: 'welcome',
      role: 'lexi',
      text: 'Chào bạn! Mình là Lexi 🦋\n\nMình sẽ giúp bạn học tiếng Anh thật vui nhé! Bạn cần mình hỗ trợ gì nào?',
      time: new Date(),
    },
  ]);
  const [inputText, setInputText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);

  const translateY = useSharedValue(SCREEN_HEIGHT);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleActionPress = useCallback(
    (action: QuickAction) => {
      // Add user message
      const userMsg: LexiMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: action.label,
        time: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Lexi "thinking" state
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const lexireply: LexiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'lexi',
          text: getLexiReplyForAction(action.id),
          time: new Date(),
        };
        setMessages((prev) => [...prev, lexireply]);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 1200);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);

      onActionPress?.(action);
    },
    [onActionPress],
  );

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    const userMsg: LexiMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim(),
      time: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const lexireply: LexiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'lexi',
        text: 'Mình đang suy nghĩ nhé... Dạo này mình đang học thêm nhiều thứ hay ho để giúp bạn học tốt hơn! 🦋',
        time: new Date(),
      };
      setMessages((prev) => [...prev, lexireply]);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  }, [inputText]);

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
        {/* Backdrop press to dismiss */}
        <Pressable style={styles.backdrop} onPress={handleDismiss} />

        <Animated.View style={[styles.sheet, animatedStyle]}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLexiAvatar}>
              <Text style={styles.headerLexiEmoji}>🦋</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Lexi</Text>
              <Text style={styles.headerSubtitle}>Trợ lý học tập</Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Chat messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatArea}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isUser={msg.role === 'user'}
              />
            ))}
            {isTyping && (
              <View style={styles.typingRow}>
                <View style={styles.lexiAvatar}>
                  <Text style={styles.lexiAvatarEmoji}>🦋</Text>
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <View style={[styles.typingDot, styles.typingDot1]} />
                    <View style={[styles.typingDot, styles.typingDot2]} />
                    <View style={[styles.typingDot, styles.typingDot3]} />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsLabel}>Gợi ý nhanh</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <ActionTile
                  key={action.id}
                  action={action}
                  onPress={handleActionPress}
                />
              ))}
            </View>
          </View>

          {/* Text input */}
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputPlaceholder}>
                Nhắn tin cho Lexi...
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSend}
              style={styles.sendButton}
              activeOpacity={0.7}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

function getLexiReplyForAction(actionId: string): string {
  const replies: Record<string, string> = {
    'learn-today':
      'Hôm nay mình gợi ý bạn học bài "Greetings & Introductions" nhé! 📚 Bài này có flashcards rất vui!',
    'choose-lesson':
      'Dựa vào sở thích của bạn, mình nghĩ bạn sẽ thích bài về Animals nè! 🐾 Hay là mình chọn một bài khác?',
    'review-vocab':
      'Tuyệt vời! Mình sẽ mở flashcards cho bạn ôn từ nhé! 🃏 Bạn muốn ôn chủ đề gì?',
    'play-games':
      'Chơi game học tiếng Anh vừa vui vừa bổ ích! 🎮 Bạn thích chơi Memory Pairs hay Color Learn?',
    'visit-pets':
      'Thú cưng của bạn đang nhớ bạn lắm nè! 🐾 Hãy đi thăm và chăm sóc chúng nhé!',
    'remind-me':
      'Đã đặt lời nhắc cho bạn! ⏰ Mình sẽ nhắc bạn học bài mỗi ngày nhé!',
  };
  return replies[actionId] ?? 'Mình đang suy nghĩ nhé... 🦋';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: COLORS.backgroundBase,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingBottom: 34,
    ...SHADOWS.clayLg,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerLexiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD6FE',
    marginRight: SPACING.sm,
  },
  headerLexiEmoji: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  chatArea: {
    flex: 1,
    maxHeight: 220,
  },
  chatContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
  },
  chatBubbleRowLexi: {
    alignSelf: 'flex-start',
  },
  chatBubbleRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  lexiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  lexiAvatarEmoji: {
    fontSize: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.xs,
  },
  userAvatarEmoji: {
    fontSize: 14,
  },
  chatBubble: {
    maxWidth: '72%',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  chatBubbleLexi: {
    backgroundColor: '#F5F3FF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  chatBubbleUser: {
    backgroundColor: '#6EB9FF',
    borderBottomRightRadius: 4,
  },
  chatBubbleText: {
    fontSize: 14,
    color: '#1A2744',
    lineHeight: 20,
  },
  chatBubbleTextUser: {
    color: '#FFFFFF',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.xs,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  quickActionsSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  quickActionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionTile: {
    width: '47%',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.claySm,
  },
  actionTilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2744',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  inputPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.claySm,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
  },
  sendIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: -2,
  },
});

export default LexiQuickActionSheet;
