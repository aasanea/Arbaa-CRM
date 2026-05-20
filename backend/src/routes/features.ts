import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get all feature flags (Admin/Super Admin only)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isPowerUser = req.user?.roleName === 'SUPER_ADMIN' || req.user?.roleName === 'ADMIN';
    if (!isPowerUser) {
      return res.status(403).json({ error: 'غير مصرح بالدخول للوحة التحكم.' });
    }

    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
    return res.json(flags);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تحميل مفاتيح الميزات.' });
  }
});

// 2. Toggle global or sales agent availability for a feature flag (Admin/Super Admin only)
router.put('/:key', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isPowerUser = req.user?.roleName === 'SUPER_ADMIN' || req.user?.roleName === 'ADMIN';
    if (!isPowerUser) {
      return res.status(403).json({ error: 'غير مصرح بتعديل الخصائص.' });
    }

    const { key } = req.params;
    const { enabledGlobal, enabledForSales } = req.body;

    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      return res.status(404).json({ error: 'الميزة المحددة غير موجودة.' });
    }

    const updated = await prisma.featureFlag.update({
      where: { key },
      data: {
        enabledGlobal: enabledGlobal !== undefined ? enabledGlobal : flag.enabledGlobal,
        enabledForSales: enabledForSales !== undefined ? enabledForSales : flag.enabledForSales,
      },
    });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'FEATURE_FLAG_UPDATE',
      entity: 'FEATURE',
      details: {
        featureKey: key,
        enabledGlobal: updated.enabledGlobal,
        enabledForSales: updated.enabledForSales,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل حالة الميزة.' });
  }
});

// 3. Get list of all active feature keys for the current user's role
router.get('/active', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roleName = req.user?.roleName;
    const isSalesAgent = roleName === 'MARKETER' || roleName === 'SALES_MANAGER';

    const allFlags = await prisma.featureFlag.findMany({
      where: {
        enabledGlobal: true,
      },
    });

    // If sales agent, filter out flags disabled for sales agents
    const activeFlags = isSalesAgent
      ? allFlags.filter((f) => f.enabledForSales)
      : allFlags;

    const activeKeys = activeFlags.map((f) => f.key);
    return res.json({ activeKeys });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تحميل الميزات النشطة.' });
  }
});

export default router;
