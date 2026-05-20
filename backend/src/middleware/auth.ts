import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'arbaa-crm-super-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    roleName: string;
    permissions: string[];
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود بالنظام.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب. يرجى التواصل مع الإدارة.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleName: user.role.name,
      permissions: user.role.rolePermissions.map((rp) => rp.permission.name),
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'انتهت الصلاحية أو رمز الدخول غير صالح.' });
  }
}
