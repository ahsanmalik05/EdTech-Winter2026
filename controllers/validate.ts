// controllers/validate.ts
import type { Request, Response } from 'express';
import { validateTranslation } from '../services/validate.js';

export const validateTranslationHandler = async (
  req: Request,
  res: Response
) => {
  const { original, translated, targetLanguage } = req.body;

  if (!original || typeof original !== 'string') {
    return res.status(400).json({ error: 'original is required and must be a string' });
  }
  if (!translated || typeof translated !== 'string') {
    return res.status(400).json({ error: 'translated is required and must be a string' });
  }
  if (!targetLanguage || typeof targetLanguage !== 'string') {
    return res.status(400).json({ error: 'targetLanguage is required and must be a string' });
  }

  try {
    const result = await validateTranslation(original, translated, targetLanguage);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ error: 'Failed to validate translation' });
  }
};