import { Document } from '../models/Document.js';
import { AppError } from '../utils/AppError.js';

export const documentService = {
  async listByUser(userId) {
    const docs = await Document.find({ userId }).sort({ updatedAt: -1 }).lean();
    return docs.map((d) => ({
      id: d._id.toString(),
      fileName: d.fileName,
      originalContent: d.originalContent,
      translatedContent: d.translatedContent,
      summary: d.summary,
      chatHistory: d.chatHistory,
      targetLanguage: d.targetLanguage,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  },

  async create(userId, payload) {
    const created = await Document.create({ ...payload, userId });
    return {
      id: created._id.toString(),
      fileName: created.fileName,
      originalContent: created.originalContent,
      translatedContent: created.translatedContent,
      summary: created.summary,
      chatHistory: created.chatHistory,
      targetLanguage: created.targetLanguage,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  },

  async update(userId, id, payload) {
    const updated = await Document.findOneAndUpdate(
      { _id: id, userId },
      { $set: payload },
      { new: true }
    );

    if (!updated) throw new AppError('Document not found', 404);

    return {
      id: updated._id.toString(),
      fileName: updated.fileName,
      originalContent: updated.originalContent,
      translatedContent: updated.translatedContent,
      summary: updated.summary,
      chatHistory: updated.chatHistory,
      targetLanguage: updated.targetLanguage,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  async remove(userId, id) {
    const deleted = await Document.findOneAndDelete({ _id: id, userId });
    if (!deleted) throw new AppError('Document not found', 404);
    return { ok: true };
  },
};
