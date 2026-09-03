/**
 * NotebookEntryDetail — full record for one saved word (spec 2026-08-30, Task 11).
 *
 * Bottom sheet on mobile, centered modal on desktop. Escape and backdrop click
 * both dismiss; focus moves into the panel on open and is handed back to the
 * card that opened it on close.
 */
import { useEffect, useRef } from 'react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { brandColors, colors, shadows, withOpacity } from '@/design-tokens/claymorphic';
import type { EntrySource, NotebookEntry } from '@/types/notebook';
import { CloseIcon, GlobeIcon, SparkleIcon } from '@/features/dictionary/components/icons';

export interface NotebookEntryDetailProps {
  entry: NotebookEntry;
  onClose: () => void;
  onDelete: (id: string) => void;
}

/** Child-facing words only — the raw enum values are never shown. */
const SOURCE_LABELS: Record<EntrySource, string> = {
  word_lookup: 'Tra từ',
  ai_translation: 'Dịch câu',
  flashcard: 'Thẻ ghi nhớ',
  manual: 'Tự ghi',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

export function NotebookEntryDetail({ entry, onClose, onDelete }: NotebookEntryDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // Keep Tab cycling inside the dialog while it is open.
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  const nextReview = entry.next_review_at ? formatDate(entry.next_review_at) : '';

  return (
    <div
      className="notebook-detail-overlay fixed inset-0 z-[var(--z-modal)] flex items-end justify-center md:items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={entry.word}
        className="notebook-detail-panel w-full max-w-md max-h-[85dvh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black break-words" style={{ color: brandColors.foreground }}>
              {entry.word}
            </h2>
            {entry.pronunciation && (
              <p className="dict-ipa text-sm mt-1" lang="en">{entry.pronunciation}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.part_of_speech && <Badge variant="secondary" size="sm">{entry.part_of_speech}</Badge>}
              <Badge variant="primary" size="sm">{SOURCE_LABELS[entry.source] ?? 'Sổ tay'}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Đóng chi tiết">
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-4 text-xl font-bold" style={{ color: brandColors.primary }}>
          {entry.translation_vi}
        </p>

        {entry.explanation_vi && (
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
            <p className="mt-1 text-sm leading-relaxed" style={{ color: brandColors.foreground }}>
              {entry.explanation_vi}
            </p>
          </div>
        )}

        {entry.definition_en && (
          <p className="mt-2 text-sm" style={{ color: brandColors.foreground }}>{entry.definition_en}</p>
        )}

        {entry.wiki_summary && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="dict-source-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold">
              <GlobeIcon className="h-3.5 w-3.5" />
              Wikipedia · CC BY-SA
            </span>
            <p className="mt-2 text-sm" style={{ color: brandColors.foreground }}>{entry.wiki_summary}</p>
          </div>
        )}

        {entry.context && (
          <p className="mt-3 text-sm italic" style={{ color: '#64748B' }}>
            Ngữ cảnh: “{entry.context}”
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs" style={{ color: '#64748B' }}>
          <span>
            {entry.review_count} lần ôn
            {nextReview && ` · lần sau: ${nextReview}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 shrink-0"
            onClick={() => onDelete(entry.id)}
          >
            Xóa từ
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotebookEntryDetail;
