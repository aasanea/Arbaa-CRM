import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LogAuditParams {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  details: string | Record<string, any>;
  ipAddress: string;
  userAgent: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export async function logAudit({
  userId,
  userName,
  action,
  entity,
  details,
  ipAddress,
  userAgent,
  severity = 'INFO',
}: LogAuditParams) {
  try {
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
    return await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        entity,
        details: detailsStr,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        severity,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Computes difference between old and new objects to log values before and after
 */
export function getDiff(oldObj: Record<string, any>, newObj: Record<string, any>): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  
  // Track modified or added keys
  for (const key in newObj) {
    if (Object.prototype.hasOwnProperty.call(newObj, key)) {
      // Skip passwords, dates, and relation objects
      if (['password', 'updatedAt', 'createdAt'].includes(key)) continue;
      
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = {
          old: oldVal === undefined ? null : oldVal,
          new: newVal === undefined ? null : newVal,
        };
      }
    }
  }

  return diff;
}
