import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';

const router = Router();
const prisma = new PrismaClient();

// 1. Get Audit Logs (Requires view_audit_logs permission)
router.get('/', authMiddleware, checkPermission('view_audit_logs'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search = '',
      severity,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { userName: { contains: search as string } },
        { action: { contains: search as string } },
        { entity: { contains: search as string } },
        { details: { contains: search as string } },
      ];
    }

    if (severity) {
      where.severity = severity as string;
    }

    const [logs, totalCount] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      logs,
      metadata: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل العمليات.' });
  }
});

// 2. Export Audit Logs to CSV
router.get('/export-csv', authMiddleware, checkPermission('view_audit_logs'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    let csv = '\ufeff'; // UTF-8 BOM
    csv += 'Log ID,User Name,User Email,Action,Entity,Details,IP Address,User Agent,Severity,Timestamp\n';

    for (const log of logs) {
      const userStr = log.userName || (log.user ? log.user.name : 'System');
      const emailStr = log.user ? log.user.email : 'System';
      // Clean and sanitize details text for CSV compatibility
      const detailsClean = log.details.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');

      const row = [
        log.id,
        `"${userStr.replace(/"/g, '""')}"`,
        `"${emailStr.replace(/"/g, '""')}"`,
        log.action,
        log.entity,
        `"${detailsClean}"`,
        log.ipAddress,
        `"${log.userAgent.replace(/"/g, '""')}"`,
        log.severity,
        log.createdAt.toISOString(),
      ];
      csv += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs_export.csv');
    return res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تصدير سجل العمليات.' });
  }
});

export default router;
