import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const flags = [
  // Core System Features
  { key: 'ai_parser', displayNameAr: 'مستخرج البيانات بالذكاء الاصطناعي', displayNameEn: 'AI Property Parser', category: 'CORE' },
  { key: 'contracts_generator', displayNameAr: 'منشئ العقود الذكي', displayNameEn: 'Contracts PDF Generator', category: 'CORE' },
  { key: 'performance_dashboard', displayNameAr: 'لوحة تحليلات الأداء', displayNameEn: 'Performance Analytics Dashboard', category: 'CORE' },

  // Sales Agent Features
  { key: 'client_wishlist', displayNameAr: 'قائمة رغبات العملاء', displayNameEn: 'Client Wishlist', category: 'AGENT' },
  { key: 'property_favorites', displayNameAr: 'العقارات المفضلة للمسوق', displayNameEn: 'Property Favorites', category: 'AGENT' },
  { key: 'whatsapp_integration', displayNameAr: 'التكامل التلقائي مع واتساب', displayNameEn: 'Automated WhatsApp', category: 'AGENT' },
  { key: 'task_reminders', displayNameAr: 'التذكيرات والمهام الداخلية', displayNameEn: 'In-app Task Reminders', category: 'AGENT' },
  { key: 'performance_tracker', displayNameAr: 'مؤشر الأداء الشخصي', displayNameEn: 'Personal Performance Tracker', category: 'AGENT' },
  { key: 'interaction_history', displayNameAr: 'سجل التفاعل مع العملاء', displayNameEn: 'Client Interaction History', category: 'AGENT' },
  { key: 'email_templates', displayNameAr: 'مكتبة قوالب البريد الإلكتروني', displayNameEn: 'Email Templates Library', category: 'AGENT' },
  { key: 'property_comparison', displayNameAr: 'أداة مقارنة العقارات المتطورة', displayNameEn: 'Property Comparison Tool', category: 'AGENT' },
  { key: 'document_vault', displayNameAr: 'خزنة المستندات والوثائق', displayNameEn: 'Document Vault', category: 'AGENT' },
  { key: 'meeting_scheduler', displayNameAr: 'مجدول الاجتماعات مع المستثمرين', displayNameEn: 'Meeting Scheduler', category: 'AGENT' },
  { key: 'target_tracking', displayNameAr: 'تتبع وتحقيق الأهداف المالية', displayNameEn: 'Target Tracking', category: 'AGENT' },
  { key: 'lead_nurturing', displayNameAr: 'مسار رعاية وتأهيل العملاء المهتمين', displayNameEn: 'Lead Nurturing Flow', category: 'AGENT' },
  { key: 'voice_search', displayNameAr: 'البحث السريع بالأوامر الصوتية', displayNameEn: 'Quick Voice Search', category: 'AGENT' },
  { key: 'availability_calendar', displayNameAr: 'تقويم توفر وحجوزات العقارات', displayNameEn: 'Property Availability Calendar', category: 'AGENT' },
  { key: 'commission_history', displayNameAr: 'سجل تفاصيل العمولات المستلمة', displayNameEn: 'Commission Breakdown History', category: 'AGENT' },
  { key: 'amenities_finder', displayNameAr: 'مستكشف الخدمات والمرافق المجاورة', displayNameEn: 'Nearby Amenities Finder', category: 'AGENT' },
  { key: 'virtual_tour', displayNameAr: 'مشاهدة الجولات الافتراضية للعقارات', displayNameEn: 'Virtual Tour Field', category: 'AGENT' },
  { key: 'profile_notes', displayNameAr: 'ملاحظات سريعة على ملفات العملاء', displayNameEn: 'Client Profile Notes', category: 'AGENT' },
  { key: 'conversion_funnel', displayNameAr: 'قمع تحليل معدل تحويل الصفقات', displayNameEn: 'Lead Conversion Funnel', category: 'AGENT' },
  { key: 'internal_messaging', displayNameAr: 'نظام المراسلات والمحادثات الداخلي', displayNameEn: 'Internal Messaging', category: 'AGENT' },

  // Admin Controls
  { key: 'advanced_audit_logs', displayNameAr: 'سجل الرقابة والأمان المتقدم', displayNameEn: 'Advanced Audit Logs', category: 'ADMIN' },
  { key: 'permission_builder', displayNameAr: 'مطور ومخصص الصلاحيات والأدوار', displayNameEn: 'Role-based Permission Builder', category: 'ADMIN' },
  { key: 'system_backups', displayNameAr: 'النسخ الاحتياطي التلقائي للنظام', displayNameEn: 'Global System Backups', category: 'ADMIN' },
  { key: 'ip_whitelisting', displayNameAr: 'جدار حماية عناوين IP البيضاء والشرسة', displayNameEn: 'IP Whitelist/Blacklist', category: 'ADMIN' },
  { key: 'widget_builder', displayNameAr: 'مصمم ومخصص ودجات لوحة التحكم', displayNameEn: 'Custom Dashboard Widget Builder', category: 'ADMIN' },
  { key: 'bulk_import_export', displayNameAr: 'استيراد وتصدير العقارات دفعة واحدة', displayNameEn: 'Bulk Property Import/Export', category: 'ADMIN' },
  { key: 'team_reports', displayNameAr: 'تقارير أداء فريق العمل التفصيلية', displayNameEn: 'Team Performance Reports', category: 'ADMIN' },
  { key: 'system_health', displayNameAr: 'مراقب سلامة الخادم والاستهلاك الفوري', displayNameEn: 'System Health Monitor', category: 'ADMIN' },
  { key: 'revenue_projection', displayNameAr: 'محرك توقع الإيرادات والعمولات المستقبلية', displayNameEn: 'Revenue Projection Engine', category: 'ADMIN' },
  { key: 'monthly_invoicing', displayNameAr: 'نظام الفواتير الشهرية المؤتمت للعملاء', displayNameEn: 'Automated Monthly Invoicing', category: 'ADMIN' },
  { key: 'data_validation_rules', displayNameAr: 'قواعد تدقيق والتحقق من صحة البيانات', displayNameEn: 'Property Validation Rules', category: 'ADMIN' },
  { key: 'custom_notifications', displayNameAr: 'مرسل التنبيهات المخصصة للموظفين', displayNameEn: 'Custom Notifications', category: 'ADMIN' },
  { key: 'admin_notes', displayNameAr: 'ملاحظات سرية للإدارة العليا فقط', displayNameEn: 'Admin-only Notes', category: 'ADMIN' },
  { key: 'activity_heatmaps', displayNameAr: 'خرائط الحرارة لقياس تفاعل المستخدمين', displayNameEn: 'User Activity Heatmaps', category: 'ADMIN' },
  { key: 'data_archiving', displayNameAr: 'أرشفة السجلات التاريخية لتسريع النظام', displayNameEn: 'Data Archiving', category: 'ADMIN' },
  { key: 'api_key_management', displayNameAr: 'إدارة مفاتيح الربط الخارجي (API Keys)', displayNameEn: 'API Key Management', category: 'ADMIN' },
  { key: 'announcement_banner', displayNameAr: 'لوحة الإعلانات والتعاميم الإدارية', displayNameEn: 'System Announcement Banner', category: 'ADMIN' },
  { key: 'seo_cms_settings', displayNameAr: 'إعدادات محركات البحث ومحتوى البوابة', displayNameEn: 'Advanced SEO/CMS Settings', category: 'ADMIN' },
  { key: 'dynamic_commission_policy', displayNameAr: 'سياسات العمولات الديناميكية والشرائح', displayNameEn: 'Dynamic Commission Policy', category: 'ADMIN' },
  { key: 'lead_distribution_rules', displayNameAr: 'قواعد توزيع العملاء المحتملين تلقائياً', displayNameEn: 'Lead Distribution Rules', category: 'ADMIN' }
];

async function main() {
  console.log('Start seeding feature flags...');
  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: {
        key: flag.key,
        displayNameAr: flag.displayNameAr,
        displayNameEn: flag.displayNameEn,
        category: flag.category,
        enabledGlobal: true,
        enabledForSales: true
      }
    });
  }
  console.log('Seeded all 43 feature flags successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
