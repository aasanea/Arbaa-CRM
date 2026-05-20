import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get list of all available roles with their active permissions
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
    return res.json(roles);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تحميل الأدوار والصلاحيات.' });
  }
});

// 2. Get list of all system permissions
router.get('/permissions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(permissions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ في تحميل الصلاحيات المتاحة.' });
  }
});

// 3. Update permissions for a specific role dynamically
router.put('/:id/permissions', authMiddleware, checkPermission('manage_users'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params; // roleId
    const { permissionIds } = req.body; // Array of permission IDs

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'يجب تزويد قائمة بمعرفات الصلاحيات.' });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ error: 'الدور المحدد غير موجود.' });
    }

    // Sync role permissions in transaction
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((pId) => ({
          roleId: id,
          permissionId: pId,
        })),
      }),
    ]);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'ROLE_PERMISSIONS_UPDATE',
      entity: 'ROLE',
      details: {
        roleId: id,
        roleName: role.name,
        assignedPermissionsCount: permissionIds.length,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({ message: 'تم تحديث صلاحيات الدور بنجاح.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل صلاحيات الدور.' });
  }
});

export default router;
