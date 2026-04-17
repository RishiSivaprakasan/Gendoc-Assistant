import { apiRequest } from './api';
import type { ProcessedDocument } from '../types';

type DocumentDto = {
  id: string;
  fileName: string;
  originalContent: string;
  translatedContent: string;
  summary: string;
  chatHistory: ProcessedDocument['chatHistory'];
  targetLanguage: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentCreatePayload = {
  fileName: string;
  originalContent: string;
  translatedContent: string;
  summary: string;
  chatHistory: ProcessedDocument['chatHistory'];
  targetLanguage: string;
};

export type DocumentUpdatePayload = Partial<DocumentCreatePayload>;

function cleanUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function listDocuments(token: string) {
  return apiRequest<{ documents: DocumentDto[] }>('/documents', { method: 'GET', token });
}

export async function createDocument(token: string, doc: DocumentCreatePayload) {
  return apiRequest<{ document: DocumentDto }>('/documents', {
    method: 'POST',
    token,
    body: doc,
  });
}

export async function updateDocument(token: string, id: string, patch: DocumentUpdatePayload) {
  return apiRequest<{ document: DocumentDto }>(`/documents/${id}`, {
    method: 'PATCH',
    token,
    body: cleanUndefined({
      fileName: patch.fileName,
      originalContent: patch.originalContent,
      translatedContent: patch.translatedContent,
      summary: patch.summary,
      chatHistory: patch.chatHistory,
      targetLanguage: patch.targetLanguage,
    }),
  });
}

export async function deleteDocument(token: string, id: string) {
  return apiRequest<{ ok: true }>(`/documents/${id}`, {
    method: 'DELETE',
    token,
  });
}
