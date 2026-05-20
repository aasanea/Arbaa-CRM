import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { logAudit, getDiff } from '../utils/auditLogger';

const router = Router();
const prisma = new PrismaClient();

// 1. Get Properties List (with filter, search, sorting, pagination)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search = '',
      type,
      status,
      neighborhood,
      sortBy = 'createdAt', // price, area, createdAt
      sortOrder = 'desc',
      page = '1',
      limit = '10',
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Filter build
    const where: any = {};

    if (search) {
      where.OR = [
        { nameAr: { contains: search as string } },
        { nameEn: { contains: search as string } },
        { deedNumber: { contains: search as string } },
        { ownerName: { contains: search as string } },
      ];
    }

    if (type) {
      where.type = type as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (neighborhood) {
      where.neighborhood = neighborhood as string;
    }

    // Sort mapping
    const orderBy: any = {};
    if (['price', 'area', 'createdAt'].includes(sortBy as string)) {
      orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [properties, totalCount] = await prisma.$transaction([
      prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.property.count({ where }),
    ]);

    // Gather distinct neighborhoods and types for filtering options
    const allNeighborhoods = await prisma.property.findMany({
      select: { neighborhood: true },
      distinct: ['neighborhood'],
    });

    return res.json({
      properties,
      metadata: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
        neighborhoods: allNeighborhoods.map((n) => n.neighborhood),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة العقارات.' });
  }
});

// 2. Export Properties to CSV
router.get('/export-csv', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV Header
    let csv = '\ufeff'; // UTF-8 BOM for Excel Arabic layout
    csv += 'ID,Name Arabic,Name English,Type,Status,Neighborhood,Price,Area,Deed Number,Street Width,Coordinates,Owner Name,Owner Phone,Created At\n';

    for (const prop of properties) {
      const row = [
        prop.id,
        `"${prop.nameAr.replace(/"/g, '""')}"`,
        `"${prop.nameEn.replace(/"/g, '""')}"`,
        prop.type,
        prop.status,
        `"${prop.neighborhood.replace(/"/g, '""')}"`,
        prop.price,
        prop.area,
        prop.deedNumber,
        prop.streetWidth,
        `"${prop.coordinates}"`,
        `"${prop.ownerName.replace(/"/g, '""')}"`,
        prop.ownerPhone,
        prop.createdAt.toISOString(),
      ];
      csv += row.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=properties_export.csv');
    return res.status(200).send(csv);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تصدير ملف الـ CSV.' });
  }
});

// 3. Get Single Property
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        deals: {
          include: { soldBy: true },
        },
        priceRequests: {
          orderBy: { createdAt: 'desc' },
          include: { requestedBy: true },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'العقار غير موجود.' });
    }

    return res.json(property);
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل العقار.' });
  }
});

// 4. Create Property (Requires manage_properties permission)
router.post('/', authMiddleware, checkPermission('manage_properties'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      nameAr,
      nameEn,
      type,
      status,
      neighborhood,
      price,
      area,
      deedNumber,
      streetWidth,
      coordinates,
      ownerName,
      ownerPhone,
      googleMapsUrl,
    } = req.body;

    if (!nameAr || !type || !price || !area || !deedNumber || !ownerName || !ownerPhone) {
      return res.status(400).json({ error: 'يرجى ملء جميع الحقول الإلزامية.' });
    }

    // Deed Number Uniqueness constraint check
    const existingDeed = await prisma.property.findUnique({
      where: { deedNumber: deedNumber.toString() },
    });
    if (existingDeed) {
      return res.status(400).json({ error: 'رقم الصك مسجل مسبقاً لعقار آخر. يرجى التأكد وإدخال رقم فريد.' });
    }

    const property = await prisma.property.create({
      data: {
        nameAr,
        nameEn: nameEn || nameAr,
        type,
        status: status || 'AVAILABLE',
        neighborhood,
        price: parseFloat(price),
        area: parseFloat(area),
        deedNumber: deedNumber.toString(),
        streetWidth: parseFloat(streetWidth || 0),
        coordinates: coordinates || '24.7136, 46.6753',
        ownerName,
        ownerPhone,
        googleMapsUrl,
      },
    });

    // Create Audit Log
    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PROPERTY_CREATE',
      entity: 'PROPERTY',
      details: { id: property.id, nameAr: property.nameAr, price: property.price },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.status(201).json(property);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء العقار.' });
  }
});

// 5. Update Property (Requires manage_properties permission)
router.put('/:id', authMiddleware, checkPermission('manage_properties'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const oldProperty = await prisma.property.findUnique({ where: { id } });
    if (!oldProperty) {
      return res.status(404).json({ error: 'العقار المطلوب تعديله غير موجود.' });
    }

    // Deed Number Uniqueness constraint check on update
    if (updateData.deedNumber && updateData.deedNumber !== oldProperty.deedNumber) {
      const existingDeed = await prisma.property.findUnique({
        where: { deedNumber: updateData.deedNumber.toString() },
      });
      if (existingDeed) {
        return res.status(400).json({ error: 'رقم الصك مسجل مسبقاً لعقار آخر.' });
      }
    }

    // Parse floats if updating numbers
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.area) updateData.area = parseFloat(updateData.area);
    if (updateData.streetWidth) updateData.streetWidth = parseFloat(updateData.streetWidth);

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: updateData,
    });

    // Generate Old Value vs New Value Comparison
    const diff = getDiff(oldProperty, updatedProperty);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PROPERTY_UPDATE',
      entity: 'PROPERTY',
      details: {
        propertyId: id,
        nameAr: updatedProperty.nameAr,
        changes: diff, // Log comparison object
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.json(updatedProperty);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث العقار.' });
  }
});

// 6. Delete Property (Requires delete_properties permission)
router.delete('/:id', authMiddleware, checkPermission('delete_properties'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return res.status(404).json({ error: 'العقار غير موجود.' });
    }

    await prisma.property.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PROPERTY_DELETE',
      entity: 'PROPERTY',
      details: { id, nameAr: property.nameAr, price: property.price, deedNumber: property.deedNumber },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'WARNING',
    });

    return res.json({ message: 'تم حذف العقار بنجاح.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حذف العقار.' });
  }
});

// 7. Update Status (Requires manage_properties permission)
router.patch('/:id/status', authMiddleware, checkPermission('manage_properties'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['AVAILABLE', 'RESERVED', 'SOLD'].includes(status)) {
      return res.status(400).json({ error: 'حالة العقار غير صالحة.' });
    }

    const oldProperty = await prisma.property.findUnique({ where: { id } });
    if (!oldProperty) {
      return res.status(404).json({ error: 'العقار غير موجود.' });
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: { status },
    });

    const diff = getDiff(oldProperty, updatedProperty);

    await logAudit({
      userId: req.user?.id,
      userName: req.user?.name,
      action: 'PROPERTY_STATUS_CHANGE',
      entity: 'PROPERTY',
      details: {
        propertyId: id,
        nameAr: updatedProperty.nameAr,
        changes: diff,
      },
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
      severity: 'INFO',
    });

    return res.json(updatedProperty);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة العقار.' });
  }
});

export default router;
