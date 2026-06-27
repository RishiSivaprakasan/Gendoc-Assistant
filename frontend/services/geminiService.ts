
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = "gemini-2.5-flash-lite";

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    if (!text) return '';
    try {
        const prompt = `Translate the following text to ${targetLanguage}. Strictly preserve the original tone, structure, paragraph breaks, and line breaks. Maintain any formatting like lists or headings. Do not add any extra commentary or explanation, just provide the translated text.\n\nText:\n\n---\n${text}\n---`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });

        return response.text;
    } catch (error) {
        console.error("Translation error:", error);
        return "Error: Could not translate the document.";
    }
};

export const summarizeText = async (text: string, language: string): Promise<string> => {
    if (!text) return '';
    try {
        const prompt = `Provide a concise, easy-to-understand summary of the following text in ${language}. The summary should capture the main points and key information. Present the summary in bullet points.\n\nText:\n\n---\n${text}\n---`;
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });
        
        return response.text;
    } catch (error) {
        console.error("Summarization error:", error);
        return "Error: Could not summarize the document.";
    }
};

export const chatWithDocument = async (
    documentText: string,
    chatHistory: ChatMessage[],
    question: string,
    language: string,
    fileContext?: { fileName?: string; fileType?: string; extractionMethod?: string }
): Promise<string> => {
    if (!documentText || !question) return '';

    // Simplified history for context
    const historyContext = chatHistory
        .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
        .join('\n');

    const contextLines: string[] = [];
    if (fileContext?.fileName) contextLines.push(`- File name: ${fileContext.fileName}`);
    if (fileContext?.fileType) contextLines.push(`- File type: ${fileContext.fileType}`);
    if (fileContext?.extractionMethod) contextLines.push(`- Text source: ${fileContext.extractionMethod}`);
    const fileContextSection = contextLines.length > 0 ? contextLines.join('\n') : '- File details: (not provided)';
    
    try {
        const prompt = `You are a helpful, conversational assistant answering questions about an uploaded file.

        IMPORTANT CONTEXT ABOUT THE FILE:
        ${fileContextSection}

        IMPORTANT RULES:
        1. Use ONLY the extracted text content provided below as your source of truth.
        2. Do NOT add any information that is not present in the extracted text.
        3. If the answer is not found in the extracted text, politely say so.
        4. If the uploaded file is an IMAGE or a scanned PDF and the user asks visual questions (colors, objects, positions), be honest: you cannot see the image itself. You only have OCR-extracted text.
        5. If the user asks questions like "What is this image about?" or "What is this PDF about?", treat it as: summarize what the extracted text says the file is about.

        DOCUMENT CONTENT:
        ---
        ${documentText}
        ---
        
        CHAT HISTORY:
        ---
        ${historyContext}
        ---

        Based on the document content and chat history, answer the user's latest question.
        
        USER QUESTION: "${question}"
        
        INSTRUCTIONS:
        1. Use a friendly and conversational tone.
        2. Keep the response concise and natural.
        3. After answering, ask a short follow-up question that encourages the user to continue exploring the file.
        4. Respond first in ${language}, then provide the same response in English.

        Format:

        * First: Answer + follow-up in ${language}
        * Then: "In English:" followed by the same answer + follow-up in English

        Do not use rigid formatting tags or labels. Keep it natural and readable.
        `;
        
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.3 }
        });
        
        return response.text;
    } catch (error) {
        console.error("Chat error:", error);
        return "Error: Could not get a response from the assistant.";
    }
};
