import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit, getDiff } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get All CMS Settings
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.cmsSetting.findMany();
    // Convert array of [{key, value}] to simple record { key: value }
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return res.json(settingsMap);
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ في تحميل إعدادات النظام.' });
  }
});

// 2. Update CMS Settings (Requires manage_cms permission)
router.put('/', authMiddleware, checkPermission('manage_cms'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const newSettings: Record<string, string> = req.body;

    if (!newSettings || typeof newSettings !== 'object') {
      return res.status(400).json({ error: 'يرجى تقديم بيانات الإعدادات بشكل صحيح.' });
    }

    const oldSettingsList = await prisma.cmsSetting.findMany();
    const oldSettingsMap = oldSettingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    // Run updates in transaction
    await prisma.$transaction(
      Object.entries(newSettings).map(([key, value]) =>
        prisma.cmsSetting.upsert({
          where: { key },
          update: { value: value.toString() },
          create: { key, value: value.toString() },
        })
      )
    );

    // Compute diff for audit log
    const diff = getDiff(oldSettingsMap, newSettings);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'CMS_SETTINGS_UPDATE',
      entity: 'CMS_SETTINGS',
      details: {
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({ message: 'تم تحديث إعدادات النظام بنجاح.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث إعدادات النظام.' });
  }
});

export default router;
