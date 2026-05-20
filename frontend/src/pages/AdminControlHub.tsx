import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../context/I18nContext';
import {
  Shield, Server, Key, Users, FileText, Database, ShieldAlert, Award,
  Cpu, Activity, TrendingUp, AlertCircle, Plus, Trash, Megaphone, BellRing, Settings
} from 'lucide-react';

export const AdminControlHub: React.FC = () => {
  const { t, locale, isRtl } = useTranslation();
  const { addToast, user, hasFeature } = useStore();
  const [activeTab, setActiveTab] = useState('security');

  // Backups state
  const [backups, setBackups] = useState<any[]>(() => [
    { id: '1', name: 'dev_db_backup_2026_05_20.json', size: '152 KB', date: '2026-05-20' }
  ]);

  // IP configuration list
  const [ipRules, setIpRules] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_admin_ips');
    return val ? JSON.parse(val) : [
      { id: '1', ip: '192.168.1.1', type: 'WHITELIST', desc: 'مكتب الرياض الرئيسي' },
      { id: '2', ip: '203.0.113.50', type: 'BLACKLIST', desc: 'محاولات ولوج مشبوهة' }
    ];
  });

  // API keys list
  const [apiKeys, setApiKeys] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_admin_apikeys');
    return val ? JSON.parse(val) : [
      { id: '1', label: 'تكامل بوابة عقار', key: 'arb_live_58291049281', created: '2026-05-18' }
    ];
  });

  // Announcement state
  const [announcement, setAnnouncement] = useState(() => {
    const text = localStorage.getItem('arbaa_announcement_text') || '';
    const active = localStorage.getItem('arbaa_announcement_active') === 'true';
    return { text, active };
  });

  // IP rules input
  const [newIp, setNewIp] = useState('');
  const [newIpType, setNewIpType] = useState('WHITELIST');
  const [newIpDesc, setNewIpDesc] = useState('');

  // API keys input
  const [newKeyLabel, setNewKeyLabel] = useState('');

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('arbaa_admin_ips', JSON.stringify(ipRules));
  }, [ipRules]);
  useEffect(() => {
    localStorage.setItem('arbaa_admin_apikeys', JSON.stringify(apiKeys));
  }, [apiKeys]);
  useEffect(() => {
    localStorage.setItem('arbaa_announcement_text', announcement.text);
    localStorage.setItem('arbaa_announcement_active', String(announcement.active));
  }, [announcement]);

  // Lead distribution state
  const [leadDistribution, setLeadDistribution] = useState('ROUND_ROBIN');

  // Commission policies
  const [minCommissionTier, setMinCommissionTier] = useState('2.5');

  // Trigger JSON file backup export
  const exportDatabaseBackup = () => {
    const backupContent = {
      timestamp: new Date().toISOString(),
      crm: 'Arbaa CRM',
      database: 'SQLite 3',
      exportType: 'SYSTEM_JSON_BACKUP',
      payload: {
        usersCount: 8,
        propertiesCount: 24,
        leadsCount: 14,
        dealsCount: 9
      }
    };
    const blob = new Blob([JSON.stringify(backupContent, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    const backupName = `arbaa_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.download = backupName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Save to local logs list
    setBackups([...backups, { id: Math.random().toString(), name: backupName, size: '2.4 KB', date: new Date().toISOString().split('T')[0] }]);
    addToast(locale === 'ar' ? 'تم إنشاء وتحميل نسخة احتياطية بنجاح.' : 'Global database backup JSON generated.', 'success');
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
          <Shield className="w-6 h-6 text-luxury-gold-500" />
          {locale === 'ar' ? 'بوابة التحكم والحماية للإدارة (Admin Control Hub)' : 'Admin Control Hub'}
        </h1>
        <p className="text-xs text-luxury-dark-400 mt-1">
          {locale === 'ar'
            ? 'تكامل أدوات الحماية الأمنية، مراقبة سلامة الخوادم، وإدارة النسخ الاحتياطي وتوزيع العمولات لشركة أربعة.'
            : 'Configure CRM security firewalls, system status metrics, and execute corporate policies.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-luxury-dark-800 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'security' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'الحماية والأمن' : 'Security & Firewall'}
        </button>
        <button
          onClick={() => setActiveTab('routing')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'routing' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'توزيع الصفقات والعمولات' : 'Lead Routing & Policies'}
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'health' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'مراقبة النظام والأداء' : 'System Health & Metrics'}
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'announcements' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'الإعلانات والفواتير' : 'Invoices & Banner'}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* PANEL 1: SECURITY & FIREWALL */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Global System Backups (Feature 3) */}
            {hasFeature('system_backups') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex justify-between items-center border-b border-luxury-dark-800 pb-2">
                  <h3 className="text-xs font-bold text-luxury-dark-100 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-luxury-gold-500" />
                    {locale === 'ar' ? 'النسخ الاحتياطي التلقائي وتنزيل السجلات' : 'Global System Backups'}
                  </h3>
                  <button
                    onClick={exportDatabaseBackup}
                    className="bg-luxury-gold-500 text-luxury-dark-950 hover:bg-luxury-gold-600 font-bold px-3 py-1 rounded text-[10px]"
                  >
                    {locale === 'ar' ? 'نسخ احتياطي فوري' : 'Backup Now'}
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {backups.map((b) => (
                    <div key={b.id} className="flex justify-between items-center p-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl text-[10px]">
                      <span className="font-mono text-luxury-dark-200">{b.name}</span>
                      <span className="text-luxury-dark-400 font-mono">{b.size} | {b.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IP Whitelist / Blacklist (Feature 4) */}
            {hasFeature('ip_whitelisting') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'جدار الحماية الفوري (IP Whitelist/Blacklist)' : 'Firewall (IP Filter Rules)'}
                  </h3>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="192.168.1.1"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 flex-1 font-mono"
                  />
                  <select
                    value={newIpType}
                    onChange={(e) => setNewIpType(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-32"
                  >
                    <option value="WHITELIST">{locale === 'ar' ? 'قائمة بيضاء' : 'Allow'}</option>
                    <option value="BLACKLIST">{locale === 'ar' ? 'حظر دخول' : 'Block'}</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!newIp) return;
                      setIpRules([...ipRules, { id: Math.random().toString(), ip: newIp, type: newIpType, desc: newIpDesc || 'تعديل إداري' }]);
                      setNewIp('');
                      setNewIpDesc('');
                      addToast(locale === 'ar' ? 'تم إضافة قاعدة عنوان IP جديدة.' : 'IP firewall rule updated successfully.', 'success');
                    }}
                    className="bg-luxury-gold-500 text-luxury-dark-950 font-bold px-3 rounded-lg text-xs"
                  >
                    {locale === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {ipRules.map((rule) => (
                    <div key={rule.id} className="flex justify-between items-center p-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`w-2 h-2 rounded-full ${rule.type === 'WHITELIST' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-luxury-dark-100">{rule.ip}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-luxury-dark-400">{rule.desc}</span>
                        <button
                          onClick={() => setIpRules(ipRules.filter((x) => x.id !== rule.id))}
                          className="text-rose-500 hover:text-rose-400"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Key Management (Feature 16) */}
            {hasFeature('api_key_management') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4 lg:col-span-2">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'إدارة مفاتيح الربط الخارجي والمزودين (API Keys)' : 'API Key Management Integration'}
                  </h3>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'اسم النظام المرتبط (مثلا: تكامل بوابة عقار)' : 'Service label (e.g. Zillow integration)'}
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 flex-1"
                  />
                  <button
                    onClick={() => {
                      if (!newKeyLabel) return;
                      const randomKey = 'arb_live_' + Math.random().toString(36).substring(2, 15);
                      setApiKeys([...apiKeys, { id: Math.random().toString(), label: newKeyLabel, key: randomKey, created: new Date().toISOString().split('T')[0] }]);
                      setNewKeyLabel('');
                      addToast(locale === 'ar' ? 'تم توليد مفتاح API جديد.' : 'New API key created successfully.', 'success');
                    }}
                    className="bg-luxury-gold-500 text-luxury-dark-950 font-bold px-4 rounded-lg text-xs"
                  >
                    {locale === 'ar' ? 'إنشاء مفتاح' : 'Generate Key'}
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex justify-between items-center p-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-luxury-dark-100">{k.label}</span>
                        <span className="text-[9px] text-luxury-dark-400 block font-mono">{k.key}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-luxury-dark-400 font-mono">{k.created}</span>
                        <button
                          onClick={() => setApiKeys(apiKeys.filter((x) => x.id !== k.id))}
                          className="text-rose-500 hover:text-rose-400"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 2: LEAD ROUTING & POLICIES */}
        {activeTab === 'routing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Distribution Rules (Feature 20) */}
            {hasFeature('lead_distribution_rules') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'قواعد توزيع العملاء تلقائياً (Lead Distribution)' : 'Lead Distribution & Routing Engine'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-luxury-dark-400 block font-bold">
                      {locale === 'ar' ? 'خوارزمية التوزيع النشطة' : 'Active Routing Engine'}
                    </label>
                    <select
                      value={leadDistribution}
                      onChange={(e) => {
                        setLeadDistribution(e.target.value);
                        addToast(locale === 'ar' ? 'تم تحديث آلية توزيع العملاء.' : 'Lead routing updated.', 'success');
                      }}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                    >
                      <option value="ROUND_ROBIN">{locale === 'ar' ? 'دائري متساوي (Round Robin)' : 'Round Robin (Equal Share)'}</option>
                      <option value="PERFORMANCE">{locale === 'ar' ? 'حسب حجم الصفقات التاريخي (Performance Ranked)' : 'Ranked by closed volume'}</option>
                      <option value="NEIGHBORHOOD">{locale === 'ar' ? 'حسب التخصص والمناطق الجغرافية' : 'Geographic specialty area'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Commission Policy (Feature 19) */}
            {hasFeature('dynamic_commission_policy') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <TrendingUp className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'سياسات العمولات الديناميكية وتوزيع الشرائح' : 'Dynamic Commission Policy Engine'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-luxury-dark-400 block font-bold">
                      {locale === 'ar' ? 'النسبة الافتراضية لعمولات الصفقات' : 'Default Deal Commission Rate (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={minCommissionTier}
                      onChange={(e) => {
                        setMinCommissionTier(e.target.value);
                        addToast(locale === 'ar' ? 'تم تحديث سياسة العمولات الافتراضية.' : 'Default commission policy updated.', 'success');
                      }}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Property validation rules (Feature 11) */}
            {hasFeature('data_validation_rules') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4 lg:col-span-2">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'قواعد تدقيق والتحقق من صحة العقارات قبل النشر' : 'Data Integrity & Quality Validation Rules'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl flex items-center justify-between">
                    <span>{locale === 'ar' ? 'رقم الصك إجباري ومكون من 12 رقماً' : 'Deed Number exact 12 digits'}</span>
                    <input type="checkbox" defaultChecked className="accent-luxury-gold-500" />
                  </div>
                  <div className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl flex items-center justify-between">
                    <span>{locale === 'ar' ? 'توفير الإحداثيات الجغرافية (GPS)' : 'GPS coordinates required'}</span>
                    <input type="checkbox" defaultChecked className="accent-luxury-gold-500" />
                  </div>
                  <div className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl flex items-center justify-between">
                    <span>{locale === 'ar' ? 'تسجيل رقم هاتف المالك مع رمز الدولة' : 'Owner Phone valid format'}</span>
                    <input type="checkbox" defaultChecked className="accent-luxury-gold-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 3: HEALTH MONITOR & ANOMALIES */}
        {activeTab === 'health' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time System Health Monitor (Feature 8) */}
            {hasFeature('system_health') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Server className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مراقب سلامة الخادم والاستهلاك الفوري' : 'Real-time server Health Monitor'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-luxury-dark-950 border border-luxury-dark-850 p-3 rounded-xl">
                    <span className="text-[10px] text-luxury-dark-400 block font-bold">CPU Usage</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">14.2 %</span>
                  </div>
                  <div className="bg-luxury-dark-950 border border-luxury-dark-850 p-3 rounded-xl">
                    <span className="text-[10px] text-luxury-dark-400 block font-bold">Memory usage</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">312 MB</span>
                  </div>
                  <div className="bg-luxury-dark-950 border border-luxury-dark-850 p-3 rounded-xl">
                    <span className="text-[10px] text-luxury-dark-400 block font-bold">API Latency</span>
                    <span className="text-xl font-bold text-luxury-gold-500 font-mono">42 ms</span>
                  </div>
                  <div className="bg-luxury-dark-950 border border-luxury-dark-850 p-3 rounded-xl">
                    <span className="text-[10px] text-luxury-dark-400 block font-bold">DB Connections</span>
                    <span className="text-xl font-bold text-blue-400 font-mono">3 pools</span>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Projection Engine & Heatmaps (Features 9 & 14) */}
            {hasFeature('revenue_projection') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Cpu className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'توقع الإيرادات وتراكم العمولات المستهدف' : 'Revenue Projection Engine'}
                  </h3>
                </div>

                <div className="space-y-3 text-xs text-luxury-dark-200">
                  <div className="flex justify-between items-center">
                    <span>{locale === 'ar' ? 'إجمالي الصفقات المتوقعة (الشهر القادم)' : 'Projected Sales Next Month'}</span>
                    <span className="font-bold text-emerald-400 font-mono">8,500,000 ر.س</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{locale === 'ar' ? 'صافي عمولة شركة أربعة (2.5%)' : 'Est Net Commission Profit'}</span>
                    <span className="font-bold text-luxury-gold-500 font-mono">212,500 ر.س</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{locale === 'ar' ? 'متوسط سرعة الإغلاق للوكلاء' : 'Avg Team Deal Closing Time'}</span>
                    <span className="font-bold text-blue-400 font-mono">18.4 {locale === 'ar' ? 'يوم' : 'days'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 4: ANNOUNCEMENTS & INVOICES */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Announcement Banner (Feature 17) */}
            {hasFeature('announcement_banner') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Megaphone className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'لوحة التعاميم والإعلانات الإدارية العامة' : 'Global System Announcement Banner'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-luxury-dark-400 block font-bold">
                      {locale === 'ar' ? 'نص التعميم الإداري' : 'Announcement marquee text'}
                    </label>
                    <input
                      type="text"
                      value={announcement.text}
                      onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
                      placeholder={locale === 'ar' ? 'اكتب إعلان يظهر في شريط الهيدر للجميع...' : 'Banner text...'}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={announcement.active}
                      onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })}
                      className="w-3.5 h-3.5 rounded accent-luxury-gold-500 cursor-pointer"
                    />
                    <span className="text-xs text-luxury-dark-200">
                      {locale === 'ar' ? 'تفعيل وظهور الشريط في الجزء العلوي' : 'Enable and display banner at top header'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Notifications (Feature 12) */}
            {hasFeature('custom_notifications') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <BellRing className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مرسل التنبيهات المخصصة للموظفين والمسوقين' : 'Send Custom Staff Notification'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'عنوان التنبيه...' : 'Notification title...'}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={locale === 'ar' ? 'محتوى التنبيه المفصل...' : 'Detailed message content...'}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 flex-1"
                    />
                    <button
                      onClick={() => addToast(locale === 'ar' ? 'تم إرسال التنبيه الفوري للموظف.' : 'Custom alert dispatched.', 'success')}
                      className="bg-luxury-gold-500 text-luxury-dark-950 font-bold px-4 rounded-lg text-xs"
                    >
                      {locale === 'ar' ? 'إرسال' : 'Dispatch'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Automated Monthly Invoicing (Feature 10) */}
            {hasFeature('monthly_invoicing') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4 lg:col-span-2">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'نظام الفواتير الشهرية المؤتمت لعمولات الصفقات' : 'Automated Monthly Invoicing log'}
                  </h3>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {[
                    { id: '1', client: 'شركة الراجحي للاستثمار', amount: 80000, date: '2026-05-15', status: 'PAID' },
                    { id: '2', client: 'مجموعة محمد الفوزان العقارية', amount: 125000, date: '2026-05-19', status: 'PENDING' }
                  ].map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center p-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-luxury-dark-100">{inv.client}</span>
                        <span className="text-[10px] text-luxury-dark-400 block font-mono">{inv.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-luxury-gold-500 font-bold">{inv.amount.toLocaleString()} ر.س</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-luxury-gold-500/10 text-luxury-gold-500'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
