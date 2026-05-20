import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AIParserService } from '../utils/aiParser';

const router = Router();

// Parse Real Estate Ad Text
router.post('/parse', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'يرجى إدخال النص المراد تحليله.' });
    }

    const draft = await AIParserService.parseText(text);

    return res.json(draft);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في محرك الذكاء الاصطناعي أثناء تحليل النص.' });
  }
});

export default router;
