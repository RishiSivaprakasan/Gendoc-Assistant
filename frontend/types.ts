
export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface ProcessedDocument {
  id: string;
  fileName: string;
  originalContent: string;
  translatedContent: string;
  summary: string;
  chatHistory: ChatMessage[];
  targetLanguage: string;
  createdAt: string;
  updatedAt?: string;
}

export type Language = {
  code: string;
  name: string;
};
