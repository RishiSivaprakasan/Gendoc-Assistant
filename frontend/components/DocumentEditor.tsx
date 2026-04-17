import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { franc, francAll } from 'franc-min';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { BUTTON, LANGUAGES, LoadingOverlay, Spinner, UploadIcon, TranslateIcon, SummarizeIcon, ChatIcon, ChevronDownIcon } from '../constants';
import { chatWithDocument, processDocument, summarizeDocument, translateDocument } from '../services/documentPipelineService';
import type { ChatMessage, ProcessedDocument } from '../types';
import { useToast } from './ToastProvider';

type TabKey = 'translate' | 'summarize' | 'chat';

type Props = {
  defaultLanguage: string;
  document?: ProcessedDocument | null;
  onSave?: (doc: ProcessedDocument) => void;
  onCreateDocument?: (payload: Omit<ProcessedDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ProcessedDocument>;
};

export default function DocumentEditor({ defaultLanguage, document, onSave, onCreateDocument }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('translate');
  const [language, setLanguage] = useState(defaultLanguage || 'Tamil');
  const [isLanguageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);

  const [expandedPane, setExpandedPane] = useState<null | 'original' | 'translated' | 'summary'>(null);

  const [detectedLanguage, setDetectedLanguage] = useState('English');
  const detectedLanguageCacheRef = useRef<Map<string, string>>(new Map());

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [summaryText, setSummaryText] = useState('');

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [isLoading, setIsLoading] = useState<string | null>(null);
  const translateAbortRef = useRef<AbortController | null>(null);
  const summarizeAbortRef = useRef<AbortController | null>(null);
  const uploadRunIdRef = useRef(0);
  const translateRunIdRef = useRef(0);
  const summarizeRunIdRef = useRef(0);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  const [summaryCopyState, setSummaryCopyState] = useState<'idle' | 'copied'>('idle');
  const [summaryDownloadOpen, setSummaryDownloadOpen] = useState(false);
  const summaryDownloadRef = useRef<HTMLDivElement>(null);

  const savedDocRef = useRef<ProcessedDocument | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document) {
      savedDocRef.current = null;
      setLanguage(defaultLanguage || 'Tamil');
      setInputText('');
      setOutputText('');
      setSummaryText('');
      setChatHistory([]);
      setChatInput('');
      setDetectedLanguage('English');
      return;
    }

    savedDocRef.current = document;
    setLanguage(document.targetLanguage || defaultLanguage || 'Tamil');
    setInputText(document.originalContent || '');
    setOutputText(document.translatedContent || '');
    setSummaryText(document.summary || '');
    setChatHistory(document.chatHistory || []);
    setChatInput('');

    const cached = detectedLanguageCacheRef.current.get(document.id);
    if (cached) {
      setDetectedLanguage(cached);
    } else {
      const sample = String(document.originalContent || '').replace(/\s+/g, ' ').trim().slice(0, 450);
      const next = detectLanguageFromSample(sample);
      detectedLanguageCacheRef.current.set(document.id, next);
      setDetectedLanguage(next);
    }
  }, [defaultLanguage, document?.id]);

  const detectLanguageFromSample = useCallback((sample: string): string => {
    const normalized = String(sample || '').replace(/\s+/g, ' ').trim();
    if (normalized.length < 40) return 'English';

    const supported = {
      eng: 'English',
      tam: 'Tamil',
      hin: 'Hindi',
      tel: 'Telugu',
      kan: 'Kannada',
      mal: 'Malayalam',
    } as const;

    try {
      const whitelist = Object.keys(supported);
      const ranked = francAll(normalized, { only: whitelist });
      const best = ranked?.[0]?.[0];
      if (best && best in supported) return supported[best as keyof typeof supported];

      const code = franc(normalized);
      if (code && code in supported) return supported[code as keyof typeof supported];
    } catch (e) {
      // ignore and fallback
    }

    return 'English';
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setDownloadOpen(false);
      }
      if (summaryDownloadRef.current && !summaryDownloadRef.current.contains(event.target as Node)) {
        setSummaryDownloadOpen(false);
      }
    };
    window.document.addEventListener('mousedown', handleClickOutside);
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!expandedPane) return;

    const prevOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedPane(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedPane]);

  useEffect(() => {
    if (copyState !== 'copied') return;
    const t = window.setTimeout(() => setCopyState('idle'), 1200);
    return () => window.clearTimeout(t);
  }, [copyState]);

  useEffect(() => {
    if (summaryCopyState !== 'copied') return;
    const t = window.setTimeout(() => setSummaryCopyState('idle'), 1200);
    return () => window.clearTimeout(t);
  }, [summaryCopyState]);

  const canTranslate = useMemo(() => inputText.trim().length > 0 && !isLoading, [inputText, isLoading]);
  const canCopy = useMemo(() => outputText.trim().length > 0, [outputText]);
  const hasTranslation = useMemo(() => outputText.trim().length > 0, [outputText]);
  const canUseDownstream = useMemo(() => inputText.trim().length > 0 && outputText.trim().length > 0, [inputText, outputText]);
  const hasExtracted = useMemo(() => inputText.trim().length > 0, [inputText]);
  const hasTranslated = useMemo(() => outputText.trim().length > 0, [outputText]);
  const canAccessDownstreamTabs = useMemo(() => hasExtracted && hasTranslated, [hasExtracted, hasTranslated]);

  const persist = useCallback(
    (patch: Partial<ProcessedDocument>) => {
      const base = savedDocRef.current;
      if (!base || !onSave) return;
      onSave({ ...base, ...patch });
    },
    [onSave]
  );

  const renderFullscreenPane = useMemo(() => {
    if (!expandedPane) return null;

    const title = expandedPane === 'original' ? 'Original Document' : expandedPane === 'translated' ? 'Translated Output' : 'Summary';
    const body =
      expandedPane === 'original' ? (
        <textarea
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setOutputText('');
            persist({ originalContent: e.target.value, translatedContent: '', summary: '', chatHistory: [], targetLanguage: language });
          }}
          placeholder="Paste or upload a document to begin…"
          className="h-full w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5 text-[15px] leading-7 text-white/80 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
          disabled={!!isLoading}
        />
      ) : expandedPane === 'translated' ? (
        <div className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5">
          {outputText ? (
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-white/75">{outputText}</pre>
          ) : (
            <div className="text-sm text-white/45">Your translation will appear here after you click Translate.</div>
          )}
        </div>
      ) : (
        <div className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5">
          {summaryText ? (
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-white/75">{summaryText}</pre>
          ) : (
            <div className="text-sm text-white/45">Summary will appear here after processing.</div>
          )}
        </div>
      );

    return createPortal(
      <div className="fixed inset-0 z-[9999]">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setExpandedPane(null)} />
        <div className="absolute inset-0 p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="text-sm font-medium text-white/80">{title}</div>
              <button
                type="button"
                onClick={() => setExpandedPane(null)}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                aria-label="Close fullscreen"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0 p-5 overflow-hidden">
              {body}
            </div>
          </div>
        </div>
      </div>,
      window.document.body
    );
  }, [chatHistory, expandedPane, inputText, isLoading, language, outputText, persist, summaryText]);

  const ensureDocument = useCallback(
    async (patch: Partial<Omit<ProcessedDocument, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (savedDocRef.current) return savedDocRef.current;
      if (!onCreateDocument) {
        toast({ type: 'error', title: 'Cannot save yet', message: 'Document creation is not available.' });
        return null;
      }

      const created = await onCreateDocument({
        fileName: 'New Document',
        originalContent: patch.originalContent ?? inputText,
        translatedContent: patch.translatedContent ?? outputText,
        summary: patch.summary ?? summaryText,
        chatHistory: patch.chatHistory ?? chatHistory,
        targetLanguage: patch.targetLanguage ?? language,
      });

      savedDocRef.current = created;
      if (onSave) onSave(created);
      return created;
    },
    [chatHistory, inputText, language, onCreateDocument, onSave, outputText, summaryText, toast]
  );

  const handleFileUpload = useCallback(async (file: File) => {
    const runId = ++uploadRunIdRef.current;
    setIsLoading('Parsing file…');
    try {
      let content = '';
      try {
        const extracted = await processDocument(file, {});
        content = extracted.text;
      } catch (err) {
        toast({ type: 'error', title: 'Unsupported file', message: 'Please upload .txt, .docx, .pdf, or an image file.' });
        return;
      }

      if (runId !== uploadRunIdRef.current) return;

      setInputText(content);
      setOutputText('');
      setSummaryText('');
      setChatHistory([]);

      const sample = String(content || '').replace(/\s+/g, ' ').trim().slice(0, 450);
      const nextDetected = detectLanguageFromSample(sample);
      setDetectedLanguage(nextDetected);

      await ensureDocument({ originalContent: content, translatedContent: '', summary: '', chatHistory: [], targetLanguage: language });
      persist({ originalContent: content, translatedContent: '', summary: '', chatHistory: [], targetLanguage: language });

      if (savedDocRef.current?.id) {
        detectedLanguageCacheRef.current.set(savedDocRef.current.id, nextDetected);
      }

      toast({ type: 'success', title: 'Uploaded', message: 'Document content added to the editor.' });
    } catch (e) {
      toast({ type: 'error', title: 'Upload failed', message: 'Failed to read or parse the file.' });
    } finally {
      if (runId === uploadRunIdRef.current) setIsLoading(null);
    }
  }, [detectLanguageFromSample, ensureDocument, language, persist, toast]);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) return;
    const runId = ++translateRunIdRef.current;
    translateAbortRef.current?.abort();
    const ac = new AbortController();
    translateAbortRef.current = ac;
    setIsLoading('Translating…');
    try {
      await ensureDocument({ originalContent: inputText, targetLanguage: language });
      const res = await translateDocument(inputText, language, { signal: ac.signal, sourceLanguage: detectedLanguage });
      if (runId !== translateRunIdRef.current) return;
      setOutputText(res);
      persist({ originalContent: inputText, translatedContent: res, targetLanguage: language });

      toast({ type: 'success', title: 'Translated', message: 'Translation is ready.' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast({ type: 'error', title: 'Translation failed', message: err?.message ? String(err.message) : 'Translation failed' });
    } finally {
      if (runId === translateRunIdRef.current) setIsLoading(null);
    }
  }, [detectedLanguage, ensureDocument, inputText, language, persist, toast]);

  const handleSummarize = useCallback(async () => {
    if (!canUseDownstream) {
      toast({ type: 'error', title: 'Translate first', message: 'Please extract and translate a document first.' });
      return;
    }
    const src = outputText.trim() ? outputText : inputText;
    if (!src.trim()) return;
    const runId = ++summarizeRunIdRef.current;
    summarizeAbortRef.current?.abort();
    const ac = new AbortController();
    summarizeAbortRef.current = ac;
    setIsLoading('Summarizing…');
    try {
      await ensureDocument({ originalContent: inputText, translatedContent: outputText, targetLanguage: language });
      const res = await summarizeDocument(src, language);
      if (runId !== summarizeRunIdRef.current) return;
      setSummaryText(res);
      persist({ originalContent: inputText, translatedContent: outputText, summary: res, targetLanguage: language });

      toast({ type: 'success', title: 'Summarized', message: 'Summary is ready.' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast({ type: 'error', title: 'Summarization failed', message: err?.message ? String(err.message) : 'Summarization failed' });
    } finally {
      if (runId === summarizeRunIdRef.current) setIsLoading(null);
    }
  }, [ensureDocument, inputText, outputText, language, persist, toast]);

  const handleCopy = useCallback(async () => {
    if (!outputText.trim()) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopyState('copied');
    } catch (e) {
      toast({ type: 'error', title: 'Copy failed', message: 'Clipboard permission may be blocked by the browser.' });
    }
  }, [outputText, toast]);

  const handleSummaryCopy = useCallback(async () => {
    if (!summaryText.trim()) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      setSummaryCopyState('copied');
    } catch (e) {
      toast({ type: 'error', title: 'Copy failed', message: 'Clipboard permission may be blocked by the browser.' });
    }
  }, [summaryText, toast]);

  const sanitizeBaseName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return 'translated-document';
    const noExt = trimmed.replace(/\.[a-z0-9]+$/i, '');
    const cleaned = noExt.replace(/[^a-z0-9\-_ ]+/gi, '').trim().replace(/\s+/g, '-');
    return cleaned || 'translated-document';
  }, []);

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = fileName;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  const handleDownloadTxt = useCallback(() => {
    if (!outputText.trim()) return;
    const base = sanitizeBaseName(savedDocRef.current?.fileName ?? 'translated-document');
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${base}.txt`);
    setDownloadOpen(false);
  }, [downloadBlob, outputText, sanitizeBaseName]);

  const handleDownloadDoc = useCallback(() => {
    if (!outputText.trim()) return;
    const base = sanitizeBaseName(savedDocRef.current?.fileName ?? 'translated-document');

    const lines = outputText.replace(/\r\n/g, '\n').split('\n');
    const isBullet = (line: string) => /^\s*(?:[-*•]|\d+\.|\d+\))\s+\S+/.test(line);
    const isHeading = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.length > 80) return false;
      if (/[:：]$/.test(trimmed)) return true;
      const letters = trimmed.replace(/[^A-Za-z]/g, '');
      if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
      if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return true;
      return false;
    };

    const children: Paragraph[] = [];
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: '' }));
        continue;
      }

      if (isHeading(trimmed)) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed, bold: true })],
            spacing: { after: 120 },
          })
        );
        continue;
      }

      if (isBullet(trimmed)) {
        const text = trimmed.replace(/^\s*(?:[-*•]|\d+\.|\d+\))\s+/, '');
        children.push(new Paragraph({ text, bullet: { level: 0 } }));
        continue;
      }

      children.push(new Paragraph({ text: trimmed }));
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    void Packer.toBlob(doc).then((blob) => {
      downloadBlob(blob, `${base}.docx`);
      setDownloadOpen(false);
    });
  }, [downloadBlob, outputText, sanitizeBaseName]);

  const handleSummaryDownloadTxt = useCallback(() => {
    if (!summaryText.trim()) return;
    const base = sanitizeBaseName(savedDocRef.current?.fileName ?? 'summary');
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${base}-summary.txt`);
    setSummaryDownloadOpen(false);
  }, [downloadBlob, sanitizeBaseName, summaryText]);

  const handleSummaryDownloadDoc = useCallback(() => {
    if (!summaryText.trim()) return;
    const base = sanitizeBaseName(savedDocRef.current?.fileName ?? 'summary');

    const lines = summaryText.replace(/\r\n/g, '\n').split('\n');
    const isBullet = (line: string) => /^\s*(?:[-*•]|\d+\.|\d+\))\s+\S+/.test(line);
    const isHeading = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.length > 80) return false;
      if (/[:：]$/.test(trimmed)) return true;
      const letters = trimmed.replace(/[^A-Za-z]/g, '');
      if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
      if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return true;
      return false;
    };

    const children: Paragraph[] = [];
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: '' }));
        continue;
      }

      if (isHeading(trimmed)) {
        children.push(new Paragraph({ children: [new TextRun({ text: trimmed, bold: true })], spacing: { after: 120 } }));
        continue;
      }

      if (isBullet(trimmed)) {
        const text = trimmed.replace(/^\s*(?:[-*•]|\d+\.|\d+\))\s+/, '');
        children.push(new Paragraph({ text, bullet: { level: 0 } }));
        continue;
      }

      children.push(new Paragraph({ text: trimmed }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    void Packer.toBlob(doc).then((blob) => {
      downloadBlob(blob, `${base}-summary.docx`);
      setSummaryDownloadOpen(false);
    });
  }, [downloadBlob, sanitizeBaseName, summaryText]);

  const renderFormattedText = useCallback((text: string) => {
    const src = String(text || '').replace(/\r\n/g, '\n');
    const lines = src.split('\n');

    const isBullet = (line: string) => /^\s*(?:[-*•]|\d+\.|\d+\))\s+\S+/.test(line);
    const isHeading = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.length > 80) return false;
      if (/[:：]$/.test(trimmed)) return true;
      const letters = trimmed.replace(/[^A-Za-z]/g, '');
      if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
      if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return true;
      return false;
    };

    const nodes: React.ReactNode[] = [];
    let bulletItems: string[] = [];

    const flushBullets = (keyPrefix: string) => {
      if (bulletItems.length === 0) return;
      nodes.push(
        <ul key={`${keyPrefix}-ul-${nodes.length}`} className="list-disc pl-6 space-y-1 text-white/75">
          {bulletItems.map((b, idx) => (
            <li key={idx} className="leading-7">{b.replace(/^\s*(?:[-*•]|\d+\.|\d+\))\s+/, '')}</li>
          ))}
        </ul>
      );
      bulletItems = [];
    };

    const normalizeLine = (rawLine: string) => {
      let line = String(rawLine || '');
      line = line.replace(/\s+$/g, '');
      line = line.replace(/\s+/g, ' ');
      line = line.replace(/\s*([•*-]|\d+\.|\d+\))\s*/g, (m) => m.trim() + ' ');
      return line;
    };

    for (let i = 0; i < lines.length; i++) {
      const raw = normalizeLine(lines[i]);
      const line = raw.replace(/\s+$/g, '');
      const trimmed = line.trim();

      if (!trimmed) {
        flushBullets('blank');
        nodes.push(<div key={`sp-${i}`} className="h-3" />);
        continue;
      }

      if (isBullet(trimmed)) {
        bulletItems.push(trimmed);
        continue;
      }

      flushBullets('text');

      if (isHeading(trimmed)) {
        nodes.push(
          <div key={`h-${i}`} className="text-white/90 font-semibold tracking-tight">
            {trimmed}
          </div>
        );
      } else {
        nodes.push(
          <p key={`p-${i}`} className="text-[15px] leading-7 text-white/75">
            {trimmed}
          </p>
        );
      }
    }

    flushBullets('end');

    return <div className="space-y-2">{nodes}</div>;
  }, []);

  const handleChatSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canUseDownstream) {
        toast({ type: 'error', title: 'Translate first', message: 'Please extract and translate a document first.' });
        return;
      }
      const src = outputText.trim() ? outputText : inputText;
      if (!src.trim() || !chatInput.trim()) return;

      await ensureDocument({ originalContent: inputText, translatedContent: outputText, summary: summaryText, chatHistory, targetLanguage: language });

      const userMessage: ChatMessage = { sender: 'user', text: chatInput };
      const nextHistory = [...chatHistory, userMessage];
      setChatHistory(nextHistory);
      persist({ originalContent: inputText, translatedContent: outputText, summary: summaryText, chatHistory: nextHistory, targetLanguage: language });
      const q = chatInput;
      setChatInput('');

      setIsLoading('Assistant is thinking…');
      try {
        const resp = await chatWithDocument(src, nextHistory, q, language);
        setChatHistory((prev) => {
          const updated: ChatMessage[] = [...prev, { sender: 'ai' as const, text: resp }];
          persist({ originalContent: inputText, translatedContent: outputText, summary: summaryText, chatHistory: updated, targetLanguage: language });
          return updated;
        });
      } finally {
        setIsLoading(null);
        window.setTimeout(() => {
          chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
      }
    },
    [canUseDownstream, chatHistory, chatInput, ensureDocument, inputText, language, outputText, persist, summaryText, toast]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {renderFullscreenPane}
      <div className="relative z-40 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setTab('translate')}
                className={
                  tab === 'translate'
                    ? 'inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white'
                    : 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:text-white transition-colors'
                }
              >
                <TranslateIcon className="h-4 w-4" />
                Translation
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canAccessDownstreamTabs) {
                    toast({ type: 'error', title: 'Upload + translate first', message: 'Please upload and translate a document first.' });
                    return;
                  }
                  setTab('summarize');
                }}
                disabled={!canAccessDownstreamTabs}
                className={
                  tab === 'summarize'
                    ? 'inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white'
                    : !canAccessDownstreamTabs
                      ? 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/35 cursor-not-allowed'
                      : 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:text-white transition-colors'
                }
              >
                <SummarizeIcon className="h-4 w-4" />
                Summarization
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canAccessDownstreamTabs) {
                    toast({ type: 'error', title: 'Upload + translate first', message: 'Please upload and translate a document first.' });
                    return;
                  }
                  setTab('chat');
                }}
                disabled={!canAccessDownstreamTabs}
                className={
                  tab === 'chat'
                    ? 'inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white'
                    : !canAccessDownstreamTabs
                      ? 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/35 cursor-not-allowed'
                      : 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:text-white transition-colors'
                }
              >
                <ChatIcon className="h-4 w-4" />
                Chat
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70">
              <span className="text-white/60">{detectedLanguage}</span>
              <span className="text-white/35">→</span>
              <span className="text-white/80">{language}</span>
            </div>
            <div className="relative" ref={languageRef}>
              <button
                type="button"
                onClick={() => setLanguageOpen((o) => !o)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 pl-3 pr-3 py-2 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/10"
                aria-haspopup="listbox"
                aria-expanded={isLanguageOpen}
              >
                <span className="max-w-[160px] truncate">{language}</span>
                <ChevronDownIcon className="h-5 w-5 text-white/55" />
              </button>

              {isLanguageOpen ? (
                <div
                  className="absolute right-0 top-full mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/95 shadow-soft backdrop-blur-xl z-50"
                  role="listbox"
                >
                  {LANGUAGES.map((lang) => {
                    const active = lang.name === language;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setLanguage(lang.name);
                          setLanguageOpen(false);
                          persist({ targetLanguage: lang.name, originalContent: inputText, translatedContent: outputText, summary: summaryText, chatHistory });
                        }}
                        className={
                          active
                            ? 'flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white bg-white/10'
                            : 'flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors'
                        }
                        role="option"
                        aria-selected={active}
                      >
                        <span className="truncate">{lang.name}</span>
                        {active ? <span className="text-xs text-white/60">Selected</span> : <span className="text-xs text-white/40">&nbsp;</span>}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {tab === 'translate' ? (
              <button
                type="button"
                onClick={handleTranslate}
                disabled={!canTranslate}
                className={BUTTON.primary}
              >
                {isLoading === 'Translating…' ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5" /> Translating…</span> : 'Translate'}
              </button>
            ) : tab === 'summarize' ? (
              <button
                type="button"
                onClick={handleSummarize}
                disabled={!canUseDownstream || !!isLoading}
                className={BUTTON.primary}
              >
                {isLoading === 'Summarizing…' ? <span className="inline-flex items-center gap-2"><Spinner className="h-5 w-5" /> Summarizing…</span> : 'Summarize'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {tab === 'translate' ? (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
            {isLoading === 'Parsing file…' ? <LoadingOverlay message={isLoading} /> : null}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-sm font-medium text-white/80">Original Document</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedPane('original')}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  aria-label="Expand original document"
                >
                  ⤢
                </button>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10">
                  <span className="inline-flex items-center gap-2"><UploadIcon className="h-4 w-4" /> Upload</span>
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileUpload(file);
                      e.currentTarget.value = '';
                    }}
                    className="hidden"
                    disabled={!!isLoading}
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-6 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden rounded-2xl">
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setOutputText('');
                    persist({ originalContent: e.target.value, translatedContent: '', summary: '', chatHistory: [], targetLanguage: language });
                  }}
                  placeholder="Paste or upload a document to begin…"
                  className="min-h-0 h-full w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5 text-[15px] leading-7 text-white/80 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
                  disabled={!!isLoading}
                />
              </div>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
            {isLoading === 'Translating…' ? <LoadingOverlay message={isLoading} /> : null}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-sm font-medium text-white/80">Translated Output</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedPane('translated')}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  aria-label="Expand translated output"
                >
                  ⤢
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!canCopy || !!isLoading}
                  className={`${BUTTON.secondary} px-3 py-2 text-xs`}
                >
                  {copyState === 'copied' ? 'Copied' : 'Copy'}
                </button>

                <div className="relative" ref={downloadRef}>
                  <button
                    type="button"
                    onClick={() => setDownloadOpen((o) => !o)}
                    disabled={!canCopy || !!isLoading}
                    className={`${BUTTON.secondary} px-3 py-2 text-xs`}
                  >
                    Download ▾
                  </button>

                  {downloadOpen ? (
                    <div className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/95 shadow-soft backdrop-blur-xl z-50">
                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors"
                      >
                        .txt
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadDoc}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors"
                      >
                        .docx
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-6 overflow-hidden">
              <div className="h-full min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5">
                {outputText ? (
                  renderFormattedText(outputText)
                ) : (
                  <div className="text-sm text-white/45">Your translation will appear here after you click Translate.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'summarize' ? (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="relative flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
            <div className="border-b border-white/10 px-6 py-4 text-sm font-medium text-white/80">Source</div>
            <div className="flex-1 min-h-0 p-6">
              <textarea
                value={outputText.trim() ? outputText : inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setOutputText('');
                  setSummaryText('');
                }}
                placeholder="Paste or upload a document to begin…"
                className="h-full w-full resize-none rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5 text-[15px] leading-7 text-white/80 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)]"
                disabled={!!isLoading}
              />
            </div>
          </div>

          <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft">
            {isLoading === 'Summarizing…' ? <LoadingOverlay message={isLoading} /> : null}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="text-sm font-medium text-white/80">Summary</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedPane('summary')}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  aria-label="Expand summary"
                >
                  ⤢
                </button>
                <button
                  type="button"
                  onClick={handleSummaryCopy}
                  disabled={!summaryText.trim() || !!isLoading}
                  className={`${BUTTON.secondary} px-3 py-2 text-xs`}
                >
                  {summaryCopyState === 'copied' ? 'Copied' : 'Copy'}
                </button>

                <div className="relative" ref={summaryDownloadRef}>
                  <button
                    type="button"
                    onClick={() => setSummaryDownloadOpen((o) => !o)}
                    disabled={!summaryText.trim() || !!isLoading}
                    className={`${BUTTON.secondary} px-3 py-2 text-xs`}
                  >
                    Download ▾
                  </button>

                  {summaryDownloadOpen ? (
                    <div className="absolute right-0 top-full mt-2 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/95 shadow-soft backdrop-blur-xl z-50">
                      <button
                        type="button"
                        onClick={handleSummaryDownloadTxt}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors"
                      >
                        .txt
                      </button>
                      <button
                        type="button"
                        onClick={handleSummaryDownloadDoc}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-white/85 hover:bg-white/5 transition-colors"
                      >
                        .docx
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-6">
              <div className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1224]/40 p-5">
                {summaryText ? (
                  renderFormattedText(summaryText)
                ) : (
                  <div className="text-sm text-white/45">Summary will appear here after processing.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-soft overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4">
            <div className="text-sm font-semibold text-white">Chat with your text</div>
            <div className="mt-1 text-xs text-white/50">Use translated output if available, otherwise your original input.</div>
          </div>

          <div ref={chatContainerRef} className="h-[420px] overflow-y-auto p-4 sm:p-5 space-y-3">
            {chatHistory.length === 0 ? (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <div className="text-sm font-medium text-white/80">Ask a question</div>
                  <div className="mt-1 text-xs text-white/45">{canUseDownstream ? 'Try: “Extract key points” or “Rewrite in simpler language”.' : 'Please extract and translate a document first.'}</div>
                </div>
              </div>
            ) : (
              <>
                {chatHistory.map((msg, index) => (
                  <div key={index} className={msg.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        msg.sender === 'user'
                          ? 'max-w-[88%] rounded-2xl bg-accent-primary px-4 py-3 text-sm text-slate-900'
                          : 'max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80'
                      }
                    >
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</pre>
                    </div>
                  </div>
                ))}

                {isLoading === 'Assistant is thinking…' ? (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-white/10 p-3 sm:p-4">
            <form onSubmit={handleChatSubmit} className="flex items-end gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={canUseDownstream ? 'Ask anything…' : 'Please translate first…'}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 placeholder:text-white/40 outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.25)] disabled:opacity-60"
                disabled={!!isLoading || !canUseDownstream}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || !!isLoading || !canUseDownstream}
                className={`h-[46px] ${BUTTON.primary}`}
              >
                {isLoading === 'Assistant is thinking…' ? <Spinner className="h-5 w-5" /> : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
