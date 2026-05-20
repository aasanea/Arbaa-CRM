import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 1. Get notifications for the logged-in user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50
    });
    return res.json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تحميل التنبيهات.' });
  }
});

// 2. Mark specific notification as read
router.patch('/:id/read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const notif = await prisma.notification.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!notif) {
      return res.status(404).json({ error: 'التنبيه غير موجود.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل حالة التنبيه.' });
  }
});

// 3. Mark all user notifications as read
router.post('/read-all', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ message: 'تم تحديد جميع التنبيهات كمقروءة.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث التنبيهات.' });
  }
});

export default router;
