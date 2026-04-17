import { apiRequest } from './api';

export async function translate(
  text: string,
  targetLanguage: string,
  options?: { signal?: AbortSignal; sourceLanguage?: string }
): Promise<string> {
  if (!text) return '';
  const res = await apiRequest<{ translatedText: string }>('/translate', {
    method: 'POST',
    body: { text, targetLanguage },
    signal: options?.signal,
  });
  return res.translatedText || '';
}
