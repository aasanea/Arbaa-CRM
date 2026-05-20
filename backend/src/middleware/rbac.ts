import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function checkPermission(requiredPermission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'عذراً، يجب تسجيل الدخول أولاً.' });
      }

      // SUPER_ADMIN has override for everything
      if (req.user.roleName === 'SUPER_ADMIN') {
        return next();
      }

      const hasPermission = req.user.permissions.includes(requiredPermission);
      if (!hasPermission) {
        return res.status(403).json({ error: 'عذراً، ليس لديك الصلاحية الكافية لإتمام هذه العملية.' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'حدث خطأ أثناء التحقق من الصلاحيات.' });
    }
  };
}
