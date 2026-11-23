import type { AVPlaybackSource } from 'expo-av';
import type { ImageSourcePropType } from 'react-native';

const PUBLIC_ASSET_BASE =
  'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/courses/animals-adventure-en-5-7';

type PromotedVisualAsset = {
  semanticKey: string;
  source: ImageSourcePropType;
  sha256: string;
};

function promotedVisual(semanticKey: string, path: string, sha256: string): PromotedVisualAsset {
  return { semanticKey, source: { uri: `${PUBLIC_ASSET_BASE}/${path}` }, sha256 };
}

export const catLessonPromotedAssets = {
  cat: promotedVisual(
    'vocabulary:animals-v1-cat:vocabulary_illustration',
    'vocabulary/animals-v1-cat/vocabulary_illustration.clay-v1-512.png',
    '37ab6a7c5156578fce5a6bd6b4d166cfbcd38bcc5dff010f1a3a27c7ee1dae7b',
  ),
  dog: promotedVisual(
    'vocabulary:animals-v1-dog:vocabulary_illustration',
    'vocabulary/animals-v1-dog/vocabulary_illustration.clay-v1-512.png',
    'a125df27031011948a4b49b46733b3e1bc911a7a51927546fc08946501802873',
  ),
  bird: promotedVisual(
    'vocabulary:animals-v1-bird:vocabulary_illustration',
    'vocabulary/animals-v1-bird/vocabulary_illustration.clay-v1-512.png',
    'fb85c6e8533ecd0cce502a615c4ab9b39aaa8f495e0fa472823f4a95fee1a81f',
  ),
  lexiNeutral: promotedVisual(
    'mascot:lexi:neutral',
    'mascots/lexi/neutral.clay-v1-512.png',
    '21932114eec847cfaef3a8c845c1391d66c4f1be90bdc24bf15b55913a8bc6c1',
  ),
  lexiCheer: promotedVisual(
    'mascot:lexi:cheer',
    'mascots/lexi/cheer.clay-v1-512.png',
    'ce69301ce1bb9f3d09cea983a1a035f44e247682c7f30855762f324c9e76dc1b',
  ),
  catChampion: promotedVisual(
    'lesson:learn-the-cat:cat_champion_reward',
    'lessons/learn-the-cat/rewards/cat_champion_reward.clay-v1-512.png',
    '51bbcdb0633e69c74b7004eaeea47a962f5e4e3c48ebf95796cfeead511b7eb4',
  ),
} as const;

export const catPronunciationAudio: AVPlaybackSource = {
  uri: `${PUBLIC_ASSET_BASE}/vocabulary/animals-v1-cat/pronunciation_audio.wav`,
};
