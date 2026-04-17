import React, { useEffect, useMemo, useRef } from 'react';
import type { ProcessedDocument } from '../types';
import { useTheme } from '../theme/ThemeContext';

export default function SearchModal({
  open,
  query,
  documents,
  onQueryChange,
  onClose,
  onSelect,
}: {
  open: boolean;
  query: string;
  documents: ProcessedDocument[];
  onQueryChange: (next: string) => void;
  onClose: () => void;
  onSelect: (doc: ProcessedDocument) => void;
}) {
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  const sorted = useMemo(
    () => documents.slice().sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [documents]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, 8);

    const scored = sorted
      .map((d) => {
        const title = (d.fileName ?? '').toLowerCase();
        const body = `${d.originalContent ?? ''}\n${d.translatedContent ?? ''}\n${d.summary ?? ''}`.toLowerCase();
        const titleHit = title.includes(q);
        const bodyHit = body.includes(q);
        if (!titleHit && !bodyHit) return null;
        return { doc: d, score: (titleHit ? 2 : 0) + (bodyHit ? 1 : 0) };
      })
      .filter(Boolean) as Array<{ doc: ProcessedDocument; score: number }>;

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.doc);
  }, [query, sorted]);

  if (!open) return null;

  const isLight = theme === 'light';
  const panelClass = isLight
    ? 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft'
    : 'overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/95 shadow-soft backdrop-blur-xl';
  const headerClass = isLight ? 'flex items-center gap-3 border-b border-slate-200 px-4 py-3' : 'flex items-center gap-3 border-b border-white/10 px-4 py-3';
  const iconClass = isLight ? 'text-slate-500' : 'text-white/60';
  const inputClass = isLight
    ? 'w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none'
    : 'w-full bg-transparent text-sm text-white/85 placeholder:text-white/40 outline-none';
  const sectionLabelClass = isLight ? 'px-3 py-2 text-xs font-medium text-slate-500' : 'px-3 py-2 text-xs font-medium text-white/45';
  const emptyClass = isLight ? 'px-4 py-8 text-center text-sm text-slate-500' : 'px-4 py-8 text-center text-sm text-white/55';
  const rowClass = isLight
    ? 'flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors'
    : 'flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors';
  const titleClass = isLight ? 'truncate font-semibold text-slate-900' : 'truncate font-semibold text-white';
  const metaClass = isLight ? 'mt-1 flex items-center gap-2 text-xs text-slate-500' : 'mt-1 flex items-center gap-2 text-xs text-white/45';
  const hintClass = isLight ? 'shrink-0 text-xs text-slate-400' : 'shrink-0 text-xs text-white/35';
  const footerClass = isLight
    ? 'border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500'
    : 'border-t border-white/10 px-4 py-2 text-xs text-white/45';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto mt-24 w-[92%] max-w-[720px]">
        <div className={panelClass}>
          <div className={headerClass}>
            <div className={iconClass}>🔍</div>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search documents..."
              className={inputClass}
            />
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {!query.trim() ? <div className={sectionLabelClass}>Recent</div> : null}

            {results.length === 0 ? (
              <div className={emptyClass}>No matches</div>
            ) : (
              results.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelect(doc)}
                  className={rowClass}
                >
                  <div className="min-w-0">
                    <div className={titleClass}>{doc.fileName}</div>
                    <div className={metaClass}>
                      <span className="truncate">{doc.targetLanguage}</span>
                      <span>•</span>
                      <span className="truncate">Edited {new Date(doc.updatedAt ?? doc.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={hintClass}>Enter</div>
                </button>
              ))
            )}
          </div>

          <div className={footerClass}>
            Cmd+K / Ctrl+K to open • Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}
