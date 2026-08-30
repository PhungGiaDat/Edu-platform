/**
 * DefinitionCard — the Tra từ result surface (spec 2026-08-30).
 *
 * Signature element: Lexi shares the card with the word and reacts to the
 * save state, so feedback is emotional as well as textual.
 */
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { brandColors } from '@/design-tokens/claymorphic';
import { SaveIcon, AlertIcon, CheckIcon } from './icons';
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
  if (saveState === 'saved') return 'Đã lưu';
  if (saveState === 'saving') return 'Đang lưu...';
  return 'Lưu vào Sổ tay';
}

export function DefinitionCard({ result, saveState, onSave }: DefinitionCardProps) {
  const source = sourceLabel(result.sources);

  return (
    <ClayCard className="p-5 pr-[5.5rem] min-[420px]:pr-5" hover={false} style={{ backgroundColor: '#FFFFFF' }}>
      {/* ClayCard does not forward ARIA props, so the labelled region lives on an inner wrapper. */}
      <div role="region" aria-label={`Định nghĩa của ${result.word}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black break-words" style={{ color: brandColors.foreground }}>
              {result.word}
            </h2>
            {result.pronunciation && (
              <p className="dict-ipa text-sm mt-1" lang="en">{result.pronunciation}</p>
            )}
            {result.part_of_speech && (
              <Badge variant="secondary" size="sm" className="mt-2">{result.part_of_speech}</Badge>
            )}
          </div>
          <CodexPetSprite
            animationState={saveState === 'error' ? 'waiting' : 'idle'}
            label="Lexi, trợ lý tra từ của bạn"
            size={56}
          />
        </div>

        <p className="mt-3 text-xl font-bold" style={{ color: brandColors.primary }}>
          {result.translation_vi}
        </p>

        {result.definition_en && (
          <p className="mt-2 text-sm" style={{ color: brandColors.foreground }}>{result.definition_en}</p>
        )}

        {result.example_sentence && (
          <p className="mt-2 text-sm italic" style={{ color: '#475569' }} lang="en">
            “{result.example_sentence}”
          </p>
        )}

        {result.wiki_summary && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="dict-source-badge inline-block rounded-full px-2 py-0.5 text-xs font-bold">
              {source} · CC BY-SA
            </span>
            <p className="mt-2 text-sm" style={{ color: brandColors.foreground }}>{result.wiki_summary}</p>
          </div>
        )}

        <Button
          variant="primary"
          onClick={onSave}
          disabled={saveState === 'saving' || saveState === 'saved'}
          className="dict-save-btn w-full mt-4"
          style={{ backgroundColor: brandColors.accent, color: brandColors.foreground }}
          aria-live="polite"
        >
          <span className="flex items-center justify-center gap-2">
            {saveState === 'saved' ? <CheckIcon className="h-5 w-5" /> : <SaveIcon className="h-5 w-5" />}
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
    </ClayCard>
  );
}

export default DefinitionCard;
