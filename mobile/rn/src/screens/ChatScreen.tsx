/**
 * ChatScreen — Lexi Agentic RAG chat with model picker.
 *
 * Features:
 *   1. Session-aware RAG chat via POST /chat/rag
 *   2. Per-stage model picker (planner / generator / validator) via GET /chat/models
 *   3. Source chips from Qdrant retrieval (word relevance scores)
 *   4. Agent trace debug panel (collapsed by default)
 *   5. LexiAvatar animated sprite (reuse existing CodexPetSprite)
 *   6. Loading dots animation during AI response
 *   7. Pull-to-refresh resets conversation
 *
 * Accessible via "Lexi" tab in BottomTabs.
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  Modal,
  Pressable as RNPressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

type LexiSharedValue = { value: number };

import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { LexiOrb } from '../components/LexiOrb';
import { useAuth } from '../hooks/useAuth';
import { useChatSession } from '../hooks/useChatSession';
import { chatApi } from '../services/api';
import type {
  ChatMessage,
  ChatModelsResponse,
  ModelInfo,
  RAGChatResponse,
} from '../types/api';
import { BRAND, COLORS, FONT, RADIUS, SPACING, SHADOWS } from '../design/tokens';

// ─── Animated typing dots ───────────────────────────────────────────────────────
function TypingDots() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const delay = (n: number) => setTimeout(() => {
      if (n === 0) dot1.value = withSequence(withSpring(1), withSpring(0));
      if (n === 1) dot2.value = withSequence(withSpring(1), withSpring(0));
      if (n === 2) dot3.value = withSequence(withSpring(1), withSpring(0));
    }, n * 180);
    const t1 = delay(0), t2 = delay(1), t3 = delay(2);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const makeStyle = (v: LexiSharedValue) =>
    useAnimatedStyle(() => ({ opacity: v.value }));

  return (
    <View style={styles.typingDots}>
      {[dot1, dot2, dot3].map((v, i) => (
        <Animated.View key={i} style={[styles.dot, makeStyle(v)]} />
      ))}
    </View>
  );
}

// ─── Source chip ───────────────────────────────────────────────────────────────
function SourceChip({ word, score }: { word: string; score: number }) {
  return (
    <View style={styles.sourceChip}>
      <Text style={styles.sourceChipText}>{word}</Text>
      <Text style={styles.sourceChipScore}>{(score * 100).toFixed(0)}%</Text>
    </View>
  );
}

// ─── Agent trace row ───────────────────────────────────────────────────────────
function AgentTrace({ trace }: { trace: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.traceContainer}>
      <RNPressable onPress={() => setOpen((o) => !o)}>
        <Text style={styles.traceToggle}>{open ? '▲ Debug' : '▼ Debug'}</Text>
      </RNPressable>
      {open && trace.map((step, i) => (
        <Text key={i} style={styles.traceStep}>{step}</Text>
      ))}
    </View>
  );
}

// ─── Model picker modal ────────────────────────────────────────────────────────
interface ModelPickerProps {
  visible: boolean;
  models: ModelInfo[];
  defaults: Record<string, string>;
  selected: { planner: string; generator: string; validator: string };
  onSelect: (role: string, modelId: string) => void;
  onClose: () => void;
}

function ModelPickerModal({
  visible,
  models,
  defaults,
  selected,
  onSelect,
  onClose,
}: ModelPickerProps) {
  const roles: Array<{ key: string; label: string }> = [
    { key: 'planner', label: '🧠 Planner' },
    { key: 'generator', label: '⚡ Generator' },
    { key: 'validator', label: '✅ Validator' },
  ];
  const roleModels = (role: string) =>
    models.filter((m) => m.role === role);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <ClayCard style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn Model AI</Text>
            <RNPressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </RNPressable>
          </View>
          {roles.map(({ key, label }) => (
            <View key={key} style={styles.modelRoleSection}>
              <Text style={styles.modelRoleLabel}>{label}</Text>
              {roleModels(key).map((m) => {
                const isSelected = selected[key as keyof typeof selected] === m.id;
                return (
                  <RNPressable
                    key={m.id}
                    style={[styles.modelOption, isSelected && styles.modelOptionSelected]}
                    onPress={() => onSelect(key, m.id)}
                  >
                    <View>
                      <Text style={[styles.modelOptionName, isSelected && styles.modelOptionNameSelected]}>
                        {m.id.split('/').pop()}
                      </Text>
                      <Text style={styles.modelOptionDesc}>{m.description}</Text>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </RNPressable>
                );
              })}
            </View>
          ))}
          <ClayButton onPress={onClose} style={styles.modalDone}>Xong</ClayButton>
        </ClayCard>
      </View>
    </Modal>
  );
}

// ─── Chat bubble ───────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && <View style={styles.lexiAvatarSmall}><Text style={{ fontSize: 20 }}>🦊</Text></View>}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.content}</Text>
        {msg.sources && msg.sources.length > 0 && (
          <View style={styles.sourcesRow}>
            {msg.sources.map((s) => (
              <SourceChip key={s.word} word={s.word} score={s.score} />
            ))}
          </View>
        )}
        {msg.agentTrace && msg.agentTrace.length > 0 && (
          <AgentTrace trace={msg.agentTrace} />
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { sessionId, messages, isRestored, saveMessage, setSessionId, reset } = useChatSession();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Model picker state
  const [modelCatalog, setModelCatalog] = useState<ChatModelsResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState({ planner: '', generator: '', validator: '' });
  const [pickerVisible, setPickerVisible] = useState(false);

  const WELCOME: Omit<ChatMessage, 'id' | 'timestamp'> = {
    role: 'ai',
    content: 'Chào bạn! Mình là Lexi 🦊\nHỏi gì cũng được nha — từ động vật, từ vựng, đến ngữ pháp!',
  };

  // Fetch model catalog on mount
  useEffect(() => {
    chatApi.getModels().then((res) => {
      setModelCatalog(res.data);
      const d = res.data.defaults;
      setSelectedModels({ planner: d.planner, generator: d.generator, validator: d.validator });
    }).catch(() => {});
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);

    saveMessage({ role: 'user', content: text.trim() });

    try {
      const res = await chatApi.sendRAG({
        question: text.trim(),
        session_id: sessionId ?? undefined,
        planner_model: selectedModels.planner || undefined,
        generator_model: selectedModels.generator || undefined,
        validator_model: selectedModels.validator || undefined,
      });
      const data: RAGChatResponse = res.data;

      // Sync session ID
      if (!sessionId) setSessionId(data.session_id);

      saveMessage({
        role: 'ai',
        content: data.response,
        sources: data.sources,
        agentTrace: data.agent_trace,
      });
    } catch {
      saveMessage({
        role: 'ai',
        content: 'Xin lỗi bạn, mình chưa trả lời được lúc này. Thử lại nhé! 🙏',
      });
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, selectedModels, saveMessage, setSessionId]);

  const resetChat = useCallback(() => {
    reset();
    saveMessage(WELCOME);
  }, [reset, saveMessage, WELCOME]);

  const handleModelSelect = useCallback((role: string, modelId: string) => {
    setSelectedModels((prev) => ({ ...prev, [role]: modelId }));
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lexi 🦊</Text>
        <View style={styles.headerActions}>
          {modelCatalog && (
            <RNPressable
              style={styles.modelBadge}
              onPress={() => setPickerVisible(true)}
              testID="lexi-model-picker-btn"
            >
              <Text style={styles.modelBadgeText}>⚙️ Models</Text>
            </RNPressable>
          )}
        </View>
      </View>

      {/* Session restored banner */}
      {isRestored && messages.length > 1 && (
        <View style={styles.restoredBanner}>
          <Text style={styles.restoredBannerText}>💬 Phiên được khôi phục</Text>
        </View>
      )}

      {/* Message list */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={resetChat} />
        }
      >
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        {loading && (
          <View style={[styles.bubbleRow, styles.bubbleRowAI]}>
            <View style={styles.lexiAvatarSmall}><Text style={{ fontSize: 20 }}>🦊</Text></View>
            <View style={[styles.bubble, styles.bubbleAI]}>
              <TypingDots />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Hỏi Lexi điều gì đó..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
          blurOnSubmit={false}
          returnKeyType="send"
          testID="lexi-chat-input"
        />
        <RNPressable
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          testID="lexi-chat-send-btn"
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </RNPressable>
      </View>

      {/* Model picker modal */}
      {modelCatalog && (
        <ModelPickerModal
          visible={pickerVisible}
          models={modelCatalog.models}
          defaults={modelCatalog.defaults}
          selected={selectedModels}
          onSelect={handleModelSelect}
          onClose={() => setPickerVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modelBadge: {
    backgroundColor: COLORS.backgroundWash,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  modelBadgeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  messageList: {
    flex: 1,
  },
  restoredBanner: {
    backgroundColor: 'rgba(110,185,255,0.10)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  restoredBannerText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  messageListContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  bubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  bubbleRowAI: {},
  bubble: {
    maxWidth: '78%',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.claySm,
  },
  bubbleAI: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: SPACING.xs,
  },
  bubbleUser: {
    backgroundColor: BRAND.skyBlueLight,
    borderBottomRightRadius: SPACING.xs,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  bubbleTextUser: {
    color: COLORS.white,
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
    gap: 4,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundWash,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  sourceChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  sourceChipScore: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  traceContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: RADIUS.sm,
  },
  traceToggle: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  traceStep: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  lexiAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundWash,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.backgroundWash,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    maxHeight: 120,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.claySm,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  sendBtnText: {
    fontSize: 18,
    color: COLORS.white,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  modelRoleSection: {
    marginBottom: SPACING.lg,
  },
  modelRoleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  modelOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundWash,
    marginBottom: 4,
  },
  modelOptionSelected: {
    backgroundColor: 'rgba(110,185,255,0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modelOptionName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  modelOptionNameSelected: {
    color: COLORS.primary,
  },
  modelOptionDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.primary,
  },
  modalDone: {
    marginTop: SPACING.sm,
  },
});
