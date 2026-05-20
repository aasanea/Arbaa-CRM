import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../context/I18nContext';
import { Sliders, CheckCircle, ShieldAlert, Zap, Users, Shield } from 'lucide-react';

interface FeatureFlag {
  id: string;
  key: string;
  displayNameAr: string;
  displayNameEn: string;
  category: string;
  enabledGlobal: boolean;
  enabledForSales: boolean;
}

export const SystemConfig: React.FC = () => {
  const { t, locale, isRtl } = useTranslation();
  const queryClient = useQueryClient();
  const { addToast } = useStore();

  // Fetch all feature flags
  const { data: flags, isLoading } = useQuery<FeatureFlag[]>({
    queryKey: ['systemFeatureFlags'],
    queryFn: async () => {
      const res = await api.get('/features');
      return res.data;
    },
  });

  // Mutation to toggle a feature flag
  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabledGlobal, enabledForSales }: { key: string; enabledGlobal?: boolean; enabledForSales?: boolean }) => {
      const res = await api.put(`/features/${key}`, { enabledGlobal, enabledForSales });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemFeatureFlags'] });
      addToast(
        locale === 'ar' ? 'تم تحديث إعدادات النظام وتطبيقها فوراً.' : 'System features configuration updated successfully.',
        'success'
      );
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || (locale === 'ar' ? 'فشل تحديث الإعدادات.' : 'Failed to update feature settings.'), 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-10 w-64 bg-luxury-dark-800 rounded skeleton-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-luxury-dark-800 skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  // Filter features by categories
  const coreFlags = flags?.filter((f) => f.category === 'CORE') || [];
  const agentFlags = flags?.filter((f) => f.category === 'AGENT') || [];
  const adminFlags = flags?.filter((f) => f.category === 'ADMIN') || [];

  const handleToggle = (key: string, field: 'enabledGlobal' | 'enabledForSales', currentValue: boolean) => {
    toggleMutation.mutate({
      key,
      [field]: !currentValue,
    });
  };

  const renderSection = (titleAr: string, titleEn: string, list: FeatureFlag[], icon: any, colorClass: string) => {
    const Icon = icon;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-luxury-dark-800/60">
          <div className={`p-1.5 rounded-lg bg-luxury-dark-900 border border-luxury-dark-800/80 ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-luxury-dark-100">
            {locale === 'ar' ? titleAr : titleEn}
          </h2>
          <span className="text-[10px] font-mono text-luxury-dark-400 bg-luxury-dark-900 border border-luxury-dark-800 px-2 py-0.5 rounded-full">
            {list.length} {locale === 'ar' ? 'ميزة' : 'features'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((flag) => (
            <div
              key={flag.id}
              className={`glass-card p-4 rounded-xl border transition-all duration-200 ${
                flag.enabledGlobal
                  ? 'border-luxury-gold-500/10 hover:border-luxury-gold-500/20 bg-luxury-dark-950/20'
                  : 'border-rose-500/10 opacity-75 bg-rose-950/2'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-luxury-dark-50">
                    {locale === 'ar' ? flag.displayNameAr : flag.displayNameEn}
                  </h3>
                  <span className="text-[9px] text-luxury-dark-400 font-mono block">
                    {flag.key}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Global Switch */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-luxury-dark-400 font-bold">
                      {locale === 'ar' ? 'عام' : 'Global'}
                    </span>
                    <button
                      onClick={() => handleToggle(flag.key, 'enabledGlobal', flag.enabledGlobal)}
                      disabled={toggleMutation.isPending}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        flag.enabledGlobal ? 'bg-luxury-gold-500' : 'bg-luxury-dark-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-luxury-dark-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                          flag.enabledGlobal ? (isRtl ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sales Agent Switch */}
                  {flag.category !== 'ADMIN' && (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[9px] text-luxury-dark-400 font-bold">
                        {locale === 'ar' ? 'المسوقين' : 'Agents'}
                      </span>
                      <button
                        onClick={() => handleToggle(flag.key, 'enabledForSales', flag.enabledForSales)}
                        disabled={toggleMutation.isPending || !flag.enabledGlobal}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          !flag.enabledGlobal
                            ? 'bg-luxury-dark-900 cursor-not-allowed opacity-50'
                            : flag.enabledForSales
                            ? 'bg-emerald-500'
                            : 'bg-luxury-dark-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-luxury-dark-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                            flag.enabledGlobal && flag.enabledForSales
                              ? isRtl
                                ? '-translate-x-4'
                                : 'translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8 fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
          <Sliders className="w-6 h-6 text-luxury-gold-500" />
          {locale === 'ar' ? 'إعدادات ميزات النظام' : 'System Feature Configuration'}
        </h1>
        <p className="text-xs text-luxury-dark-400 mt-1">
          {locale === 'ar'
            ? 'تفعيل وتعطيل ميزات CRM تفاعلياً على مستوى النظام أو لأدوار المسوقين ومندوبي المبيعات.'
            : 'Toggle specific features and tool modules globally or override for sales agents dynamically.'}
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {renderSection('الميزات الأساسية والذكية', 'Core System Modules', coreFlags, Zap, 'text-luxury-gold-500')}
        {renderSection('صندوق أدوات المسوق العقاري', 'Sales Agents Toolkit', agentFlags, Users, 'text-emerald-400')}
        {renderSection('أدوات التحكم والحماية للإدارة', 'Administrative controls', adminFlags, Shield, 'text-blue-400')}
      </div>
    </div>
  );
};
