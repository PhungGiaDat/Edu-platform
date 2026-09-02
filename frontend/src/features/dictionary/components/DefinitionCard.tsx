/**
 * DefinitionCard — the Tra từ result surface (spec 2026-08-30, refreshed
 * 2026-09-02 with the kids-claymorphism direction: vibrant pastel surfaces,
 * colored POS chip, a dedicated "Giải thích" block for explanation_vi, and a
 * success bounce on save).
 *
 * Signature element: Lexi shares the card with the word and reacts to the
 * save state, so feedback is emotional as well as textual.
 */
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { colors, shadows, brandColors, withOpacity } from '@/design-tokens/claymorphic';
import { SaveIcon, AlertIcon, CheckIcon, SparkleIcon } from './icons';
import type { LookupResponse } from '@/types/dictionary';

export type DefinitionCardSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface DefinitionCardProps {
  result: LookupResponse;
  saveState: DefinitionCardSaveState;
  onSave: () => void;
}

/**
 * The lookup contract reports provenance as `sources: string[]` only (there is
 * no `source_url` field), so attribution is rendered as a licence caption next
 * to the serving-source badge rather than as a deep link.
 */
function sourceLabel(sources?: string[]): string {
  if (sources?.includes('wikipedia')) return 'Wikipedia';
  if (sources?.includes('wiktionary')) return 'Wiktionary';
  return 'Wiktionary';
}

function saveLabel(saveState: DefinitionCardSaveState): string {
  if (saveState === 'saved') return 'Đã lưu!';
  if (saveState === 'saving') return 'Đang lưu...';
  return 'Lưu vào Sổ tay';
}

/** POS chip palette — keyed, never interpolated from user-controlled text. */
const POS_STYLES: Record<string, { bg: string; ink: string }> = {
  noun: { bg: colors.skyBlueLight ?? '#C5E4FF', ink: '#1D4ED8' },
  verb: { bg: '#DFFFD0', ink: '#15803D' },
  adjective: { bg: '#FFD5D5', ink: '#B91C1C' },
  adverb: { bg: '#FFF3A3', ink: '#A16207' },
  other: { bg: '#EDE9FE', ink: '#6D28D9' },
};

function posStyle(pos?: string): { bg: string; ink: string } {
  if (!pos) return POS_STYLES.other;
  return POS_STYLES[pos.toLowerCase()] ?? POS_STYLES.other;
}

export function DefinitionCard({ result, saveState, onSave }: DefinitionCardProps) {
  const source = sourceLabel(result.sources);
  const posChip = posStyle(result.part_of_speech);
  const saved = saveState === 'saved';

  return (
    <ClayCard
      className={`p-5 pr-[5.5rem] min-[420px]:pr-5 ${saved ? 'clay-save-bounce' : ''}`}
      hover={false}
      style={{ backgroundColor: colors.warmWhite }}
    >
      {/* ClayCard does not forward ARIA props, so the labelled region lives on an inner wrapper. */}
      <div role="region" aria-label={`Định nghĩa của ${result.word}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-3xl font-black break-words leading-tight" style={{ color: colors.deepSlate }}>
              {result.word}
            </h2>
            {result.pronunciation && (
              <p className="dict-ipa text-sm mt-1 font-semibold" style={{ color: brandColors.primary }} lang="en">
                {result.pronunciation}
              </p>
            )}
            {result.part_of_speech && (
              <span
                className="dict-pos-chip inline-block mt-2 rounded-full px-3 py-0.5 text-xs font-bold"
                style={{ backgroundColor: posChip.bg, color: posChip.ink }}
              >
                {result.part_of_speech}
              </span>
            )}
          </div>
          <CodexPetSprite
            animationState={saveState === 'error' ? 'waiting' : 'idle'}
            label="Lexi, trợ lý tra từ của bạn"
            size={56}
          />
        </div>

        {/* Vietnamese meaning — the hero line for kids */}
        <div
          className="mt-4 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: withOpacity(colors.mintGreen, 0.35),
            boxShadow: shadows.claySm,
          }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#15803D' }}>
            Nghĩa tiếng Việt
          </p>
          <p className="mt-0.5 text-xl font-extrabold" style={{ color: colors.deepSlate }}>
            {result.translation_vi}
          </p>
        </div>

        {/* Kid-friendly Vietnamese explanation (explanation_vi) */}
        {result.explanation_vi && (
          <div
            className="mt-3 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: withOpacity(colors.lavender, 0.22),
              boxShadow: shadows.claySm,
            }}
          >
            <p
              className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide"
              style={{ color: '#6D28D9' }}
            >
              <SparkleIcon className="h-4 w-4" />
              Giải thích dễ hiểu
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: colors.deepSlate }}>
              {result.explanation_vi}
            </p>
          </div>
        )}

        {result.definition_en && (
          <p className="mt-3 text-sm" style={{ color: colors.deepSlate }}>{result.definition_en}</p>
        )}

        {result.example_sentence && (
          <p
            className="mt-2 text-sm italic rounded-xl px-3 py-2"
            style={{
              color: '#334155',
              backgroundColor: withOpacity(colors.skyBlue, 0.14),
            }}
            lang="en"
          >
            “{result.example_sentence}”
          </p>
        )}

        {result.wiki_summary && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: withOpacity(colors.lightGray, 0.4) }}>
            <span className="dict-source-badge inline-block rounded-full px-2 py-0.5 text-xs font-bold">
              {source} · CC BY-SA
            </span>
            <p className="mt-2 text-sm" style={{ color: colors.deepSlate }}>{result.wiki_summary}</p>
          </div>
        )}

        <Button
          variant="primary"
          onClick={onSave}
          disabled={saveState === 'saving' || saved}
          className="dict-save-btn w-full mt-4"
          style={{ backgroundColor: brandColors.accent, color: colors.deepSlate }}
          aria-live="polite"
        >
          <span className="flex items-center justify-center gap-2">
            {saved ? <CheckIcon className="h-5 w-5" /> : <SaveIcon className="h-5 w-5" />}
            {saveLabel(saveState)}
          </span>
        </Button>

        {saveState === 'error' && (
          <p className="mt-2 text-sm flex items-center gap-1" style={{ color: '#DC2626' }} role="alert">
            <AlertIcon className="h-4 w-4" />
            Không lưu được, thử lại nhé
          </p>
        )}
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .clay-save-bounce {
            animation: claySaveBounce 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          @keyframes claySaveBounce {
            0% { transform: scale(1); }
            35% { transform: scale(1.03) rotate(-0.5deg); }
            70% { transform: scale(0.99) rotate(0.3deg); }
            100% { transform: scale(1); }
          }
        }
      `}</style>
    </ClayCard>
  );
}

export default DefinitionCard;
