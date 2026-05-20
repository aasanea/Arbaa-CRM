import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit, getDiff } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get Price Requests List
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requests = await prisma.priceRequest.findMany({
      include: {
        property: true,
        requestedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة طلبات تعديل الأسعار.' });
  }
});

// 2. Submit Price Request (Sales/Marketers submit, default status PENDING)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { propertyId, newPrice } = req.body;

    if (!propertyId || !newPrice) {
      return res.status(400).json({ error: 'يرجى تحديد العقار والسعر المقترح الجديد.' });
    }

    const newPriceNum = parseFloat(newPrice);
    if (isNaN(newPriceNum) || newPriceNum <= 0) {
      return res.status(400).json({ error: 'السعر المقترح غير صالح.' });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ error: 'العقار غير موجود.' });
    }

    const request = await prisma.priceRequest.create({
      data: {
        propertyId,
        oldPrice: property.price,
        newPrice: newPriceNum,
        requestedById: req.user!.id,
        status: 'PENDING',
      },
    });

    // Notify Admins
    const admins = await prisma.user.findMany({
      where: {
        role: {
          name: { in: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'] },
        },
      },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'طلب تعديل سعر جديد 💰',
          message: `طلب ${req.user!.name} تعديل سعر عقار "${property.nameAr}" من ${property.price.toLocaleString()} إلى ${newPriceNum.toLocaleString()} ريال.`,
        },
      });
    }

    // Create Audit Log
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PRICE_REQUEST_SUBMIT',
      entity: 'PRICE_REQUEST',
      details: {
        requestId: request.id,
        propertyId,
        propertyName: property.nameAr,
        oldPrice: property.price,
        newPrice: newPriceNum,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.status(201).json(request);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تقديم طلب تعديل السعر.' });
  }
});

// 3. Approve Price Request (Requires manage_requests permission)
router.post('/:id/approve', authMiddleware, checkPermission('manage_requests'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.priceRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'طلب التعديل غير موجود.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'هذا الطلب تم البت فيه مسبقاً.' });
    }

    // Update inside a transaction: Approve request and update Property price
    await prisma.$transaction(async (tx) => {
      await tx.priceRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      await tx.property.update({
        where: { id: request.propertyId },
        data: { price: request.newPrice },
      });

      // Notify requester
      await tx.notification.create({
        data: {
          userId: request.requestedById,
          title: 'تمت الموافقة على طلبك بنجاح ✅',
          message: `تمت الموافقة على تعديل سعر عقار "${request.property.nameAr}" إلى ${request.newPrice.toLocaleString()} ريال.`,
        },
      });
    });

    // Create Audit Log
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PRICE_REQUEST_APPROVE',
      entity: 'PRICE_REQUEST',
      details: {
        requestId: id,
        propertyId: request.propertyId,
        propertyName: request.property.nameAr,
        priceChanges: {
          old: request.oldPrice,
          new: request.newPrice,
        },
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.json({ message: 'تمت الموافقة على طلب تعديل السعر وتحديث قيمة العقار.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء الموافقة على الطلب.' });
  }
});

// 4. Reject Price Request (Requires manage_requests permission)
router.post('/:id/reject', authMiddleware, checkPermission('manage_requests'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.priceRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'طلب التعديل غير موجود.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'هذا الطلب تم البت فيه مسبقاً.' });
    }

    await prisma.priceRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.requestedById,
        title: 'تم رفض طلب تعديل السعر ❌',
        message: `تم رفض طلبك لتعديل سعر عقار "${request.property.nameAr}" إلى ${request.newPrice.toLocaleString()} ريال.`,
      },
    });

    // Create Audit Log
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PRICE_REQUEST_REJECT',
      entity: 'PRICE_REQUEST',
      details: {
        requestId: id,
        propertyId: request.propertyId,
        propertyName: request.property.nameAr,
        oldPrice: request.oldPrice,
        newPrice: request.newPrice,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({ message: 'تم رفض طلب تعديل السعر.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء رفض الطلب.' });
  }
});

// 5. Direct Edit for Admins (Requires manage_requests permission)
router.put('/:id', authMiddleware, checkPermission('manage_requests'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPrice, status } = req.body;

    const oldRequest = await prisma.priceRequest.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!oldRequest) {
      return res.status(404).json({ error: 'طلب التعديل غير موجود.' });
    }

    const dataToUpdate: any = {};
    if (newPrice !== undefined) dataToUpdate.newPrice = parseFloat(newPrice);
    if (status !== undefined) dataToUpdate.status = status;

    const updatedRequest = await prisma.priceRequest.update({
      where: { id },
      data: dataToUpdate,
      include: { property: true },
    });

    // Compute changes comparison
    const diff = getDiff(oldRequest, updatedRequest);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PRICE_REQUEST_UPDATE',
      entity: 'PRICE_REQUEST',
      details: {
        requestId: id,
        propertyName: updatedRequest.property.nameAr,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.json(updatedRequest);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل طلب السعر.' });
  }
});

export default router;
