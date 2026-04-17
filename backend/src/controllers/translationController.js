import { z } from 'zod';
import { translationService } from '../services/translationService.js';

const translateSchema = z.object({
  text: z.string().min(1),
  targetLanguage: z.string().min(1),
  preserveStructure: z.boolean().optional().default(true),
  glossary: z.record(z.string()).optional(),
});

export const translationController = {
  async translate(req, res, next) {
    try {
      const body = translateSchema.parse(req.body);
      const translatedText = await translationService.translate(body.text, body.targetLanguage, {
        preserveStructure: body.preserveStructure,
        glossary: body.glossary,
      });
      res.status(200).json({ translatedText });
    } catch (err) {
      next(err);
    }
  },
};
