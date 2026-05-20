import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit, getDiff } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get List of Users with Deal Counts (Requires manage_users or manage_deals permission)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        _count: {
          select: { deals: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Strip passwords before returning
    const sanitizedUsers = users.map((u) => {
      const { password, ...rest } = u;
      return {
        ...rest,
        dealCount: u._count.deals,
      };
    });

    return res.json(sanitizedUsers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في جلب بيانات المستخدمين.' });
  }
});

// 2. Add New User (Requires manage_users permission)
router.post('/', authMiddleware, checkPermission('manage_users'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل.' });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(400).json({ error: 'الدور المحدد غير صالح.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        roleId,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    // Create Audit Log
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'USER_CREATE',
      entity: 'USER',
      details: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role.name },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    const { password: _, ...result } = newUser;
    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في إضافة المستخدم.' });
  }
});

// 3. Edit User (Requires manage_users permission)
router.put('/:id', authMiddleware, checkPermission('manage_users'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, roleId } = req.body;

    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      return res.status(404).json({ error: 'المستخدم المطلوب تعديله غير موجود.' });
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر.' });
      }
      dataToUpdate.email = email;
    }
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) return res.status(400).json({ error: 'الدور غير صالح.' });
      dataToUpdate.roleId = roleId;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      include: { role: true },
    });

    // Log updates comparing old vs new values
    const diff = getDiff(oldUser, updatedUser);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'USER_UPDATE',
      entity: 'USER',
      details: {
        targetUserId: id,
        targetUserName: updatedUser.name,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    const { password: _, ...result } = updatedUser;
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل بيانات المستخدم.' });
  }
});

// 4. Change Role Directly (Requires manage_users permission)
router.patch('/:id/role', authMiddleware, checkPermission('manage_users'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    const oldUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!oldUser) {
      return res.status(404).json({ error: 'المستخدم غير موجود.' });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(400).json({ error: 'الدور المحدد غير صالح.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId },
      include: { role: true },
    });

    const diff = getDiff(oldUser, updatedUser);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'USER_ROLE_CHANGE',
      entity: 'USER',
      details: {
        targetUserId: id,
        targetUserName: updatedUser.name,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    const { password: _, ...result } = updatedUser;
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تغيير دور المستخدم.' });
  }
});

// 5. Change Status / Deactivate User (Requires manage_users permission)
router.patch('/:id/status', authMiddleware, checkPermission('manage_users'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (id === req.user?.id) {
      return res.status(400).json({ error: 'لا يمكنك تعديل حالة حسابك الخاص.' });
    }

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'الحالة غير صالحة.' });
    }

    const oldUser = await prisma.user.findUnique({ where: { id } });
    if (!oldUser) {
      return res.status(404).json({ error: 'المستخدم غير موجود.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      include: { role: true },
    });

    const diff = getDiff(oldUser, updatedUser);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'USER_STATUS_CHANGE',
      entity: 'USER',
      details: {
        targetUserId: id,
        targetUserName: updatedUser.name,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    const { password: _, ...result } = updatedUser;
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تعديل حالة المستخدم.' });
  }
});

// 6. Delete User (Requires manage_users permission, or SUPER_ADMIN override)
router.delete('/:id', authMiddleware, checkPermission('manage_users'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user?.id) {
      return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص.' });
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود.' });
    }

    // In a transaction, delete all related notifications, price requests, deals, and finally the user
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.priceRequest.deleteMany({ where: { requestedById: id } }),
      prisma.deal.deleteMany({ where: { soldById: id } }),
      prisma.user.delete({ where: { id } })
    ]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'USER_DELETE',
      entity: 'USER',
      details: { id: user.id, name: user.name, email: user.email },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({ message: 'تم حذف المستخدم وجميع سجلاته بنجاح.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حذف المستخدم.' });
  }
});

export default router;
