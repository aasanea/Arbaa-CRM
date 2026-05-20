import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create permissions
  const permissionsList = [
    { name: 'manage_properties', description: 'Create and edit properties' },
    { name: 'delete_properties', description: 'Delete properties' },
    { name: 'manage_deals', description: 'Create and view deals' },
    { name: 'manage_users', description: 'Manage team users and roles' },
    { name: 'manage_requests', description: 'Approve or reject price requests' },
    { name: 'view_audit_logs', description: 'View audit logs' },
    { name: 'manage_cms', description: 'Edit CMS and branding settings' },
  ];

  const permissions: Record<string, any> = {};
  for (const perm of permissionsList) {
    permissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // 2. Create roles
  const rolesList = [
    { name: 'SUPER_ADMIN', description: 'Full access to all system features' },
    { name: 'ADMIN', description: 'Administrative control of the CRM' },
    { name: 'SALES_MANAGER', description: 'Manage properties, deals, and approve requests' },
    { name: 'MARKETER', description: 'Add and edit properties and manage listings' },
    { name: 'ANALYST', description: 'Access dashboard analytics and audit logs' },
  ];

  const roles: Record<string, any> = {};
  for (const role of rolesList) {
    roles[role.name] = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // 3. Associate permissions to roles
  const rolePermissionsMap: Record<string, string[]> = {
    SUPER_ADMIN: [
      'manage_properties',
      'delete_properties',
      'manage_deals',
      'manage_users',
      'manage_requests',
      'view_audit_logs',
      'manage_cms',
    ],
    ADMIN: [
      'manage_properties',
      'manage_deals',
      'manage_users',
      'manage_requests',
      'view_audit_logs',
      'manage_cms',
    ],
    SALES_MANAGER: ['manage_properties', 'manage_deals', 'manage_requests'],
    MARKETER: ['manage_properties'],
    ANALYST: ['view_audit_logs'],
  };

  // Clear existing role permissions first to prevent duplicates
  await prisma.rolePermission.deleteMany({});

  for (const [roleName, permNames] of Object.entries(rolePermissionsMap)) {
    const role = roles[roleName];
    for (const name of permNames) {
      const perm = permissions[name];
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // 4. Create default users (with hashed passwords)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const defaultUsers = [
    {
      name: 'المدير العام (سوبر أدمن)',
      email: 'superadmin@arbaa.com',
      password: passwordHash,
      roleName: 'SUPER_ADMIN',
    },
    {
      name: 'عبدالله العتيبي (أدمن)',
      email: 'admin@arbaa.com',
      password: passwordHash,
      roleName: 'ADMIN',
    },
    {
      name: 'سارة الشمري (مدير مبيعات)',
      email: 'sales@arbaa.com',
      password: await bcrypt.hash('sales123', salt),
      roleName: 'SALES_MANAGER',
    },
    {
      name: 'خالد الحربي (مسوق)',
      email: 'marketer@arbaa.com',
      password: await bcrypt.hash('marketer123', salt),
      roleName: 'MARKETER',
    },
    {
      name: 'نورة الدوسري (محلل بيانات)',
      email: 'analyst@arbaa.com',
      password: await bcrypt.hash('analyst123', salt),
      roleName: 'ANALYST',
    },
  ];

  const seededUsers: Record<string, any> = {};
  for (const userDef of defaultUsers) {
    const role = roles[userDef.roleName];
    seededUsers[userDef.email] = await prisma.user.upsert({
      where: { email: userDef.email },
      update: {
        roleId: role.id,
      },
      create: {
        name: userDef.name,
        email: userDef.email,
        password: userDef.password,
        roleId: role.id,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Create default CMS Settings
  const defaultSettings = [
    { key: 'companyName', value: 'شركة أربعة للتسويق العقاري' },
    { key: 'siteTitle', value: 'بوابة إدارة علاقات العملاء الفاخرة' },
    { key: 'siteDescription', value: 'النظام الداخلي المتكامل لإدارة العقارات، الصفقات وتوزيع العمولات لشركة أربعة' },
    { key: 'footerText', value: 'جميع الحقوق محفوظة © ٢٠٢٦ لشركة أربعة للتسويق العقاري' },
  ];

  for (const setting of defaultSettings) {
    await prisma.cmsSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  // 6. Create default properties
  const mockProperties = [
    {
      nameAr: 'فيلا فاخرة في حي الياسمين',
      nameEn: 'Luxury Villa in Al-Yasmin',
      type: 'VILLA',
      status: 'AVAILABLE',
      neighborhood: 'الياسمين',
      price: 3500000,
      area: 450,
      deedNumber: '1100223344',
      streetWidth: 20,
      coordinates: '24.8123, 46.6432',
      ownerName: 'محمد بن راشد',
      ownerPhone: '0501234567',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14480.999553531126!2d46.6432!3d24.8123!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ4JzQ0LjMiTiA0NsKwMzgnMzUuNSJF!5e0!3m2!1sar!2ssa!4v1620000000000!5m2!1sar!2ssa',
    },
    {
      nameAr: 'أرض سكنية متميزة في حي الملقا',
      nameEn: 'Residential Land in Al-Malqa',
      type: 'LAND',
      status: 'AVAILABLE',
      neighborhood: 'الملقا',
      price: 5200000,
      area: 800,
      deedNumber: '2200334455',
      streetWidth: 15,
      coordinates: '24.7985, 46.6120',
      ownerName: 'عبدالرحمن العبدالله',
      ownerPhone: '0559876543',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14484.502938830154!2d46.6120!3d24.7985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ3JzU0LjYiTiA0NsKwMzYnNDMuMiJF!5e0!3m2!1sar!2ssa!4v1620000000000!5m2!1sar!2ssa',
    },
    {
      nameAr: 'شقة مودرن مطلة في حي الصحافة',
      nameEn: 'Modern Apartment in Al-Sahafa',
      type: 'APARTMENT',
      status: 'SOLD',
      neighborhood: 'الصحافة',
      price: 1250000,
      area: 180,
      deedNumber: '3300445566',
      streetWidth: 30,
      coordinates: '24.7812, 46.6545',
      ownerName: 'سليمان الحربي',
      ownerPhone: '0543210987',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14488.08272990666!2d46.6545!3d24.7812!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ2JzUyLjMiTiA0NsKwMzknMTYuMiJF!5e0!3m2!1sar!2ssa!4v1620000000000!5m2!1sar!2ssa',
    },
    {
      nameAr: 'عمارة استثمارية بحي النخيل',
      nameEn: 'Commercial Building in Al-Nakheel',
      type: 'BUILDING',
      status: 'RESERVED',
      neighborhood: 'النخيل',
      price: 12000000,
      area: 1200,
      deedNumber: '4400556677',
      streetWidth: 36,
      coordinates: '24.7345, 46.6212',
      ownerName: 'أبو معاذ للاستثمار',
      ownerPhone: '0567788990',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14497.550186100523!2d46.6212!3d24.7345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ0JzA0LjIiTiA0NsKwMzcnMTYuMyJF!5e0!3m2!1sar!2ssa!4v1620000000000!5m2!1sar!2ssa',
    },
    {
      nameAr: 'مكتب تجاري فاخر في العقيق',
      nameEn: 'Luxury Commercial Office in Al-Aqeeq',
      type: 'OFFICE',
      status: 'AVAILABLE',
      neighborhood: 'العقيق',
      price: 2800000,
      area: 250,
      deedNumber: '5500667788',
      streetWidth: 40,
      coordinates: '24.7701, 46.6290',
      ownerName: 'شركة البناء المتقدمة',
      ownerPhone: '0539998887',
      googleMapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14490.354124312674!2d46.6290!3d24.7701!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ2JzEyLjQiTiA0NsKwMzcnNDQuNCJF!5e0!3m2!1sar!2ssa!4v1620000000000!5m2!1sar!2ssa',
    },
  ];

  const seededProperties = [];
  for (const prop of mockProperties) {
    const dbProp = await prisma.property.upsert({
      where: { deedNumber: prop.deedNumber },
      update: {},
      create: prop,
    });
    seededProperties.push(dbProp);
  }

  // 7. Create a mock deal for the sold property
  const soldProp = seededProperties.find(p => p.status === 'SOLD');
  if (soldProp) {
    const saleUser = seededUsers['sales@arbaa.com'];
    const marketerUser = seededUsers['marketer@arbaa.com'];
    
    // Split: 60% for Sales, 40% for Marketer
    const splits = [
      { userId: saleUser.id, name: saleUser.name, percentage: 60 },
      { userId: marketerUser.id, name: marketerUser.name, percentage: 40 },
    ];

    await prisma.deal.create({
      data: {
        propertyId: soldProp.id,
        finalPrice: soldProp.price,
        commissionAmount: soldProp.price * 0.025, // 31,250
        soldById: saleUser.id,
        partnerSplits: JSON.stringify(splits),
      },
    });
  }

  // 8. Create a mock price request
  const availableProp = seededProperties.find(p => p.status === 'AVAILABLE');
  if (availableProp) {
    const saleUser = seededUsers['sales@arbaa.com'];
    await prisma.priceRequest.create({
      data: {
        propertyId: availableProp.id,
        oldPrice: availableProp.price,
        newPrice: availableProp.price - 100000,
        requestedById: saleUser.id,
        status: 'PENDING',
      },
    });
  }

  // 9. Create some audit logs
  const adminUser = seededUsers['admin@arbaa.com'];
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'SYSTEM_SEED',
      entity: 'DATABASE',
      details: JSON.stringify({ message: 'Database initialized and seeded with default configuration.' }),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Seeder',
      severity: 'INFO',
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
