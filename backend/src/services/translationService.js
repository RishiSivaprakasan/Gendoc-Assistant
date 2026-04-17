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
  async translate(text, targetLanguage) {
    if (!text) return '';
    const code = LANGUAGE_MAP[targetLanguage];
    if (!code) {
      const err = new Error('Unsupported language');
      err.status = 400;
      throw err;
    }

    try {
      const translated = await translateViaService({ text, targetLanguageCode: code });
      return String(translated || '').trim();
    } catch (err) {
      console.warn('[nllb] Service failed, falling back to Python CLI:', err instanceof Error ? err.message : String(err));
      const translated = await runPythonTranslate({ text, targetLanguageCode: code });
      return String(translated || '').trim();
    }
  },
};
