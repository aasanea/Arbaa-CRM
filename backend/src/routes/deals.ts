import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit, getDiff } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get List of All Deals
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        property: true,
        soldBy: true,
      },
      orderBy: { soldAt: 'desc' },
    });
    return res.json(deals);
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الصفقات.' });
  }
});

// 2. Get Deal Stats Dynamically
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deals = await prisma.deal.findMany({
      select: {
        finalPrice: true,
        commissionAmount: true,
      },
    });

    const totalSales = deals.reduce((sum, d) => sum + d.finalPrice, 0);
    const totalCommission = deals.reduce((sum, d) => sum + d.commissionAmount, 0);
    const dealCount = deals.length;

    return res.json({
      totalSales,
      totalCommission,
      dealCount,
    });
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء احتساب الإحصائيات.' });
  }
});

// 2.5. Get Single Deal by ID
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        property: true,
        soldBy: true,
      },
    });
    if (!deal) {
      return res.status(404).json({ error: 'الصفقة غير موجودة.' });
    }
    return res.json(deal);
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الصفقة.' });
  }
});

// 3. Sell Property (Record Deal)
router.post('/', authMiddleware, checkPermission('manage_deals'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { propertyId, finalPrice, partnerSplits } = req.body;

    if (!propertyId || !finalPrice || !partnerSplits) {
      return res.status(400).json({ error: 'يرجى تزويد معرف العقار والسعر النهائي ونسب الشركاء.' });
    }

    const priceNum = parseFloat(finalPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'السعر النهائي المدخل غير صالح.' });
    }

    // Parse and validate splits
    let splits: Array<{ userId: string; name: string; percentage: number }> = [];
    try {
      splits = typeof partnerSplits === 'string' ? JSON.parse(partnerSplits) : partnerSplits;
    } catch (e) {
      return res.status(400).json({ error: 'صيغة نسب الشركاء غير صالحة.' });
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ error: 'يجب تحديد شريك واحد على الأقل لإتمام الصفقة.' });
    }

    // Verify percentages sum is exactly 100%
    const totalPercentage = splits.reduce((sum, s) => sum + parseFloat(s.percentage as any), 0);
    if (Math.abs(totalPercentage - 100) > 0.05) {
      return res.status(400).json({ error: `يجب أن يكون مجموع نسب الشركاء مساوياً لـ 100%. المجموع الحالي: ${totalPercentage}%` });
    }

    // Verify each user in split exists
    for (const split of splits) {
      const userExists = await prisma.user.findUnique({ where: { id: split.userId } });
      if (!userExists) {
        return res.status(400).json({ error: `المستخدم ${split.name} غير مسجل في النظام.` });
      }
    }

    // Retrieve property
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ error: 'العقار غير موجود.' });
    }

    if (property.status === 'SOLD') {
      return res.status(400).json({ error: 'هذا العقار تم بيعه مسبقاً.' });
    }

    // Calculate or override commission
    let commission = priceNum * 0.025;
    if (req.body.commissionAmount !== undefined && req.body.commissionAmount !== null) {
      const parsedComm = parseFloat(req.body.commissionAmount);
      if (!isNaN(parsedComm) && parsedComm >= 0) {
        commission = parsedComm;
      }
    }

    // Determine seller
    let soldById = req.user!.id;
    if (req.body.soldById) {
      const userExists = await prisma.user.findUnique({ where: { id: req.body.soldById } });
      if (userExists) {
        soldById = req.body.soldById;
      }
    }

    // Run transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create deal
      const deal = await tx.deal.create({
        data: {
          propertyId,
          finalPrice: priceNum,
          commissionAmount: commission,
          soldById,
          partnerSplits: JSON.stringify(splits),
        },
      });

      // 2. Update property status to SOLD
      await tx.property.update({
        where: { id: propertyId },
        data: { status: 'SOLD' },
      });

      // 3. Create Notification for super admins / admins
      const admins = await tx.user.findMany({
        where: {
          role: {
            name: { in: ['SUPER_ADMIN', 'ADMIN'] },
          },
        },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            title: 'إغلاق صفقة جديدة 🎉',
            message: `تم بيع العقار "${property.nameAr}" بنجاح بواسطة ${req.user!.name} بقيمة ${priceNum.toLocaleString()} ريال.`,
          },
        });
      }

      // 4. Create Notification for each partner in the split
      for (const split of splits) {
        await tx.notification.create({
          data: {
            userId: split.userId,
            title: 'عمولة صفقة جديدة 💰',
            message: `Congratulations! You earned a commission on ${property.nameAr}.|${deal.id}`,
          },
        });
      }

      return deal;
    });

    // Create Audit Log
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DEAL_CLOSE',
      entity: 'DEAL',
      details: {
        dealId: result.id,
        propertyId: property.id,
        propertyName: property.nameAr,
        finalPrice: priceNum,
        commission,
        splits,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الصفقة.' });
  }
});

// 4. Update Deal (Requires manage_deals permission, or SUPER_ADMIN override)
router.put('/:id', authMiddleware, checkPermission('manage_deals'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { propertyId, finalPrice, commissionAmount, soldById, partnerSplits, soldAt } = req.body;

    const oldDeal = await prisma.deal.findUnique({ where: { id } });
    if (!oldDeal) {
      return res.status(404).json({ error: 'الصفقة المطلوبة غير موجودة.' });
    }

    const dataToUpdate: any = {};
    if (propertyId) {
      const propExists = await prisma.property.findUnique({ where: { id: propertyId } });
      if (!propExists) return res.status(400).json({ error: 'العقار المحدد غير موجود.' });
      dataToUpdate.propertyId = propertyId;
    }
    if (finalPrice !== undefined) {
      const priceNum = parseFloat(finalPrice);
      if (isNaN(priceNum) || priceNum <= 0) return res.status(400).json({ error: 'السعر النهائي غير صالح.' });
      dataToUpdate.finalPrice = priceNum;
    }
    if (commissionAmount !== undefined) {
      const commNum = parseFloat(commissionAmount);
      if (isNaN(commNum) || commNum < 0) return res.status(400).json({ error: 'مبلغ العمولة غير صالح.' });
      dataToUpdate.commissionAmount = commNum;
    }
    if (soldById) {
      const userExists = await prisma.user.findUnique({ where: { id: soldById } });
      if (!userExists) return res.status(400).json({ error: 'المستخدم البائع غير موجود.' });
      dataToUpdate.soldById = soldById;
    }
    if (soldAt) {
      dataToUpdate.soldAt = new Date(soldAt);
    }
    if (partnerSplits !== undefined) {
      let splits: any[] = [];
      try {
        splits = typeof partnerSplits === 'string' ? JSON.parse(partnerSplits) : partnerSplits;
      } catch (e) {
        return res.status(400).json({ error: 'صيغة نسب الشركاء غير صالحة.' });
      }

      if (!Array.isArray(splits) || splits.length === 0) {
        return res.status(400).json({ error: 'يجب تحديد شريك واحد على الأقل.' });
      }

      const totalPercentage = splits.reduce((sum, s) => sum + parseFloat(s.percentage as any), 0);
      if (Math.abs(totalPercentage - 100) > 0.05) {
        return res.status(400).json({ error: `يجب أن يكون مجموع نسب الشركاء مساوياً لـ 100%. المجموع الحالي: ${totalPercentage}%` });
      }

      // Verify each user exists
      for (const split of splits) {
        const userExists = await prisma.user.findUnique({ where: { id: split.userId } });
        if (!userExists) {
          return res.status(400).json({ error: `المستخدم ${split.name} غير مسجل في النظام.` });
        }
      }
      dataToUpdate.partnerSplits = JSON.stringify(splits);
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: dataToUpdate,
      include: {
        property: true,
        soldBy: true,
      },
    });

    const diff = getDiff(oldDeal, updatedDeal);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'DEAL_UPDATE',
      entity: 'DEAL',
      details: {
        dealId: id,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json(updatedDeal);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل بيانات الصفقة.' });
  }
});

export default router;
