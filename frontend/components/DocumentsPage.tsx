import React, { useCallback, useMemo, useState } from 'react';
import type { ProcessedDocument } from '../types';
import { BUTTON, HistoryIcon, DeleteIcon } from '../constants';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';

export default function DocumentsPage({
  documents,
  allDocumentsCount,
  viewMode,
  onSelectDocument,
  onCreateNew,
  onDeleteDocument,
  onRenameDocument,
}: {
  documents: ProcessedDocument[];
  allDocumentsCount: number;
  viewMode: 'grid' | 'list';
  onSelectDocument: (doc: ProcessedDocument) => void;
  onCreateNew: () => void;
  onDeleteDocument: (docId: string) => void;
  onRenameDocument: (docId: string, nextName: string) => void | Promise<void>;
}) {
  const { toast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const requestDelete = useCallback(
    (e: React.MouseEvent, docId: string) => {
      e.stopPropagation();
      setPendingDeleteId(docId);
      setConfirmOpen(true);
    },
    []
  );

  const requestDeleteById = useCallback((docId: string) => {
    setPendingDeleteId(docId);
    setConfirmOpen(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteId) return;
    onDeleteDocument(pendingDeleteId);
    toast({ type: 'success', title: 'Deleted', message: 'Document removed from your saved list.' });
    setConfirmOpen(false);
    setPendingDeleteId(null);
  }, [onDeleteDocument, pendingDeleteId, toast]);

  const sorted = documents
    .slice()
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());

  const total = useMemo(() => allDocumentsCount, [allDocumentsCount]);

  return (
    <div className="space-y-8 pt-10">
      <ConfirmModal
        open={confirmOpen}
        title="Delete document?"
        description="This will permanently remove the document from your saved list."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-soft">
          <div className="text-xs font-medium text-white/50">Documents</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{total}</div>
          <div className="mt-3 text-sm text-white/55">Across your workspace</div>
        </div>
      </section>

      {allDocumentsCount === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 backdrop-blur-xl shadow-soft">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[28px] bg-gradient-to-br from-[rgba(56,189,248,0.25)] to-[rgba(34,197,94,0.12)] ring-1 ring-white/10">
              <HistoryIcon className="h-10 w-10 text-white/70" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-white">No saved documents yet</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">Create a document to save your translations, summaries, and chat history.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCreateNew}
                className={`${BUTTON.primary} w-full sm:w-auto px-5 py-2.5`}
              >
                New Document
              </button>
              <button
                type="button"
                className={`${BUTTON.secondary} w-full sm:w-auto px-5 py-2.5`}
                onClick={() => toast({ type: 'info', title: 'Tip', message: 'Create a document, then upload a file or paste text to start translating.' })}
              >
                Learn how it works
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-white/75">All documents</div>
              <div className="text-xs text-white/40">Select to open</div>
            </div>

            <div className={viewMode === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
              {sorted.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className={
                    viewMode === 'list'
                      ? 'group relative cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl shadow-soft transition-all duration-200 ease-out hover:bg-white/[0.06] hover:ring-1 hover:ring-[rgba(56,189,248,0.25)]'
                      : 'group relative cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-soft transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/[0.06] hover:ring-1 hover:ring-[rgba(56,189,248,0.25)]'
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId((prev) => (prev === doc.id ? null : doc.id));
                    }}
                    className="absolute right-4 top-4 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    aria-label="Document actions"
                  >
                    <span className="text-base leading-none">⋯</span>
                  </button>

                  {menuOpenId === doc.id ? (
                    <div
                      className="absolute right-4 top-14 z-20 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/95 shadow-soft backdrop-blur-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenId(null);
                          setRenamingId(doc.id);
                          setRenameValue(doc.fileName);
                        }}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          setMenuOpenId(null);
                          e.stopPropagation();
                          requestDeleteById(doc.id);
                        }}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}

                  <div className={viewMode === 'list' ? 'flex items-center justify-between gap-4 pr-10' : 'min-w-0 pr-10'}>
                    <div className="min-w-0">
                      {renamingId === doc.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setRenamingId(null);
                                return;
                              }
                              if (e.key === 'Enter') {
                                const next = renameValue.trim();
                                if (!next) {
                                  toast({ type: 'error', title: 'Invalid name', message: 'Document name cannot be empty.' });
                                  return;
                                }
                                void onRenameDocument(doc.id, next);
                                toast({ type: 'success', title: 'Renamed', message: 'Document name updated.' });
                                setRenamingId(null);
                              }
                            }}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = renameValue.trim();
                              if (!next) {
                                toast({ type: 'error', title: 'Invalid name', message: 'Document name cannot be empty.' });
                                return;
                              }
                              void onRenameDocument(doc.id, next);
                              toast({ type: 'success', title: 'Renamed', message: 'Document name updated.' });
                              setRenamingId(null);
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                            aria-label="Save rename"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingId(null)}
                            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                            aria-label="Cancel rename"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="truncate text-sm font-semibold text-white">{doc.fileName}</div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">{doc.targetLanguage}</span>
                        <span className="text-xs text-white/45">Edited {new Date(doc.updatedAt ?? doc.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {viewMode === 'list' ? (
                      <div className="text-xs text-white/40">Open</div>
                    ) : (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-white/40">Open</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
