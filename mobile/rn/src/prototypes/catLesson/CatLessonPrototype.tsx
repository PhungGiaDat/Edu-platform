import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';

import { ClayButton } from '../../components/ClayButton';
import { ClayCard } from '../../components/ClayCard';
import { ClayIcon } from '../../components/icons/ClayIcons';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  withOpacity,
} from '../../design/tokens';
import {
  catLessonPrototypeFixture,
  type CatPrototypeAnimal,
  type CatPrototypeAnimalId,
  type CatPrototypeBlock,
} from './catLessonFixture';

const fixture = catLessonPrototypeFixture;
const learningBlockCount = fixture.blocks.length - 1;
const lexiSpritesheet = require('../../../assets/pets/lexi/spritesheet.webp');
const lexiCellAspect = 192 / 208;

type FeedbackState = 'idle' | 'correct' | 'incorrect';

function PrototypeLexi({ size = 72, row = 0 }: { size?: number; row?: number }) {
  const height = size / lexiCellAspect;
  return (
    <View
      accessibilityLabel="Lexi"
      accessibilityRole="image"
      style={{ width: size, height, overflow: 'hidden' }}
    >
      <Image
        source={lexiSpritesheet}
        resizeMode="stretch"
        fadeDuration={0}
        style={{
          position: 'absolute',
          width: size * 8,
          height: height * 9,
          left: 0,
          top: -(height * row),
        }}
      />
    </View>
  );
}

function usePrototypeAudio() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(async (source?: number) => {
    if (!source) return;
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
    const onStatus = (status: AVPlaybackStatus) => {
      if (!status.isLoaded || status.didJustFinish) setIsPlaying(false);
    };
    const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true }, onStatus);
    soundRef.current = sound;
    setIsPlaying(true);
  }, []);

  useEffect(() => () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) void sound.unloadAsync().catch(() => undefined);
  }, []);

  return { isPlaying, play };
}

function LessonHeader({ stepIndex, onBack }: { stepIndex: number; onBack: () => void }) {
  const visibleStep = Math.min(stepIndex + 1, learningBlockCount);
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại bước trước"
          disabled={stepIndex === 0}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            stepIndex === 0 && styles.backButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <ClayIcon name="arrowLeft" size={22} color={BRAND.deepSlate} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{fixture.title}</Text>
          <Text style={styles.headerProgressLabel}>{visibleStep} of {learningBlockCount}</Text>
        </View>
        <View style={styles.headerStar}>
          <ClayIcon name="star" size={21} color={BRAND.sunshineYellowDark} />
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(visibleStep / learningBlockCount) * 100}%` }]} />
      </View>
    </View>
  );
}

function BlockHeading({ block, hint }: { block: CatPrototypeBlock; hint: string }) {
  return (
    <View style={styles.blockHeading}>
      <Text style={styles.eyebrow}>{block.eyebrow}</Text>
      <Text style={styles.blockTitle}>{block.title}</Text>
      <Text style={styles.blockHint}>{hint}</Text>
    </View>
  );
}

function AudioButton({ source, label = 'Play “Cat”' }: { source?: number; label?: string }) {
  const { isPlaying, play } = usePrototypeAudio();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => void play(source)}
      style={({ pressed }) => [styles.audioButton, pressed && styles.pressed]}
    >
      <View style={styles.audioIcon}>
        <ClayIcon name={isPlaying ? 'pause' : 'play'} size={20} color={BRAND.skyBlueDark} />
      </View>
      <Text style={styles.audioLabel}>{isPlaying ? 'Playing…' : label}</Text>
    </Pressable>
  );
}

function Feedback({ state, correct, incorrect }: { state: FeedbackState; correct: string; incorrect: string }) {
  if (state === 'idle') return <View style={styles.feedbackSpacer} />;
  const isCorrect = state === 'correct';
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.feedback, isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}
    >
      <ClayIcon name={isCorrect ? 'check' : 'refresh'} size={20} color={isCorrect ? BRAND.mintGreenDark : BRAND.coralPinkDark} />
      <Text style={[styles.feedbackText, { color: isCorrect ? BRAND.mintGreenDark : BRAND.coralPinkDark }]}>
        {isCorrect ? correct : incorrect}
      </Text>
    </View>
  );
}

function AnimalChoice({
  animal,
  selected,
  matched = false,
  showWord = true,
  onPress,
  accessibilityPrefix = 'Chọn',
}: {
  animal: CatPrototypeAnimal;
  selected: boolean;
  matched?: boolean;
  showWord?: boolean;
  onPress: () => void;
  accessibilityPrefix?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityPrefix} ${animal.wordEn}`}
      accessibilityState={{ selected, disabled: matched }}
      disabled={matched}
      onPress={onPress}
      style={({ pressed }) => [
        styles.animalChoice,
        selected && styles.choiceSelected,
        matched && styles.choiceMatched,
        pressed && styles.pressed,
      ]}
    >
      <Image source={animal.illustration} style={styles.choiceImage} resizeMode="cover" />
      {showWord ? <Text style={styles.choiceWord}>{animal.wordEn}</Text> : null}
      {matched ? (
        <View style={styles.matchCheck}>
          <ClayIcon name="check" size={15} color={COLORS.white} />
        </View>
      ) : null}
    </Pressable>
  );
}

function WarmUpBlock({ block, onComplete }: { block: CatPrototypeBlock; onComplete: () => void }) {
  const cat = fixture.animals.cat;
  return (
    <View testID="cat-prototype-warm-up" style={styles.blockRoot}>
      <View style={styles.mascotRow}>
        <View style={styles.mascotWell}>
          <PrototypeLexi size={72} row={3} />
        </View>
        <View style={styles.speechBubble}>
          <Text style={styles.speechName}>LEXI</Text>
          <Text style={styles.speechText}>Today we’re meeting a soft, curious animal!</Text>
        </View>
      </View>
      <ClayCard variant="xl" color="cream" padding={12} style={styles.heroCard}>
        <View style={styles.heroHalo} />
        <Image source={cat.illustration} style={styles.heroImage} resizeMode="cover" />
      </ClayCard>
      <BlockHeading block={block} hint="Look, listen, and say hello." />
      <AudioButton source={cat.pronunciationAudio} />
      <ClayButton variant="lg" color="yellow" style={styles.primaryCta} onPress={onComplete}>Bắt đầu học</ClayButton>
    </View>
  );
}

function VocabularyBlock({ block, onComplete }: { block: CatPrototypeBlock; onComplete: () => void }) {
  const cat = fixture.animals.cat;
  return (
    <View testID="cat-prototype-vocabulary" style={styles.blockRoot}>
      <BlockHeading block={block} hint="Tap the sound and say it with Lexi." />
      <ClayCard variant="xl" color="white" padding={14} style={styles.vocabCard}>
        <Image source={cat.illustration} style={styles.vocabImage} resizeMode="cover" />
        <Text style={styles.vocabWord}>{cat.wordEn}</Text>
        <Text style={styles.vocabTranslation}>{cat.wordVi}</Text>
        <View style={styles.sentencePill}>
          <Text style={styles.sentenceText}>{cat.sentence}</Text>
        </View>
      </ClayCard>
      <AudioButton source={cat.pronunciationAudio} label="Nghe lại từ Cat" />
      <ClayButton variant="lg" color="blue" style={styles.primaryCta} onPress={onComplete}>Tiếp tục</ClayButton>
    </View>
  );
}

function ListenChooseBlock({ block, onComplete }: { block: CatPrototypeBlock; onComplete: () => void }) {
  const [selectedId, setSelectedId] = useState<CatPrototypeAnimalId | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const cat = fixture.animals.cat;
  const optionIds: CatPrototypeAnimalId[] = ['dog', 'cat', 'bird'];

  const choose = (id: CatPrototypeAnimalId) => {
    setSelectedId(id);
    setFeedback(id === fixture.focusAnimalId ? 'correct' : 'incorrect');
  };

  return (
    <View testID="cat-prototype-listen" style={styles.blockRoot}>
      <BlockHeading block={block} hint="Listen carefully, then tap the right animal." />
      <AudioButton source={cat.pronunciationAudio} label="Nghe âm thanh" />
      <View style={styles.choiceRow}>
        {optionIds.map((id) => (
          <AnimalChoice
            key={id}
            animal={fixture.animals[id]}
            selected={selectedId === id}
            showWord={feedback === 'correct'}
            onPress={() => choose(id)}
          />
        ))}
      </View>
      <Feedback
        state={feedback}
        correct="Yes! You found Cat."
        incorrect="Not this one. Listen again and find Cat."
      />
      <ClayButton variant="lg" color="blue" style={styles.primaryCta} disabled={feedback !== 'correct'} onPress={onComplete}>
        Tiếp tục
      </ClayButton>
    </View>
  );
}

function MatchBlock({ block, onComplete }: { block: CatPrototypeBlock; onComplete: () => void }) {
  const ids: CatPrototypeAnimalId[] = ['cat', 'dog', 'bird'];
  const wordIds: CatPrototypeAnimalId[] = ['bird', 'cat', 'dog'];
  const [selectedImage, setSelectedImage] = useState<CatPrototypeAnimalId | null>(null);
  const [matchedIds, setMatchedIds] = useState<CatPrototypeAnimalId[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');

  const selectWord = (id: CatPrototypeAnimalId) => {
    if (!selectedImage) return;
    if (selectedImage === id) {
      setMatchedIds((current) => [...current, id]);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
    setSelectedImage(null);
  };

  return (
    <View testID="cat-prototype-match" style={styles.blockRoot}>
      <BlockHeading block={block} hint="Tap a picture, then tap its English word." />
      <Text style={styles.microProgress}>{matchedIds.length} / {ids.length} pairs</Text>
      <View style={styles.matchImages}>
        {ids.map((id) => (
          <AnimalChoice
            key={id}
            animal={fixture.animals[id]}
            selected={selectedImage === id}
            matched={matchedIds.includes(id)}
            showWord={false}
            accessibilityPrefix="Chọn hình"
            onPress={() => {
              setSelectedImage(id);
              setFeedback('idle');
            }}
          />
        ))}
      </View>
      <View style={styles.wordGrid}>
        {wordIds.map((id) => {
          const matched = matchedIds.includes(id);
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Ghép từ ${fixture.animals[id].wordEn}`}
              accessibilityState={{ disabled: matched }}
              disabled={matched}
              onPress={() => selectWord(id)}
              style={({ pressed }) => [
                styles.wordChip,
                matched && styles.wordChipMatched,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.wordChipText, matched && styles.wordChipTextMatched]}>
                {fixture.animals[id].wordEn}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Feedback state={feedback} correct="Great match!" incorrect="Those two are different. Try again." />
      <ClayButton variant="lg" color="green" style={styles.primaryCta} disabled={matchedIds.length !== ids.length} onPress={onComplete}>
        Hoàn thành Match
      </ClayButton>
    </View>
  );
}

interface MemoryCardData {
  id: string;
  animalId: CatPrototypeAnimalId;
  kind: 'image' | 'word';
}

const memoryCards: MemoryCardData[] = [
  { id: 'cat-word', animalId: 'cat', kind: 'word' },
  { id: 'dog-image', animalId: 'dog', kind: 'image' },
  { id: 'bird-word', animalId: 'bird', kind: 'word' },
  { id: 'cat-image', animalId: 'cat', kind: 'image' },
  { id: 'bird-image', animalId: 'bird', kind: 'image' },
  { id: 'dog-word', animalId: 'dog', kind: 'word' },
];

function MemoryMatchBlock({ block, onComplete }: { block: CatPrototypeBlock; onComplete: () => void }) {
  const [revealed, setRevealed] = useState<string[]>([]);
  const [matched, setMatched] = useState<CatPrototypeAnimalId[]>([]);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [locked, setLocked] = useState(false);

  const flip = (card: MemoryCardData) => {
    if (locked || revealed.includes(card.id) || matched.includes(card.animalId)) return;
    const next = [...revealed, card.id];
    setRevealed(next);
    if (next.length !== 2) return;

    setMoves((value) => value + 1);
    const [first, second] = next.map((id) => memoryCards.find((item) => item.id === id)!);
    if (first.animalId === second.animalId && first.kind !== second.kind) {
      setMatched((current) => [...current, first.animalId]);
      setRevealed([]);
      setFeedback('correct');
      return;
    }

    setLocked(true);
    setFeedback('incorrect');
    setTimeout(() => {
      setRevealed([]);
      setLocked(false);
    }, 500);
  };

  return (
    <View testID="cat-prototype-memory" style={styles.blockRoot}>
      <BlockHeading block={block} hint="Find each picture and word pair." />
      <View style={styles.gameStats}>
        <Text style={styles.gameStat}>Pairs {matched.length}/3</Text>
        <Text style={styles.gameStat}>Moves {moves}</Text>
      </View>
      <View style={styles.memoryGrid}>
        {memoryCards.map((card) => {
          const isMatched = matched.includes(card.animalId);
          const isRevealed = revealed.includes(card.id) || isMatched;
          const animal = fixture.animals[card.animalId];
          return (
            <Pressable
              key={card.id}
              testID={`memory-card-${card.id}`}
              accessibilityRole="button"
              accessibilityLabel={isRevealed ? `${animal.wordEn} ${card.kind}` : `Lật thẻ ${card.id}`}
              accessibilityState={{ disabled: isMatched }}
              disabled={isMatched}
              onPress={() => flip(card)}
              style={({ pressed }) => [
                styles.memoryCard,
                isRevealed && styles.memoryCardRevealed,
                isMatched && styles.memoryCardMatched,
                pressed && styles.pressed,
              ]}
            >
              {isRevealed ? (
                card.kind === 'image' ? (
                  <Image source={animal.illustration} style={styles.memoryImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.memoryWord}>{animal.wordEn}</Text>
                )
              ) : (
                <View style={styles.cardBackIcon}>
                  <ClayIcon name="star" size={25} color={BRAND.sunshineYellowDark} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Feedback state={feedback} correct="Pair found! Keep going." incorrect="Almost! Remember where the cards are." />
      <ClayButton variant="lg" color="yellow" style={styles.primaryCta} disabled={matched.length !== 3} onPress={onComplete}>
        Tiếp tục tới Quiz
      </ClayButton>
    </View>
  );
}

function QuizOption({
  animal,
  mode,
  selected,
  onPress,
}: {
  animal: CatPrototypeAnimal;
  mode: 'audio_image' | 'image_word' | 'word_image';
  selected: boolean;
  onPress: () => void;
}) {
  const showImage = mode !== 'image_word';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Đáp án ${animal.wordEn}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quizOption,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      {showImage ? <Image source={animal.illustration} style={styles.quizOptionImage} resizeMode="cover" /> : null}
      <Text style={styles.quizOptionText}>{showImage ? animal.wordEn : animal.wordEn}</Text>
    </Pressable>
  );
}

function QuizBlock({ block, onComplete }: { block: CatPrototypeBlock; onComplete: () => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<CatPrototypeAnimalId | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [score, setScore] = useState(0);
  const question = fixture.quiz[questionIndex];
  const isLast = questionIndex === fixture.quiz.length - 1;
  const cat = fixture.animals.cat;

  const choose = (id: CatPrototypeAnimalId) => {
    setSelectedId(id);
    if (id === question.answerId) {
      if (feedback !== 'correct') setScore((value) => value + 1);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  };

  const next = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedId(null);
    setFeedback('idle');
  };

  return (
    <View testID="cat-prototype-quiz" style={styles.blockRoot}>
      <BlockHeading block={block} hint={`Question ${questionIndex + 1} of ${fixture.quiz.length} · Score ${score}`} />
      <ClayCard variant="lg" color="white" padding={14} style={styles.quizPromptCard}>
        <Text style={styles.quizPrompt}>{question.prompt}</Text>
        {question.mode === 'audio_image' ? (
          <AudioButton source={cat.pronunciationAudio} label="Phát câu hỏi" />
        ) : question.mode === 'image_word' ? (
          <Image source={cat.illustration} style={styles.quizHeroImage} resizeMode="cover" />
        ) : (
          <Text style={styles.quizHeroWord}>Cat</Text>
        )}
      </ClayCard>
      <View style={styles.quizOptions}>
        {question.optionIds.map((id) => (
          <QuizOption
            key={`${question.id}-${id}`}
            animal={fixture.animals[id]}
            mode={question.mode}
            selected={selectedId === id}
            onPress={() => choose(id)}
          />
        ))}
      </View>
      <Feedback state={feedback} correct="Correct! Cat is the answer." incorrect="Good try. Look or listen once more." />
      <ClayButton variant="lg" color="blue" style={styles.primaryCta} disabled={feedback !== 'correct'} onPress={next}>
        {isLast ? 'Xem phần thưởng' : 'Câu tiếp theo'}
      </ClayButton>
    </View>
  );
}

function RewardView({ onFinish }: { onFinish: () => void }) {
  const cat = fixture.animals.cat;
  return (
    <View testID="cat-prototype-reward" style={styles.rewardRoot}>
      <View style={styles.rewardSparkles}>
        <ClayIcon name="sparkle" size={34} color={BRAND.sunshineYellowDark} />
        <ClayIcon name="star" size={24} color={BRAND.coralPinkDark} />
        <ClayIcon name="sparkle" size={28} color={BRAND.skyBlueDark} />
      </View>
      <View style={styles.rewardMascot}>
        <PrototypeLexi size={94} row={4} />
      </View>
      <Text style={styles.rewardEyebrow}>{fixture.blocks[6].eyebrow}</Text>
      <Text style={styles.rewardTitle}>{fixture.reward.title}</Text>
      <Text style={styles.rewardMessage}>{fixture.reward.message}</Text>
      <ClayCard variant="xl" color="yellow" padding={12} style={styles.rewardVisual}>
        <Image source={cat.illustration} style={styles.rewardCat} resizeMode="cover" />
        <View style={styles.rewardBadge}>
          <ClayIcon name="star" size={22} color={BRAND.sunshineYellowDark} />
        </View>
      </ClayCard>
      <View style={styles.rewardStats}>
        <View style={styles.rewardStat}>
          <Text style={styles.rewardStatValue}>{fixture.reward.score}/{fixture.reward.total}</Text>
          <Text style={styles.rewardStatLabel}>QUIZ</Text>
        </View>
        <View style={styles.rewardStatDivider} />
        <View style={styles.rewardStat}>
          <Text style={styles.rewardStatValue}>+{fixture.reward.xp}</Text>
          <Text style={styles.rewardStatLabel}>FIXTURE XP</Text>
        </View>
        <View style={styles.rewardStatDivider} />
        <View style={styles.rewardStat}>
          <Text style={styles.rewardStatValue}>100%</Text>
          <Text style={styles.rewardStatLabel}>PROGRESS</Text>
        </View>
      </View>
      <Text style={styles.prototypeNote}>Presentation-only prototype · no reward was saved</Text>
      <ClayButton variant="lg" color="green" style={[styles.primaryCta, styles.rewardCta]} onPress={onFinish}>Hoàn tất prototype</ClayButton>
    </View>
  );
}

function LearningBlockRenderer({
  block,
  onComplete,
  onFinish,
}: {
  block: CatPrototypeBlock;
  onComplete: () => void;
  onFinish: () => void;
}) {
  switch (block.type) {
    case 'warm_up':
      return <WarmUpBlock block={block} onComplete={onComplete} />;
    case 'learn_vocabulary':
      return <VocabularyBlock block={block} onComplete={onComplete} />;
    case 'listen_choose':
      return <ListenChooseBlock block={block} onComplete={onComplete} />;
    case 'match':
      return <MatchBlock block={block} onComplete={onComplete} />;
    case 'memory_match':
      return <MemoryMatchBlock block={block} onComplete={onComplete} />;
    case 'quiz':
      return <QuizBlock block={block} onComplete={onComplete} />;
    case 'reward':
      return <RewardView onFinish={onFinish} />;
  }
}

export function CatLessonPrototype() {
  const [stepIndex, setStepIndex] = useState(0);
  const block = fixture.blocks[stepIndex];
  const isReward = block.type === 'reward';
  const next = useCallback(() => {
    setStepIndex((current) => Math.min(current + 1, fixture.blocks.length - 1));
  }, []);
  const back = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);
  const reset = useCallback(() => setStepIndex(0), []);

  const backgroundDots = useMemo(() => (
    <>
      <View style={[styles.backgroundBlob, styles.backgroundBlobOne]} />
      <View style={[styles.backgroundBlob, styles.backgroundBlobTwo]} />
      <View style={[styles.backgroundBlob, styles.backgroundBlobThree]} />
    </>
  ), []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {backgroundDots}
      <View style={styles.shell}>
        {!isReward ? <LessonHeader stepIndex={stepIndex} onBack={back} /> : null}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isReward && styles.rewardScrollContent]}
          showsVerticalScrollIndicator={false}
        >
          <LearningBlockRenderer key={block.id} block={block} onComplete={next} onFinish={reset} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.backgroundBase },
  shell: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  backgroundBlob: { position: 'absolute', borderRadius: RADIUS.pill, opacity: 0.42 },
  backgroundBlobOne: { width: 160, height: 160, backgroundColor: BRAND.skyBlueLight, top: -50, right: -65 },
  backgroundBlobTwo: { width: 130, height: 130, backgroundColor: BRAND.coralPinkLight, bottom: 70, left: -70 },
  backgroundBlobThree: { width: 90, height: 90, backgroundColor: BRAND.sunshineYellowLight, top: 300, right: -55 },
  header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backButton: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, ...SHADOWS.clayXs },
  backButtonDisabled: { opacity: 0.35 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: COLORS.textPrimary, fontSize: FONT.sizes.md, fontWeight: '900' },
  headerProgressLabel: { color: COLORS.textSecondary, fontSize: FONT.sizes.xs, fontWeight: '700', marginTop: 2 },
  headerStar: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.sunshineYellowLight },
  progressTrack: { height: 9, borderRadius: RADIUS.pill, backgroundColor: withOpacity(BRAND.skyBlue, 0.18), marginTop: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: BRAND.skyBlue },
  scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.base, paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  rewardScrollContent: { justifyContent: 'center' },
  blockRoot: { flex: 1, gap: SPACING.md },
  blockHeading: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  eyebrow: { color: BRAND.coralPinkDark, fontSize: FONT.sizes['2xs'], fontWeight: '900', letterSpacing: 1.8 },
  blockTitle: { color: COLORS.textPrimary, fontSize: FONT.sizes.xxl, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  blockHint: { color: COLORS.textSecondary, fontSize: FONT.sizes.sm, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  mascotRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mascotWell: { width: 86, height: 78, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.lavenderSurface, ...SHADOWS.lexGlow },
  speechBubble: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.claySm },
  speechName: { color: BRAND.lavenderDark, fontSize: FONT.sizes['2xs'], fontWeight: '900', letterSpacing: 1.5 },
  speechText: { color: COLORS.textPrimary, fontSize: FONT.sizes.sm, fontWeight: '700', lineHeight: 18, marginTop: 3 },
  heroCard: { minHeight: 248, overflow: 'hidden' },
  heroHalo: { position: 'absolute', width: 220, height: 220, borderRadius: RADIUS.pill, backgroundColor: withOpacity(BRAND.sunshineYellow, 0.23), alignSelf: 'center', top: 12 },
  heroImage: { width: 224, height: 224, borderRadius: RADIUS.xl, alignSelf: 'center' },
  audioButton: { minHeight: 52, borderRadius: RADIUS.pill, backgroundColor: withOpacity(BRAND.skyBlue, 0.16), borderWidth: 2, borderColor: withOpacity(BRAND.skyBlue, 0.3), paddingHorizontal: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  audioIcon: { width: 34, height: 34, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  audioLabel: { color: BRAND.skyBlueDark, fontSize: FONT.sizes.md, fontWeight: '800' },
  primaryCta: { shadowColor: BRAND.deepSlate, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  vocabCard: { alignItems: 'center' },
  vocabImage: { width: 190, height: 190, borderRadius: RADIUS.xl },
  vocabWord: { color: COLORS.textPrimary, fontSize: FONT.sizes.xxxl, fontWeight: '900', marginTop: SPACING.xs },
  vocabTranslation: { color: BRAND.coralPinkDark, fontSize: FONT.sizes.md, fontWeight: '800', marginTop: 2 },
  sentencePill: { marginTop: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: BRAND.sunshineYellowLight, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm },
  sentenceText: { color: COLORS.textPrimary, fontSize: FONT.sizes.md, fontWeight: '700' },
  choiceRow: { flexDirection: 'row', gap: SPACING.sm },
  animalChoice: { flex: 1, minWidth: 0, minHeight: 142, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 3, borderColor: 'transparent', ...SHADOWS.claySm },
  choiceSelected: { borderColor: BRAND.skyBlue, backgroundColor: BRAND.skyBlueLight },
  choiceMatched: { borderColor: BRAND.mintGreenDark, backgroundColor: BRAND.mintGreenLight, opacity: 0.78 },
  choiceImage: { width: 88, height: 88, borderRadius: RADIUS.md },
  choiceWord: { color: COLORS.textPrimary, fontSize: FONT.sizes.md, fontWeight: '900', marginTop: SPACING.xs },
  matchCheck: { position: 'absolute', top: 7, right: 7, width: 24, height: 24, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.mintGreenDark },
  feedbackSpacer: { minHeight: 48 },
  feedback: { minHeight: 48, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  feedbackCorrect: { backgroundColor: BRAND.mintGreenLight },
  feedbackIncorrect: { backgroundColor: BRAND.coralPinkLight },
  feedbackText: { flex: 1, fontSize: FONT.sizes.sm, fontWeight: '800' },
  microProgress: { alignSelf: 'center', color: BRAND.skyBlueDark, fontSize: FONT.sizes.sm, fontWeight: '900', backgroundColor: BRAND.skyBlueLight, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  matchImages: { flexDirection: 'row', gap: SPACING.sm },
  wordGrid: { flexDirection: 'row', gap: SPACING.sm },
  wordChip: { flex: 1, minHeight: 58, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 2, borderColor: withOpacity(BRAND.lavender, 0.35), ...SHADOWS.clayXs },
  wordChipMatched: { backgroundColor: BRAND.mintGreenLight, borderColor: BRAND.mintGreenDark },
  wordChipText: { color: COLORS.textPrimary, fontSize: FONT.sizes.lg, fontWeight: '900' },
  wordChipTextMatched: { color: BRAND.mintGreenDark },
  gameStats: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm },
  gameStat: { color: BRAND.lavenderDark, fontSize: FONT.sizes.sm, fontWeight: '900', backgroundColor: BRAND.lavenderLight, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: SPACING.sm },
  memoryCard: { width: '31.5%', aspectRatio: 0.92, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.lavender, borderWidth: 3, borderColor: withOpacity(COLORS.white, 0.75), ...SHADOWS.claySm },
  memoryCardRevealed: { backgroundColor: COLORS.white, borderColor: BRAND.skyBlueLight },
  memoryCardMatched: { backgroundColor: BRAND.mintGreenLight, borderColor: BRAND.mintGreenDark },
  cardBackIcon: { width: 48, height: 48, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: withOpacity(COLORS.white, 0.72) },
  memoryImage: { width: 86, height: 86, borderRadius: RADIUS.md },
  memoryWord: { color: COLORS.textPrimary, fontSize: FONT.sizes.xl, fontWeight: '900' },
  quizPromptCard: { alignItems: 'center', gap: SPACING.sm },
  quizPrompt: { color: COLORS.textPrimary, fontSize: FONT.sizes.lg, fontWeight: '900', textAlign: 'center' },
  quizHeroImage: { width: 112, height: 112, borderRadius: RADIUS.lg },
  quizHeroWord: { color: BRAND.coralPinkDark, fontSize: FONT.sizes.display, fontWeight: '900', paddingVertical: SPACING.sm },
  quizOptions: { flexDirection: 'row', gap: SPACING.sm },
  quizOption: { flex: 1, minHeight: 112, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 3, borderColor: 'transparent', ...SHADOWS.claySm },
  quizOptionImage: { width: 76, height: 76, borderRadius: RADIUS.md },
  quizOptionText: { color: COLORS.textPrimary, fontSize: FONT.sizes.md, fontWeight: '900', marginTop: SPACING.xs },
  rewardRoot: { flex: 1, alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  rewardSparkles: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl },
  rewardMascot: { width: 118, height: 104, borderRadius: RADIUS.xxl, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.lavenderSurface, ...SHADOWS.lexGlow },
  rewardEyebrow: { color: BRAND.coralPinkDark, fontSize: FONT.sizes.xs, fontWeight: '900', letterSpacing: 1.8, marginTop: SPACING.xs },
  rewardTitle: { color: COLORS.textPrimary, fontSize: FONT.sizes.xxxl, fontWeight: '900', textAlign: 'center' },
  rewardMessage: { color: COLORS.textSecondary, fontSize: FONT.sizes.sm, fontWeight: '700', textAlign: 'center', lineHeight: 19, maxWidth: 310 },
  rewardVisual: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  rewardCat: { width: 154, height: 154, borderRadius: RADIUS.xl },
  rewardBadge: { position: 'absolute', top: 8, right: 8, width: 42, height: 42, borderRadius: RADIUS.pill, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.claySm },
  rewardStats: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.xl, paddingVertical: SPACING.md, ...SHADOWS.claySm },
  rewardStat: { flex: 1, alignItems: 'center' },
  rewardStatValue: { color: COLORS.textPrimary, fontSize: FONT.sizes.xl, fontWeight: '900' },
  rewardStatLabel: { color: COLORS.textSecondary, fontSize: FONT.sizes['2xs'], fontWeight: '800', marginTop: 2 },
  rewardStatDivider: { width: 1, height: 36, backgroundColor: withOpacity(BRAND.skyBlue, 0.25) },
  prototypeNote: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, fontWeight: '600', textAlign: 'center' },
  rewardCta: { minWidth: 250 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});

export default CatLessonPrototype;
