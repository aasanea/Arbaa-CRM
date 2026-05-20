import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from './store/useStore';
import { ToastContainer } from './components/ToastContainer';
import { api } from './utils/api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Properties } from './pages/Properties';
import { AIParser } from './pages/AIParser';
import { Deals } from './pages/Deals';
import { PriceRequests } from './pages/PriceRequests';
import { AuditLogs } from './pages/AuditLogs';
import { Team } from './pages/Team';
import { CMSSettings } from './pages/CMSSettings';
import { Leads } from './pages/Leads';

import { SystemConfig } from './pages/SystemConfig';
import { AgentWorkbench } from './pages/AgentWorkbench';
import { AdminControlHub } from './pages/AdminControlHub';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { FormattedDate } from './components/FormattedDate';
import { useTranslation } from './context/I18nContext';

import {
  LayoutDashboard,
  Home,
  Sparkles,
  Briefcase,
  TrendingDown,
  ShieldCheck,
  Users,
  Settings,
  LogOut,
  User as UserIcon,
  Shield,
  Layers,
  Bell,
  Calendar,
  DollarSign,
  ExternalLink,
  X,
  Percent,
  Sun,
  Moon,
  Sliders,
  Award,
  Menu,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppContent: React.FC = () => {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale, isRtl } = useTranslation();
  const { token, user, logout, settings, hasPermission, fetchActiveFeatures, hasFeature } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [viewedNotificationId, setViewedNotificationId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('arbaa_sidebar_collapsed') === 'true');

  useEffect(() => {
    if (token) {
      fetchActiveFeatures();
    }
  }, [token]);

  const { data: activeDeal, isLoading: loadingActiveDeal } = useQuery({
    queryKey: ['activeDealDetails', activeDealId],
    queryFn: async () => {
      const res = await api.get(`/deals/${activeDealId}`);
      return res.data;
    },
    enabled: !!activeDealId && !!token,
  });

  // If unauthorized, show login
  if (!token) {
    return <Login />;
  }

  // Sidebar navigation options
  const navigationItems = [
    { id: 'dashboard', label: t('tab_dashboard'), icon: LayoutDashboard, permission: null, featureFlag: 'performance_dashboard' },
    { id: 'properties', label: t('tab_properties'), icon: Home, permission: null },
    { id: 'leads', label: t('tab_leads'), icon: Layers, permission: null },
    { id: 'ai-parser', label: t('tab_ai_parser'), icon: Sparkles, permission: null, featureFlag: 'ai_parser' },
    { id: 'agent-workbench', label: t('tab_agent_workbench'), icon: Award, permission: null },
    { id: 'deals', label: t('tab_deals'), icon: Briefcase, permission: null },
    { id: 'price-requests', label: t('tab_price_requests'), icon: TrendingDown, permission: null },
    { id: 'audit-logs', label: t('tab_audit_logs'), icon: ShieldCheck, permission: 'view_audit_logs' },
    { id: 'team', label: t('tab_team'), icon: Users, permission: 'manage_users' },
    { id: 'admin-hub', label: t('tab_admin_hub'), icon: Shield, permission: 'manage_users' },
    { id: 'system-config', label: t('tab_system_config'), icon: Sliders, permission: 'manage_users' },
    { id: 'cms-settings', label: t('tab_cms_settings'), icon: Settings, permission: 'manage_cms' },
  ];

  const getRoleBadge = (roleName?: string) => {
    if (!roleName) return t('MARKETER');
    return t(roleName) || roleName;
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'properties':
        return <Properties />;
      case 'leads':
        return <Leads />;
      case 'ai-parser':
        return <AIParser />;
      case 'agent-workbench':
        return <AgentWorkbench />;
      case 'deals':
        return <Deals />;
      case 'price-requests':
        return <PriceRequests />;
      case 'audit-logs':
        return hasPermission('view_audit_logs') ? <AuditLogs /> : <Dashboard />;
      case 'team':
        return hasPermission('manage_users') ? <Team /> : <Dashboard />;
      case 'admin-hub':
        return hasPermission('manage_users') ? <AdminControlHub /> : <Dashboard />;
      case 'system-config':
        return hasPermission('manage_users') ? <SystemConfig /> : <Dashboard />;
      case 'cms-settings':
        return hasPermission('manage_cms') ? <CMSSettings /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-luxury-dark-950 flex font-cairo select-none" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile overlay backdrop */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Right/Left Sidebar */}
      <aside className={`
        bg-luxury-dark-900 ${isRtl ? 'border-l' : 'border-r'} border-luxury-gold-500/10 
        flex flex-col justify-between h-screen z-50 transition-all duration-300 ease-in-out shrink-0
        fixed md:sticky top-0
        ${isSidebarCollapsed 
          ? `md:w-20 w-64 ${isRtl ? 'translate-x-full' : '-translate-x-full'} md:translate-x-0` 
          : 'w-64 translate-x-0'
        }
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Brand header */}
          <div className={`p-6 border-b border-luxury-dark-800 flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center p-4' : 'gap-3'}`}>
            <img src="/logo.png" alt="شعار شركة أربعة" className="w-10 h-10 object-contain rounded-xl bg-luxury-dark-950 p-1 border border-luxury-gold-500/10 shadow-inner shrink-0" />
            {!isSidebarCollapsed && (
              <div className="opacity-100 transition-opacity duration-300 min-w-0">
                <h2 className="text-sm font-bold text-luxury-dark-50 truncate w-40">{settings.companyName}</h2>
                <span className="text-[10px] text-arbaa-cyan-400 font-semibold tracking-wider block">{t('digital_portal')}</span>
              </div>
            )}
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigationItems.map((item) => {
              // Check RBAC permission for this tab
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              // Check Feature Flag toggle
              if (item.featureFlag && !hasFeature(item.featureFlag)) {
                return null;
              }

              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    // On mobile, auto-close sidebar after selection
                    if (window.innerWidth < 768) {
                      setIsSidebarCollapsed(true);
                      localStorage.setItem('arbaa_sidebar_collapsed', 'true');
                    }
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                    isActive
                      ? 'bg-luxury-gold-500/10 border-luxury-gold-500/20 text-luxury-gold-500'
                      : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-100 hover:bg-luxury-dark-800/40'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 shrink-0 ${isActive ? 'scale-110' : ''}`} />
                  {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (Copyright) */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-luxury-dark-800 text-center transition-opacity duration-300">
            <p className="text-[9px] text-luxury-dark-400 leading-relaxed font-sans">{settings.footerText}</p>
          </div>
        )}
      </aside>

      {/* Main Panel Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* System-wide Announcement Banner (Feature 17) */}
        {hasFeature('announcement_banner') && localStorage.getItem('arbaa_announcement_active') === 'true' && (
          <div className="bg-gradient-to-r from-luxury-gold-500/25 to-luxury-gold-500/10 border-b border-luxury-gold-500/20 py-2 px-6 text-center text-[10px] font-black text-luxury-gold-500 flex items-center justify-center gap-2 select-none">
            <span className="w-2 h-2 rounded-full bg-luxury-gold-500 shrink-0 animate-ping" />
            <marquee scrollamount="4" className="w-full">
              {localStorage.getItem('arbaa_announcement_text') || 'مرحباً بكم في بوابة شركة أربعة للتسويق العقاري الرقمية'}
            </marquee>
          </div>
        )}

        {/* Top Navbar Header */}
        <header className="h-16 border-b border-luxury-dark-800 bg-luxury-dark-900/60 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10 transition-all duration-300">
          {/* Site description title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const newVal = !isSidebarCollapsed;
                setIsSidebarCollapsed(newVal);
                localStorage.setItem('arbaa_sidebar_collapsed', String(newVal));
              }}
              className="p-2 text-luxury-dark-400 hover:text-luxury-gold-500 hover:bg-luxury-dark-800/40 rounded-lg transition-colors border border-transparent hover:border-luxury-gold-500/20 cursor-pointer"
              title={isSidebarCollapsed ? t('expand') || 'Expand' : t('collapse') || 'Collapse'}
            >
              <Menu className="w-5 h-5" />
            </button>
            <img src="/logo.png" alt="شعار شركة أربعة" className="w-8 h-8 object-contain rounded-lg bg-luxury-dark-950 p-0.5 border border-luxury-gold-500/10 md:hidden" />
            <div>
              <span className="text-xs font-bold text-luxury-dark-50 block md:hidden">{settings.companyName}</span>
              <h3 className="text-xs text-luxury-dark-300 font-medium hidden md:block">
                {settings.siteTitle}
              </h3>
            </div>
          </div>

          {/* Logged in User widget and logout button */}
          <div className="flex items-center gap-4">
            {/* Language Toggle Button */}
            <button
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="px-2.5 py-1.5 rounded-lg border border-luxury-dark-800 hover:border-luxury-gold-500/20 text-luxury-dark-300 hover:text-luxury-gold-500 bg-luxury-dark-900/40 text-[10px] font-black transition-colors cursor-pointer font-mono"
              title={locale === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
            >
              {locale === 'ar' ? 'EN' : 'AR'}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-luxury-dark-800 hover:border-luxury-gold-500/20 text-luxury-dark-400 hover:text-luxury-gold-500 bg-luxury-dark-900/40 transition-colors cursor-pointer"
              title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Notification Bell alert dropdown */}
            {(() => {
              const { data: notifications } = useQuery({
                queryKey: ['notifications'],
                queryFn: async () => {
                  const res = await api.get('/notifications');
                  return res.data;
                },
                enabled: !!token,
                refetchInterval: 12000,
              });

              const unreadCount = notifications?.filter((n: any) => !n.isRead).length || 0;

              const readMutation = useMutation({
                mutationFn: async (id: string) => {
                  await api.patch(`/notifications/${id}/read`);
                },
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                },
              });

              const readAllMutation = useMutation({
                mutationFn: async () => {
                  await api.post('/notifications/read-all');
                },
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                },
              });

              return (
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg border border-luxury-dark-800 hover:border-luxury-gold-500/20 text-luxury-dark-400 hover:text-luxury-gold-500 bg-luxury-dark-900/40 transition-colors relative"
                    title={t('smart_notifications')}
                  >
                    <Bell className="w-4.5 h-4.5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute left-0 mt-2 w-80 bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl shadow-2xl overflow-hidden z-30 slide-up">
                      <div className="p-4 border-b border-luxury-dark-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-luxury-dark-50">{t('notifications')}</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => readAllMutation.mutate()}
                            className="text-[10px] text-luxury-gold-500 hover:text-luxury-gold-400 font-bold"
                          >
                            {t('mark_all_read')}
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-luxury-dark-800/40">
                        {!notifications || notifications.length === 0 ? (
                          <div className="p-8 text-center text-luxury-dark-400 text-xs">
                            {t('no_new_notifications')}
                          </div>
                        ) : (
                          notifications.map((n: any) => {
                            const isCommission = n.message.includes('|');
                            const displayMsg = isCommission ? n.message.split('|')[0] : n.message;
                            const dealId = isCommission ? n.message.split('|')[1] : null;

                            return (
                              <div
                                key={n.id}
                                onClick={() => {
                                  if (!n.isRead) {
                                    readMutation.mutate(n.id);
                                  }
                                  if (isCommission && dealId) {
                                    setActiveDealId(dealId);
                                    setViewedNotificationId(n.id);
                                  }
                                }}
                                className={`p-3 ${isRtl ? 'text-right' : 'text-left'} cursor-pointer hover:bg-luxury-dark-900/40 transition-colors ${
                                  !n.isRead ? 'bg-luxury-gold-500/2' : ''
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-xs font-bold ${!n.isRead ? 'text-luxury-gold-500' : 'text-luxury-dark-200'}`}>
                                    {n.title}
                                  </span>
                                  {!n.isRead && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[10px] text-luxury-dark-400 mt-1 leading-relaxed">{displayMsg}</p>
                                 <span className="text-[8px] text-luxury-dark-500 font-mono mt-1.5 block">
                                   <FormattedDate date={n.createdAt} timeOnly />
                                 </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-luxury-dark-800 border border-luxury-dark-700 flex items-center justify-center text-arbaa-cyan-400 shadow-inner">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <span className="text-xs font-bold text-luxury-dark-100 block">{user?.name}</span>
                <span className="text-[9px] font-bold text-arbaa-cyan-400 bg-arbaa-cyan-400/5 border border-arbaa-cyan-400/10 px-1.5 py-0.5 rounded-md mt-0.5 block w-max font-mono">
                  {getRoleBadge(user?.roleName)}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                logout();
                queryClient.clear();
              }}
              className="p-2 rounded-lg border border-luxury-dark-800 hover:border-rose-500/20 text-luxury-dark-400 hover:text-rose-500 bg-luxury-dark-900/40 transition-colors"
              title={t('logout')}
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* Main Dynamic View Content */}
        <main className="flex-1 bg-luxury-dark-950">
          {renderActivePage()}
        </main>
      </div>

      {/* Commission Details Modal */}
      {activeDealId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative slide-up my-8 text-xs text-luxury-dark-200 animate-fadeIn" dir={isRtl ? 'rtl' : 'ltr'}>
            <button
              onClick={() => {
                setActiveDealId(null);
                setViewedNotificationId(null);
              }}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">تفاصيل عمولة الصفقة 💰</h2>

            {loadingActiveDeal ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-luxury-gold-500/20 border-t-luxury-gold-500 animate-spin" />
                <span className="text-xs text-luxury-dark-400">جاري تحميل بيانات الصفقة...</span>
              </div>
            ) : !activeDeal ? (
              <div className="py-12 text-center text-rose-500 font-semibold">
                فشل في جلب بيانات الصفقة أو قد تكون تم حذفها.
              </div>
            ) : (() => {
              // Parse splits
              let splits: Array<{ userId: string; name: string; percentage: number }> = [];
              try {
                splits = typeof activeDeal.partnerSplits === 'string'
                  ? JSON.parse(activeDeal.partnerSplits)
                  : activeDeal.partnerSplits;
              } catch(e) {}

              const mySplit = splits.find((s) => s.userId === user?.id);
              const myPercentage = mySplit ? mySplit.percentage : 0;
              const myAmount = (myPercentage / 100) * activeDeal.commissionAmount;

              return (
                <div className="space-y-6">
                  {/* Property Card Link */}
                  <div className="bg-luxury-dark-900/60 border border-luxury-dark-800 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-luxury-dark-400 block mb-1">العقار المباع</span>
                      <span className="text-sm font-bold text-luxury-dark-50">{activeDeal.property?.nameAr}</span>
                      <span className="text-[10px] text-luxury-dark-400 block mt-0.5">
                        {activeDeal.property?.neighborhood} • {activeDeal.property?.type === 'VILLA' ? 'فيلا' : activeDeal.property?.type === 'APARTMENT' ? 'شقة' : activeDeal.property?.type === 'LAND' ? 'أرض' : activeDeal.property?.type === 'BUILDING' ? 'عمارة' : 'مكتب'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('properties');
                        setActiveDealId(null);
                        setViewedNotificationId(null);
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-luxury-gold-500 hover:text-luxury-gold-400 bg-luxury-gold-500/5 border border-luxury-gold-500/10 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> عرض العقار
                    </button>
                  </div>

                  {/* Seller & Date Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-luxury-dark-900/40 border border-luxury-dark-800/60 rounded-xl p-3">
                      <span className="text-[10px] text-luxury-dark-400 block mb-1">المنفذ الرئيسي للصفقة</span>
                      <span className="text-xs font-bold text-luxury-dark-200">{activeDeal.soldBy?.name}</span>
                    </div>
                    <div className="bg-luxury-dark-900/40 border border-luxury-dark-800/60 rounded-xl p-3">
                      <span className="text-[10px] text-luxury-dark-400 block mb-1">تاريخ الصفقة</span>
                      <span className="text-xs font-bold text-luxury-dark-200 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-luxury-gold-500" />
                        <FormattedDate date={activeDeal.soldAt} />
                      </span>
                    </div>
                  </div>

                  {/* User Earnings Highlight */}
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <span className="text-xs text-luxury-dark-300 block mb-1">حساب عمولتك المستحقة من هذه الصفقة</span>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {myAmount.toLocaleString()} ر.س
                    </div>
                    <span className="text-[10px] text-luxury-dark-400 mt-1 block">
                      بنسبة مشاركة <strong className="text-emerald-400 font-mono font-bold">{myPercentage}%</strong> من إجمالي عمولة الصفقة
                    </span>
                  </div>

                  {/* Detailed Financial Breakdown */}
                  <div className="border border-luxury-dark-800 rounded-xl overflow-hidden">
                    <div className="bg-luxury-dark-900 p-3 border-b border-luxury-dark-800">
                      <span className="text-xs font-bold text-luxury-dark-200">البيان المالي الإجمالي للصفقة</span>
                    </div>
                    <div className="divide-y divide-luxury-dark-800/60">
                      <div className="p-3 flex justify-between items-center">
                        <span className="text-luxury-dark-400">السعر النهائي المتفق عليه:</span>
                        <span className="font-bold font-mono text-luxury-dark-100">{activeDeal.finalPrice.toLocaleString()} ر.س</span>
                      </div>
                      <div className="p-3 flex justify-between items-center">
                        <span className="text-luxury-dark-400">إجمالي عمولة الشركة (2.5%):</span>
                        <span className="font-bold font-mono text-luxury-gold-500">{activeDeal.commissionAmount.toLocaleString()} ر.س</span>
                      </div>
                    </div>
                  </div>

                  {/* Partners Splits Summary */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-luxury-gold-500 flex items-center gap-1">
                      <Percent className="w-4 h-4" /> بيان توزيع نسب الشركاء
                    </span>
                    <div className="bg-luxury-dark-900/30 border border-luxury-dark-800 rounded-xl divide-y divide-luxury-dark-800/40">
                      {splits.map((s, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-luxury-gold-500" />
                            <span className={s.userId === user?.id ? 'text-luxury-gold-400 font-bold' : 'text-luxury-dark-200'}>
                              {s.name} {s.userId === user?.id && '(أنت)'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-luxury-dark-400 font-bold">{s.percentage}%</span>
                            <span className="font-mono text-emerald-400 font-semibold w-24 text-left">
                              {((s.percentage / 100) * activeDeal.commissionAmount).toLocaleString()} ر.س
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Sticky Footer */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setActiveDealId(null);
                        setViewedNotificationId(null);
                      }}
                      className="bg-gold-gradient text-luxury-dark-950 font-bold px-6 py-2.5 rounded-lg text-xs"
                    >
                      إغلاق التفاصيل
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
        <ToastContainer />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
