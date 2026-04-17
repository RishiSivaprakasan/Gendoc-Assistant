import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { chatWithDocument as geminiChatWithDocument, summarizeText, translateText } from './geminiService';
import { translate as nllbTranslate } from './translationService';
import type { ChatMessage } from '../types';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

type PipelineBlock = {
  type: 'heading' | 'paragraph' | 'bullet';
  content: string;
};

type PipelineLayout = {
  blocks: PipelineBlock[];
};

type PipelineMetadata = {
  fileName: string;
  type: string;
};

export type PipelineExtractedDocument = {
  text: string;
  layout?: PipelineLayout;
  metadata: PipelineMetadata;
  blocks: PipelineBlock[];
};

type ProcessOptions = {
  // reserved for future pipeline options (OCR, layout extraction, etc.)
};

function normalizeNewlines(text: string): string {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function removeIsolatedNoiseLines(text: string): string {
  const lines = normalizeNewlines(text).split('\n');
  const cleaned: string[] = [];

  for (const rawLine of lines) {
    const line = String(rawLine || '');
    const trimmed = line.trim();

    if (!trimmed) {
      cleaned.push('');
      continue;
    }

    if (/^\d$/.test(trimmed)) {
      continue;
    }
    if (/^[•\-–—_.,;:|\\/]+$/.test(trimmed)) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join('\n');
}

function cleanExtractedText(text: string): string {
  let t = normalizeNewlines(text);
  t = t.replace(/\u00a0/g, ' ');
  t = removeIsolatedNoiseLines(t);

  // Keep paragraph spacing, but normalize pathological whitespace.
  t = t
    .split('\n')
    .map((l) => String(l).replace(/[ \t]+$/g, ''))
    .join('\n');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{4,}/g, '\n\n\n');

  return t.trim();
}

function isBulletLine(line: string): boolean {
  return /^\s*(?:[-*•]|\d+\.|\d+\))\s+\S+/.test(line);
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (/[:：]$/.test(trimmed)) return true;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
  if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return true;
  return false;
}

function toStructuredBlocks(text: string): PipelineBlock[] {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split('\n');

  const blocks: PipelineBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const joined = paragraph.join(' ').trim();
    paragraph = [];
    if (joined) blocks.push({ type: 'paragraph', content: joined });
  };

  const isSentenceEnd = (s: string) => /[.!?।]$/.test(s);
  const looksLikeNewParagraphStart = (s: string) => /^["'“‘(\[]?[A-Z0-9]/.test(s);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const line = rawLine.replace(/\s+$/g, '');
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (isBulletLine(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'bullet', content: trimmed });
      continue;
    }

    if (isHeadingLine(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'heading', content: trimmed });
      continue;
    }

    const prev = paragraph.length > 0 ? paragraph[paragraph.length - 1] : '';
    if (prev && isSentenceEnd(prev) && looksLikeNewParagraphStart(trimmed) && prev.length <= 160) {
      flushParagraph();
    }

    paragraph.push(trimmed);
  }

  flushParagraph();

  if (blocks.length === 0 && normalized.trim()) {
    return [{ type: 'paragraph', content: normalized.trim() }];
  }

  return blocks;
}

function rebuildTextFromBlocks(blocks: PipelineBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    const content = (b.content || '').trim();
    if (!content) continue;

    if (b.type === 'heading') {
      out.push(content);
      out.push('');
      continue;
    }

    if (b.type === 'bullet') {
      out.push(content);
      continue;
    }

    out.push(content);
    out.push('');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function cleanupTranslatedText(text: string): string {
  let t = String(text || '');
  t = t.replace(/(®|©|™)\1+/g, '$1');
  t = t.replace(/([!?.,])\1{2,}/g, '$1$1');
  t = t.replace(/\u00a0/g, ' ');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function splitIntoChunks(text: string, maxChars = 900): string[] {
  const src = String(text || '').trim();
  if (!src) return [];
  if (src.length <= maxChars) return [src];

  const chunks: string[] = [];
  let buf = '';

  const parts = src.split(/(?<=[.!?।])\s+/g);
  for (const p of parts) {
    const next = buf ? `${buf} ${p}` : p;
    if (next.length > maxChars && buf) {
      chunks.push(buf);
      buf = p;
      continue;
    }
    buf = next;
  }
  if (buf) chunks.push(buf);

  if (chunks.length === 0) return [src];
  return chunks;
}

async function translateChunk(
  text: string,
  language: string,
  options?: { signal?: AbortSignal; sourceLanguage?: string }
): Promise<string> {
  const cleaned = String(text || '').trim();
  if (!cleaned) return '';

  try {
    console.info('[translate] Using NLLB service');
    const translated = await nllbTranslate(cleaned, language, { signal: options?.signal, sourceLanguage: options?.sourceLanguage });
    return cleanupTranslatedText(translated);
  } catch (error) {
    console.warn('[translate] Falling back to Gemini');
    const translated = await translateText(cleaned, language);
    return cleanupTranslatedText(translated);
  }
}

async function translateBlockContent(
  block: PipelineBlock,
  language: string,
  ctx: {
    signal?: AbortSignal;
    sourceLanguage?: string;
    cache: Map<string, Promise<string>>;
  }
): Promise<string> {
  const raw = String(block.content || '').trim();
  if (!raw) return '';

  const cachedTranslate = (chunk: string) => {
    const key = `${ctx.sourceLanguage || 'English'}::${language}::${chunk}`;
    const hit = ctx.cache.get(key);
    if (hit) return hit;
    const p = translateChunk(chunk, language, { signal: ctx.signal, sourceLanguage: ctx.sourceLanguage });
    ctx.cache.set(key, p);
    return p;
  };

  if (block.type === 'bullet') {
    const m = raw.match(/^(\s*(?:[-*•]|\d+\.|\d+\))\s+)(.*)$/);
    const prefix = m ? m[1] : '';
    const body = m ? m[2] : raw;
    const translatedBodyParts: string[] = [];
    for (const c of splitIntoChunks(body)) {
      translatedBodyParts.push(await cachedTranslate(c));
    }
    return cleanupTranslatedText(`${prefix}${translatedBodyParts.join(' ')}`);
  }

  const parts: string[] = [];
  for (const c of splitIntoChunks(raw)) {
    parts.push(await cachedTranslate(c));
  }
  return cleanupTranslatedText(parts.join(' '));
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

  const outPages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const lines: string[] = [];
    let current = '';
    let lastX: number | null = null;
    let lastY: number | null = null;

    for (const item of textContent.items as any[]) {
      if (!item || typeof item.str !== 'string') continue;
      const str = String(item.str || '');
      if (!str) continue;

      const transform = Array.isArray(item.transform) ? item.transform : null;
      const x = transform ? Number(transform[4]) : null;
      const y = transform ? Number(transform[5]) : null;

      const hasEOL = Boolean(item.hasEOL);

      const yChanged = lastY != null && y != null && Math.abs(y - lastY) > 2;
      if (yChanged) {
        if (current.trim()) lines.push(current.trimEnd());
        current = '';
        lastX = null;
      }

      const needsSpace =
        current &&
        !/\s$/.test(current) &&
        !/^\s/.test(str) &&
        !/[([{"'“‘]$/.test(current) &&
        !/^[)\]}",'”’.,;:!?]/.test(str) &&
        lastX != null &&
        x != null &&
        x - lastX > 2;

      if (needsSpace) current += ' ';
      current += str;

      if (x != null) lastX = x + str.length;
      if (y != null) lastY = y;

      if (hasEOL) {
        if (current.trim()) lines.push(current.trimEnd());
        current = '';
        lastX = null;
      }
    }

    if (current.trim()) lines.push(current.trimEnd());

    outPages.push(lines.join('\n'));
  }

  return outPages.join('\n\n');
}

async function extractTextWithOCR(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    const res = await Tesseract.recognize(file, 'eng+tam', {
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1',
    } as any);
    return res.data.text || '';
  }

  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = window.document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({ canvasContext: context as any, viewport }).promise;

      const res = await Tesseract.recognize(canvas, 'eng+tam', {
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      } as any);
      const text = res.data.text || '';
      if (text.trim()) pageTexts.push(text);
    }

    return pageTexts.join('\n\n');
  }

  throw new Error('OCR_UNSUPPORTED_FILE');
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const htmlRes = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: ['p[style-name="Heading 1"] => h1:fresh', 'p[style-name="Heading 2"] => h2:fresh'],
  });
  const html = String(htmlRes.value || '');

  const toText = (src: string) =>
    src
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h1>/gi, '\n\n')
      .replace(/<\/h2>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  return toText(html);
}

async function extractTextFromTxt(file: File): Promise<string> {
  return file.text();
}

export async function processDocument(file: File, _options?: ProcessOptions): Promise<PipelineExtractedDocument> {
  let text = '';

  if (file.type === 'text/plain') {
    text = await extractTextFromTxt(file);
  } else if (file.name.toLowerCase().endsWith('.docx')) {
    text = await extractTextFromDocx(file);
  } else if (file.type === 'application/pdf') {
    text = await extractTextFromPdf(file);
    if (!text.trim()) {
      text = await extractTextWithOCR(file);
    }
  } else if (file.type.startsWith('image/')) {
    text = await extractTextWithOCR(file);
  } else {
    throw new Error('UNSUPPORTED_FILE');
  }

  const cleaned = cleanExtractedText(text);
  const blocks = toStructuredBlocks(cleaned);
  const rebuilt = rebuildTextFromBlocks(blocks);

  return {
    text: rebuilt || cleaned || text,
    blocks,
    layout: {
      blocks,
    },
    metadata: {
      fileName: file.name,
      type: file.type || (file.name.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : ''),
    },
  };
}

export async function translateDocument(
  content: string,
  language: string,
  options?: { signal?: AbortSignal; sourceLanguage?: string }
): Promise<string> {
  if (!content) return '';
  const cleaned = cleanExtractedText(content);
  const blocks = toStructuredBlocks(cleaned);
  const cache = new Map<string, Promise<string>>();
  const translatedBlocks: PipelineBlock[] = [];
  const ctx = { signal: options?.signal, sourceLanguage: options?.sourceLanguage, cache };
  for (const b of blocks) {
    const translatedContent = await translateBlockContent(b, language, ctx);
    translatedBlocks.push({ ...b, content: translatedContent });
  }
  return cleanupTranslatedText(rebuildTextFromBlocks(translatedBlocks));
}

export async function summarizeDocument(content: string, language: string): Promise<string> {
  return summarizeText(content, language);
}

export async function chatWithDocument(
  content: string,
  history: ChatMessage[],
  question: string,
  language: string
): Promise<string> {
  return geminiChatWithDocument(content, history, question, language);
}
