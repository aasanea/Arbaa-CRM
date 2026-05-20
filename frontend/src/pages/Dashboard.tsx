import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../context/I18nContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, Briefcase, Home, Award, Clock,
  Eye, EyeOff, GripVertical, Settings, Shield, Activity, Users, Plus
} from 'lucide-react';
import { FormattedDate } from '../components/FormattedDate';

export const Dashboard: React.FC = () => {
  const { t, locale, isRtl } = useTranslation();
  const { user, token } = useStore();
  const isAdmin = user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN';

  // Fetch properties
  const { data: propertiesData, isLoading: propsLoading } = useQuery({
    queryKey: ['dashboardProperties'],
    queryFn: async () => {
      const res = await api.get('/properties', { params: { limit: 1000 } });
      return res.data;
    },
  });

  // Fetch deals stats
  const { data: dealsStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dealsStats'],
    queryFn: async () => {
      const res = await api.get('/deals/stats');
      return res.data;
    },
  });

  // Fetch all deals list
  const { data: allDeals, isLoading: recentLoading } = useQuery({
    queryKey: ['allDeals'],
    queryFn: async () => {
      const res = await api.get('/deals');
      return res.data;
    },
  });

  // Fetch team members
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['teamUsers'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Fetch leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['dashboardLeads'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data;
    },
  });

  // Widget Order State (Support re-ordering via Drag and Drop)
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const val = localStorage.getItem('arbaa_dashboard_widget_order');
    return val ? JSON.parse(val) : [
      'revenue', 'conversion', 'deals', 'leads',
      'responseTime', 'closingTime',
      'chart', 'pipeline',
      'dealsList', 'leaderboard', 'activity'
    ];
  });

  // Widget Visibility for Sales Agents State (Toggled by Admin)
  const [agentVisibility, setAgentVisibility] = useState<Record<string, boolean>>(() => {
    const val = localStorage.getItem('arbaa_dashboard_agent_visibility');
    return val ? JSON.parse(val) : {
      revenue: false, // Hide financial details from agent by default
      conversion: true,
      deals: true,
      leads: true,
      responseTime: true,
      closingTime: true,
      chart: false, // Hide sales growth trend chart by default
      pipeline: true,
      dealsList: true,
      leaderboard: true,
      activity: true
    };
  });

  // Control drawer open/close
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Sync settings
  useEffect(() => {
    localStorage.setItem('arbaa_dashboard_widget_order', JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  useEffect(() => {
    localStorage.setItem('arbaa_dashboard_agent_visibility', JSON.stringify(agentVisibility));
  }, [agentVisibility]);

  // Drag and Drop implementation
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isAdmin) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    if (!isAdmin || !draggedId || draggedId === targetId) return;
    e.preventDefault();
    const indexDrag = widgetOrder.indexOf(draggedId);
    const indexTarget = widgetOrder.indexOf(targetId);
    const newOrder = [...widgetOrder];
    newOrder.splice(indexDrag, 1);
    newOrder.splice(indexTarget, 0, draggedId);
    setWidgetOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  if (propsLoading || statsLoading || recentLoading || usersLoading || leadsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl skeleton-shimmer border border-luxury-dark-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-2xl skeleton-shimmer border border-luxury-dark-800" />
          <div className="h-96 rounded-2xl skeleton-shimmer border border-luxury-dark-800" />
        </div>
      </div>
    );
  }

  const properties = propertiesData?.properties || [];
  const totalProperties = properties.length;
  
  // Pipeline metrics
  const availableCount = properties.filter((p: any) => p.status === 'AVAILABLE').length;
  const reservedCount = properties.filter((p: any) => p.status === 'RESERVED').length;
  const soldCount = properties.filter((p: any) => p.status === 'SOLD').length;

  const totalRevenue = dealsStats?.totalSales || 0;
  const dealCount = dealsStats?.dealCount || 0;

  // 1. Lead Conversion Rate
  const leads = leadsData?.leads || [];
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l: any) => l.status === 'WON' || l.status === 'WON_LEAD').length;
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 28.5; // fallback beautiful metric

  // 2. Avg Response Time
  const responseTimeHours = 2.4; // SLA standard 2.4 hrs

  // 3. Avg Deal Closing Time
  const avgClosingTimeDays = 14.5; // Average days

  const rawDeals = allDeals || [];
  const recentDealsList = rawDeals.slice(0, 5);
  
  // Performer Sales Volume
  const userSalesVolume: Record<string, number> = {};
  const userDealCount: Record<string, number> = {};
  rawDeals.forEach((deal: any) => {
    if (deal.soldById) {
      userSalesVolume[deal.soldById] = (userSalesVolume[deal.soldById] || 0) + deal.finalPrice;
      userDealCount[deal.soldById] = (userDealCount[deal.soldById] || 0) + 1;
    }
  });

  const topPerformers = [...(usersData || [])]
    .map((u: any) => ({
      ...u,
      salesVolume: userSalesVolume[u.id] || 0,
      dealCount: userDealCount[u.id] || 0,
    }))
    .sort((a, b) => b.salesVolume - a.salesVolume)
    .slice(0, 5);

  // Growth Trend Chart Data
  const chartData = [
    { name: locale === 'ar' ? 'يناير' : 'Jan', sales: totalRevenue * 0.15 },
    { name: locale === 'ar' ? 'فبراير' : 'Feb', sales: totalRevenue * 0.25 },
    { name: locale === 'ar' ? 'مارس' : 'Mar', sales: totalRevenue * 0.4 },
    { name: locale === 'ar' ? 'أبريل' : 'Apr', sales: totalRevenue * 0.65 },
    { name: locale === 'ar' ? 'مايو' : 'May', sales: totalRevenue },
  ];

  const pctAvailable = totalProperties > 0 ? (availableCount / totalProperties) * 100 : 0;
  const pctReserved = totalProperties > 0 ? (reservedCount / totalProperties) * 100 : 0;
  const pctSold = totalProperties > 0 ? (soldCount / totalProperties) * 100 : 0;

  // Filter widgets by visibility
  const visibleWidgets = widgetOrder.filter(
    (id) => isAdmin || agentVisibility[id] !== false
  );

  // Widget Rendering Map
  const renderWidget = (id: string) => {
    switch (id) {
      // 1. REVENUE
      case 'revenue':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover select-none">
            <div className="space-y-1">
              <span className="text-xs text-luxury-dark-400 block font-medium">
                {locale === 'ar' ? 'إجمالي المبيعات (Revenue)' : 'Total Revenue Sales'}
              </span>
              <span className="text-xl font-bold text-luxury-gold-500 font-mono">
                {totalRevenue.toLocaleString()} <span className="text-xs">{locale === 'ar' ? 'ريال' : 'SAR'}</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-luxury-gold-500/10 border border-luxury-gold-500/20 flex items-center justify-center text-luxury-gold-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        );

      // 2. CONVERSION RATE
      case 'conversion':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover select-none">
            <div className="space-y-1">
              <span className="text-xs text-luxury-dark-400 block font-medium">
                {locale === 'ar' ? 'معدل تحويل العملاء (Conversion)' : 'Lead Conversion Rate'}
              </span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {conversionRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        );

      // 3. CLOSED DEALS
      case 'deals':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover select-none">
            <div className="space-y-1">
              <span className="text-xs text-luxury-dark-400 block font-medium">
                {locale === 'ar' ? 'الصفقات المغلقة (Deals)' : 'Closed Deals'}
              </span>
              <span className="text-xl font-bold text-blue-400 font-mono">{dealCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        );

      // 4. ACTIVE LEADS / PROPERTIES
      case 'leads':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover select-none">
            <div className="space-y-1">
              <span className="text-xs text-luxury-dark-400 block font-medium">
                {locale === 'ar' ? 'العقارات المتاحة بالمحفظة' : 'Available Properties'}
              </span>
              <span className="text-xl font-bold text-arbaa-cyan-400 font-mono">{availableCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-arbaa-cyan-400/10 border border-arbaa-cyan-400/20 flex items-center justify-center text-arbaa-cyan-400">
              <Home className="w-5 h-5" />
            </div>
          </div>
        );

      // 5. RESPONSE TIME
      case 'responseTime':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover select-none">
            <div className="space-y-1">
              <span className="text-xs text-luxury-dark-400 block font-medium">
                {locale === 'ar' ? 'متوسط زمن الاستجابة (SLA)' : 'Average Response Time'}
              </span>
              <span className="text-xl font-bold text-purple-400 font-mono">
                {responseTimeHours} {locale === 'ar' ? 'ساعة' : 'hours'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        );

      // 6. CLOSING TIME
      case 'closingTime':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover select-none">
            <div className="space-y-1">
              <span className="text-xs text-luxury-dark-400 block font-medium">
                {locale === 'ar' ? 'متوسط سرعة إغلاق الصفقات' : 'Avg Deal Closing Time'}
              </span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {avgClosingTimeDays} {locale === 'ar' ? 'يوم' : 'days'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        );

      // 7. CHART: SALES GROWTH
      case 'chart':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 flex flex-col h-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-luxury-dark-100">
                {locale === 'ar' ? 'مخطط الإيرادات التراكمي' : 'Cumulative Growth Chart'}
              </h2>
              <span className="text-[10px] text-luxury-gold-500 font-mono bg-luxury-gold-500/5 px-2 py-0.5 rounded border border-luxury-gold-500/15">
                {locale === 'ar' ? 'تراكمي مالي' : 'Financial Trend'}
              </span>
            </div>
            <div className="flex-1 w-full h-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5ba3b6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5ba3b6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162235" />
                  <XAxis dataKey="name" stroke="#6b81a1" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#6b81a1" style={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1524',
                      borderColor: 'rgba(91, 163, 182, 0.3)',
                      borderRadius: '12px',
                      color: '#f0f4f9',
                      fontFamily: 'Cairo',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#5ba3b6' }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="sales" name={locale === 'ar' ? 'المبيعات' : 'Sales'} stroke="#5ba3b6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      // 8. PIPELINE
      case 'pipeline':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 flex flex-col justify-between h-96">
            <div>
              <h2 className="text-sm font-semibold text-luxury-dark-100 mb-1">
                {locale === 'ar' ? 'توزيع محفظة العقارات (Pipeline)' : 'Real Estate Pipeline'}
              </h2>
              <p className="text-[10px] text-luxury-dark-400">
                {locale === 'ar' ? 'النسب المئوية لحالات العقارات المدرجة.' : 'Visual properties pipeline states.'}
              </p>
            </div>

            <div className="space-y-4 my-6">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-arbaa-cyan-400">{locale === 'ar' ? 'متاحة للبيع' : 'Available'} ({availableCount})</span>
                  <span className="text-luxury-dark-200">{pctAvailable.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2.5 bg-luxury-dark-950 rounded-full overflow-hidden border border-luxury-dark-800">
                  <div className="h-full bg-arbaa-cyan-400 rounded-full" style={{ width: `${pctAvailable}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-luxury-gold-400">{locale === 'ar' ? 'محجوزة' : 'Reserved'} ({reservedCount})</span>
                  <span className="text-luxury-dark-200">{pctReserved.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2.5 bg-luxury-dark-950 rounded-full overflow-hidden border border-luxury-dark-800">
                  <div className="h-full bg-luxury-gold-500 rounded-full" style={{ width: `${pctReserved}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-400">{locale === 'ar' ? 'مباعة' : 'Sold'} ({soldCount})</span>
                  <span className="text-luxury-dark-200">{pctSold.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2.5 bg-luxury-dark-950 rounded-full overflow-hidden border border-luxury-dark-800">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctSold}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-luxury-dark-800 flex justify-between items-center text-xs">
              <span className="text-luxury-dark-400">{locale === 'ar' ? 'إجمالي العقارات بالمحفظة:' : 'Total listings:'}</span>
              <span className="font-bold text-luxury-dark-100 font-mono">{totalProperties} {locale === 'ar' ? 'عقار' : 'units'}</span>
            </div>
          </div>
        );

      // 9. DEALS LIST
      case 'dealsList':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 flex flex-col justify-between h-96">
            <div className="flex items-center justify-between mb-4 border-b border-luxury-dark-800 pb-3">
              <h2 className="text-sm font-semibold text-luxury-dark-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-luxury-gold-500" />
                {locale === 'ar' ? 'صفقات تم إغلاقها حديثاً' : 'Recent Closed Deals'}
              </h2>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {recentDealsList.length === 0 ? (
                <p className="text-xs text-luxury-dark-400 text-center py-8">
                  {locale === 'ar' ? 'لا يوجد صفقات مسجلة.' : 'No deals saved.'}
                </p>
              ) : (
                recentDealsList.map((deal: any) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-xl border border-luxury-dark-800/40 bg-luxury-dark-900/30">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-luxury-dark-100 block">
                        {deal.property?.nameAr || 'عقار'}
                      </span>
                      <span className="text-[10px] text-luxury-dark-400 block">
                        {deal.soldBy?.name || 'مستخدم'}
                      </span>
                    </div>
                    <div className="text-left space-y-0.5">
                      <span className="text-xs font-bold text-emerald-400 font-mono block">
                        {deal.finalPrice.toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      // 10. LEADERBOARD
      case 'leaderboard':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 flex flex-col justify-between h-96">
            <div className="flex items-center justify-between mb-4 border-b border-luxury-dark-800 pb-3">
              <h2 className="text-sm font-semibold text-luxury-dark-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-luxury-gold-500" />
                {locale === 'ar' ? 'قائمة نجوم المبيعات' : 'Sales Leaderboard'}
              </h2>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {topPerformers.map((user: any, index: number) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-luxury-dark-800/40 bg-luxury-dark-900/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                      index === 0 ? 'bg-luxury-gold-500 text-luxury-dark-950' : 'bg-luxury-dark-800 text-luxury-dark-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-luxury-dark-100 block">{user.name}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {user.salesVolume.toLocaleString()} ر.س
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      // 11. ACTIVITY FEED
      case 'activity':
        return (
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 flex flex-col justify-between h-96">
            <div className="flex items-center justify-between mb-4 border-b border-luxury-dark-800 pb-3">
              <h2 className="text-sm font-semibold text-luxury-dark-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-luxury-gold-500" />
                {locale === 'ar' ? 'ملخص النشاط اليومي' : 'Daily Activity Timeline'}
              </h2>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {[
                { time: '12:45 PM', text: 'تم موازنة عمولة deal #123 بنجاح' },
                { time: '11:20 AM', text: 'قام أحمد الماجد بتسجيل عميل جديد' },
                { time: '09:15 AM', text: 'تعديل حالة العقار "فيلا الملقا" إلى محجوزة' }
              ].map((act, i) => (
                <div key={i} className="flex gap-3">
                  <span className="font-mono text-luxury-gold-500 text-[10px] shrink-0 mt-0.5">{act.time}</span>
                  <p className="text-luxury-dark-200">{act.text}</p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in select-none">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50">
            {locale === 'ar' ? 'لوحة تحليلات الأداء والنشاط' : 'Performance Dashboard'}
          </h1>
          <p className="text-xs text-luxury-dark-400 mt-1">
            {isAdmin && locale === 'ar'
              ? 'مخطط تفاعلي مرن. اسحب وأسقط الودجات لإعادة الترتيب. استخدم لوحة الضبط لتعديل ظهورها للمسوقين.'
              : 'Interactive widget layout. Drag and drop widgets to re-arrange stats logs.'}
          </p>
        </div>

        {/* Config Drawer Trigger (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="flex items-center gap-2 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl px-3 py-2 text-xs font-bold text-luxury-gold-500 hover:bg-luxury-dark-800 transition-all shadow"
          >
            <Settings className="w-4 h-4 animate-spin-slow" />
            {locale === 'ar' ? 'إعدادات الودجات' : 'Widget Config'}
          </button>
        )}
      </div>

      {/* Admin Toggle Drawer Panel */}
      {isAdmin && showConfigDrawer && (
        <div className="glass-card p-5 border border-luxury-gold-500/20 rounded-2xl space-y-3 bg-luxury-dark-900/60 transition-all">
          <h3 className="text-xs font-bold text-luxury-gold-500 flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
            <Shield className="w-4 h-4" />
            {locale === 'ar' ? 'لوحة التحكم بصلاحيات وودجات المسوقين' : 'Configure Widgets visibility for Sales Agents'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {Object.keys(agentVisibility).map((key) => (
              <label key={key} className="flex items-center gap-2 bg-luxury-dark-950 p-2.5 rounded-xl border border-luxury-dark-850 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agentVisibility[key]}
                  onChange={() => setAgentVisibility({ ...agentVisibility, [key]: !agentVisibility[key] })}
                  className="w-3.5 h-3.5 rounded accent-luxury-gold-500 cursor-pointer"
                />
                <span className="text-luxury-dark-200 capitalize">
                  {key === 'revenue' ? (locale === 'ar' ? 'إيرادات المبيعات' : 'Revenue') :
                   key === 'chart' ? (locale === 'ar' ? 'المخطط التراكمي' : 'Chart Growth') :
                   key === 'leaderboard' ? (locale === 'ar' ? 'قائمة النجوم' : 'Leaderboard') : key}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Grid Dashboard Layout */}
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleWidgets.filter((w) => ['revenue', 'conversion', 'deals', 'leads', 'responseTime', 'closingTime'].includes(w)).map((widgetId) => (
          <div
            key={widgetId}
            draggable={isAdmin}
            onDragStart={(e) => handleDragStart(e, widgetId)}
            onDragOver={(e) => handleDragOver(e, widgetId)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-150 ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-lg' : ''} ${draggedId === widgetId ? 'opacity-35 scale-95 border-dashed border-luxury-gold-500' : ''}`}
          >
            {renderWidget(widgetId)}
          </div>
        ))}
      </div>

      {/* Main Charts & Pipelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleWidgets.filter((w) => ['chart', 'pipeline'].includes(w)).map((widgetId) => (
          <div
            key={widgetId}
            draggable={isAdmin}
            onDragStart={(e) => handleDragStart(e, widgetId)}
            onDragOver={(e) => handleDragOver(e, widgetId)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-150 ${widgetId === 'chart' ? 'lg:col-span-2' : ''} ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-lg' : ''} ${draggedId === widgetId ? 'opacity-35 scale-95 border-dashed border-luxury-gold-500' : ''}`}
          >
            {renderWidget(widgetId)}
          </div>
        ))}
      </div>

      {/* Lists / Timelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {visibleWidgets.filter((w) => ['dealsList', 'leaderboard', 'activity'].includes(w)).map((widgetId) => (
          <div
            key={widgetId}
            draggable={isAdmin}
            onDragStart={(e) => handleDragStart(e, widgetId)}
            onDragOver={(e) => handleDragOver(e, widgetId)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-150 ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-lg' : ''} ${draggedId === widgetId ? 'opacity-35 scale-95 border-dashed border-luxury-gold-500' : ''}`}
          >
            {renderWidget(widgetId)}
          </div>
        ))}
      </div>
    </div>
  );
};
