import { spawn } from 'node:child_process';

const PY_SCRIPT = 'backend_translate_nllb.py';
const PYTHON_PATH = process.env.PYTHON_PATH || 'venv\\Scripts\\python.exe';
console.log('Using Python from:', PYTHON_PATH);

const LANGUAGE_MAP = {
  Tamil: 'tam_Taml',
  Telugu: 'tel_Telu',
  Kannada: 'kan_Knda',
  Malayalam: 'mal_Mlym',
  Hindi: 'hin_Deva',
  English: 'eng_Latn',
};

const PY_SERVICE_URL = process.env.NLLB_SERVICE_URL || 'http://127.0.0.1:8001';

const DEFAULT_GLOSSARY_BY_LANGUAGE = {
  Tamil: {
    Mysticetes: 'Mysticetes',
    'Baleen whales': 'Baleen whales',
    'baleen whales': 'baleen whales',
    Baleen: 'Baleen',
    baleen: 'baleen',
  },
};

function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function removeIsolatedNoiseLines(text) {
  const lines = normalizeNewlines(text).split('\n');
  const cleaned = [];

  for (const rawLine of lines) {
    const line = String(rawLine || '');
    const trimmed = line.trim();

    if (!trimmed) {
      cleaned.push('');
      continue;
    }

    // Common extraction/OCR artifacts: a single digit or stray symbol on its own line.
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

function cleanRawText(text) {
  let t = normalizeNewlines(text);
  t = t.replace(/\u00a0/g, ' ');
  t = removeIsolatedNoiseLines(t);

  // Trim trailing spaces per line, normalize excessive blank lines.
  t = t
    .split('\n')
    .map((l) => String(l).replace(/[ \t]+$/g, ''))
    .join('\n');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{4,}/g, '\n\n\n');

  return t.trim();
}

function isBulletLine(line) {
  return /^\s*(?:[-*•]|\d+\.|\d+\))\s+\S+/.test(line);
}

function isHeadingLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;
  if (trimmed.length > 80) return false;
  if (/[:：]$/.test(trimmed)) return true;
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) return true;
  if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return true;
  return false;
}

function toStructuredBlocks(text) {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split('\n');

  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    const joined = paragraph.join(' ').trim();
    paragraph = [];
    if (joined) blocks.push({ type: 'paragraph', content: joined });
  };

  for (const rawLine of lines) {
    const line = String(rawLine || '').replace(/\s+$/g, '');
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

    paragraph.push(trimmed);
  }

  flushParagraph();

  if (blocks.length === 0 && normalized.trim()) {
    return [{ type: 'paragraph', content: normalized.trim() }];
  }

  return blocks;
}

function rebuildTextFromBlocks(blocks) {
  const out = [];
  for (const b of blocks) {
    const content = String(b?.content || '').trim();
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

function cleanupOutputText(text) {
  let t = String(text || '');
  t = t.replace(/\u00a0/g, ' ');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''))
    .join('\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function protectGlossaryTerms(text, glossary) {
  const entries = glossary && typeof glossary === 'object' ? Object.entries(glossary) : [];
  const active = entries
    .map(([k, v]) => [String(k || '').trim(), String(v || '').trim()])
    .filter(([k, v]) => k.length > 0 && v.length > 0);
  if (active.length === 0) return { text, restore: (t) => t };

  // Deterministic placeholders to prevent translation from altering terms.
  const sorted = [...active].sort((a, b) => b[0].length - a[0].length);
  const placeholders = new Map();

  let t = String(text);
  sorted.forEach(([term, replacement], idx) => {
    const ph = `__GLOSSARY_${idx}__`;
    placeholders.set(ph, replacement);
    // Replace whole-word-ish occurrences; keep lightweight (avoid heavy NLP).
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ph);
  });

  const restore = (translated) => {
    let out = String(translated);
    for (const [ph, term] of placeholders.entries()) {
      out = out.replaceAll(ph, term);
    }
    return out;
  };

  return { text: t, restore };
}

async function translateViaService({ text, targetLanguageCode }) {
  console.log('[nllb] Using NLLB service:', PY_SERVICE_URL);
  const res = await fetch(`${PY_SERVICE_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage: targetLanguageCode }),
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === 'object' && data && 'detail' in data ? String(data.detail) : 'Translation service failed';
    throw new Error(msg);
  }

  const translatedText = typeof data === 'object' && data && 'translatedText' in data ? String(data.translatedText || '') : '';
  if (!translatedText.trim()) {
    throw new Error('Translation returned empty output');
  }
  return translatedText;
}

function runPythonTranslate({ text, targetLanguageCode }) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON_PATH, ['-u', PY_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NLLB_TGT_LANG: targetLanguageCode,
      },
    });

    let stdout = '';
    let stderr = '';

    py.stdout.setEncoding('utf8');
    py.stderr.setEncoding('utf8');

    py.stdout.on('data', (d) => {
      stdout += String(d);
    });

    py.stderr.on('data', (d) => {
      stderr += String(d);
      console.log('[nllb]', String(d).trimEnd());
    });

    py.on('error', (err) => reject(err));

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `Translation process exited with code ${code}`));
      }

      const out = String(stdout || '');

      if (!out.trim()) {
        return reject(new Error('Translation returned empty output'));
      }

      resolve(out);
    });

    py.stdin.write(text);
    py.stdin.end();
  });
}

export const translationService = {
  async translate(text, targetLanguage, options) {
    if (!text) return '';
    const code = LANGUAGE_MAP[targetLanguage];
    if (!code) {
      const err = new Error('Unsupported language');
      err.status = 400;
      throw err;
    }

    const preserveStructure = options?.preserveStructure !== false;
    const cleaned = cleanRawText(text);
    const userGlossary = options?.glossary;
    const defaultGlossary = DEFAULT_GLOSSARY_BY_LANGUAGE[targetLanguage] || undefined;
    const effectiveGlossary = userGlossary && Object.keys(userGlossary).length > 0 ? userGlossary : defaultGlossary;
    const glossaryPack = protectGlossaryTerms(cleaned, effectiveGlossary);

    try {
      if (!preserveStructure) {
        const translated = await translateViaService({ text: glossaryPack.text, targetLanguageCode: code });
        return glossaryPack.restore(String(translated || '')).trim();
      }

      const blocks = toStructuredBlocks(glossaryPack.text);
      const translatedBlocks = [];
      for (const b of blocks) {
        const raw = String(b.content || '').trim();
        if (!raw) continue;
        const translated = await translateViaService({ text: raw, targetLanguageCode: code });
        translatedBlocks.push({ ...b, content: String(translated || '').trim() });
      }

      return cleanupOutputText(glossaryPack.restore(rebuildTextFromBlocks(translatedBlocks)));
    } catch (err) {
      console.warn('[nllb] Service failed, falling back to Python CLI:', err instanceof Error ? err.message : String(err));

      if (!preserveStructure) {
        const translated = await runPythonTranslate({ text: glossaryPack.text, targetLanguageCode: code });
        return glossaryPack.restore(String(translated || '')).trim();
      }

      const blocks = toStructuredBlocks(glossaryPack.text);
      const translatedBlocks = [];
      for (const b of blocks) {
        const raw = String(b.content || '').trim();
        if (!raw) continue;
        const translated = await runPythonTranslate({ text: raw, targetLanguageCode: code });
        translatedBlocks.push({ ...b, content: String(translated || '').trim() });
      }

      return cleanupOutputText(glossaryPack.restore(rebuildTextFromBlocks(translatedBlocks)));
    }
  },
};
