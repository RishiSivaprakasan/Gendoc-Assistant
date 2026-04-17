import { z } from 'zod';
import { documentService } from '../services/documentService.js';

const chatMessageSchema = z.object({
  sender: z.enum(['user', 'ai']),
  text: z.string(),
});

const upsertSchema = z.object({
  fileName: z.string().min(1),
  originalContent: z.string().optional().default(''),
  translatedContent: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  chatHistory: z.array(chatMessageSchema).optional().default([]),
  targetLanguage: z.string().optional().default('Tamil'),
});

const updateSchema = upsertSchema.partial();

export const documentController = {
  async list(req, res, next) {
    try {
      const docs = await documentService.listByUser(req.user.id);
      res.status(200).json({ documents: docs });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const payload = upsertSchema.parse(req.body);
      const doc = await documentService.create(req.user.id, payload);
      res.status(201).json({ document: doc });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const payload = updateSchema.parse(req.body);
      const doc = await documentService.update(req.user.id, req.params.id, payload);
      res.status(200).json({ document: doc });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const result = await documentService.remove(req.user.id, req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};
