import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit, getDiff } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get list of all leads (accessible to authenticated users)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(leads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في جلب بيانات العملاء.' });
  }
});

// 2. Add a new Lead (Requires manage_deals permission, or SUPER_ADMIN override)
router.post('/', authMiddleware, checkPermission('manage_deals'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, email, source, status, notes, propertyType, budget, assignedToId } = req.body;

    if (!name || !phone || !source) {
      return res.status(400).json({ error: 'يرجى ملء البيانات الأساسية: الاسم، الهاتف وقناة الاتصال.' });
    }

    const budgetNum = budget ? parseFloat(budget) : null;

    if (assignedToId) {
      const userExists = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!userExists) {
        return res.status(400).json({ error: 'الموظف المسؤول المحدد غير موجود بالنظام.' });
      }
    }

    const newLead = await prisma.lead.create({
      data: {
        name,
        phone,
        email: email || null,
        source,
        status: status || 'NEW',
        notes: notes || null,
        propertyType: propertyType || null,
        budget: budgetNum,
        assignedToId: assignedToId || null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'LEAD_CREATE',
      entity: 'LEAD',
      details: { id: newLead.id, name: newLead.name, source: newLead.source },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.status(201).json(newLead);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إضافة العميل الجديد.' });
  }
});

// 3. Update Lead details / status stage
router.put('/:id', authMiddleware, checkPermission('manage_deals'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const oldLead = await prisma.lead.findUnique({ where: { id } });
    if (!oldLead) {
      return res.status(404).json({ error: 'العميل المطلوب تعديله غير موجود.' });
    }

    // Parse budget if updated
    if (updateData.budget !== undefined && updateData.budget !== null) {
      updateData.budget = parseFloat(updateData.budget);
    }

    // Verify assign user exists
    if (updateData.assignedToId) {
      const userExists = await prisma.user.findUnique({ where: { id: updateData.assignedToId } });
      if (!userExists) {
        return res.status(400).json({ error: 'الموظف المسؤول غير موجود.' });
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const diff = getDiff(oldLead, updatedLead);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'LEAD_UPDATE',
      entity: 'LEAD',
      details: {
        leadId: id,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.json(updatedLead);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات العميل.' });
  }
});

// 4. Delete Lead
router.delete('/:id', authMiddleware, checkPermission('manage_deals'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ error: 'العميل المطلوب حذفه غير موجود.' });
    }

    await prisma.lead.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'LEAD_DELETE',
      entity: 'LEAD',
      details: { id, name: lead.name },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({ message: 'تم حذف العميل بنجاح.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حذف العميل.' });
  }
});

export default router;
