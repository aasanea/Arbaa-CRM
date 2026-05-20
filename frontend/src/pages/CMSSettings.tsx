import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { Settings, Save, RefreshCw, Globe, Shield } from 'lucide-react';

export const CMSSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { setSettings, addToast, hasPermission } = useStore();

  const [companyName, setCompanyName] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [footerText, setFooterText] = useState('');

  // Fetch settings from API
  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['cmsSettings'],
    queryFn: async () => {
      const res = await api.get('/cms');
      return res.data;
    },
  });

  // Populate local form fields when data arrives
  useEffect(() => {
    if (dbSettings) {
      setCompanyName(dbSettings.companyName || '');
      setSiteTitle(dbSettings.siteTitle || '');
      setSiteDescription(dbSettings.siteDescription || '');
      setFooterText(dbSettings.footerText || '');
      
      // Update global Zustand store
      setSettings(dbSettings);
    }
  }, [dbSettings, setSettings]);

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/cms', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cmsSettings'] });
      // Propagate update to store
      setSettings(data);
      addToast('تم حفظ وتطبيق إعدادات المظهر والهوية بنجاح.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل تحديث الإعدادات.', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('manage_cms')) {
      addToast('عذراً، لا تمتلك الصلاحيات الكافية لتعديل إعدادات الهوية.', 'error');
      return;
    }
    saveMutation.mutate({
      companyName,
      siteTitle,
      siteDescription,
      footerText,
    });
  };

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-luxury-gold-500" /> إعدادات النظام والهوية (CMS Settings)
        </h1>
        <p className="text-xs text-luxury-dark-400 mt-1">
          تخصيص الهوية التجارية لشركة أربعة، نصوص ذيل الصفحات، وعناوين واجهة المستخدم الفرعية.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 space-y-4">
            <h2 className="text-xs font-bold text-luxury-gold-500 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> تخصيص الهوية التجارية والنصوص العامة
            </h2>

            {isLoading ? (
              <div className="space-y-4 py-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg skeleton-shimmer" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label>اسم الشركة أو المؤسسة بالعربية *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!hasPermission('manage_cms')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label>عنوان النظام التعريفي (Site Title) *</label>
                  <input
                    type="text"
                    required
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    disabled={!hasPermission('manage_cms')}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label>الوصف التعريفي المقتضب (Site Description) *</label>
                  <textarea
                    rows={3}
                    required
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    disabled={!hasPermission('manage_cms')}
                    className="w-full text-xs font-sans leading-relaxed"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label>حقوق الملكية الفكرية وذيل الصفحة (Footer Copyright Text) *</label>
                  <input
                    type="text"
                    required
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    disabled={!hasPermission('manage_cms')}
                  />
                </div>

                {hasPermission('manage_cms') ? (
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="w-full mt-6 bg-gold-gradient text-luxury-dark-950 font-bold py-3 rounded-lg text-xs flex items-center justify-center gap-2"
                  >
                    {saveMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saveMutation.isPending ? 'جاري تطبيق الإعدادات...' : 'حفظ الهوية التجارية وتحديث النظام'}
                  </button>
                ) : (
                  <div className="p-3 bg-rose-500/5 border border-rose-500/20 text-rose-400 rounded-lg flex items-center gap-2 mt-4">
                    <Shield className="w-4 h-4" />
                    <span>للعرض فقط. أنت لا تملك صلاحية `manage_cms` لتعديل إعدادات المظهر والهوية.</span>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 space-y-4">
            <h2 className="text-xs font-bold text-luxury-dark-400 uppercase tracking-wider">
              معاينة حية للمظهر الجديد
            </h2>

            <div className="p-4 rounded-xl border border-luxury-dark-900 bg-luxury-dark-950 space-y-4">
              {/* Header preview */}
              <div className="border-b border-luxury-dark-800 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-luxury-gold-500 block">معاينة الهيدر</span>
                  <span className="text-xs font-bold text-luxury-dark-50">{companyName || 'اسم الشركة'}</span>
                </div>
                <span className="text-[9px] text-luxury-dark-400 font-mono">12:00 م</span>
              </div>

              {/* Body Preview */}
              <div className="space-y-1 py-1">
                <span className="text-[9px] text-luxury-dark-400 block">عنوان الصفحة النشطة:</span>
                <span className="text-xs text-luxury-dark-100 font-semibold block">{siteTitle || 'عنوان الموقع'}</span>
                <p className="text-[10px] text-luxury-dark-400 leading-relaxed mt-1">
                  {siteDescription || 'الوصف التعريفي للمنصة الإلكترونية.'}
                </p>
              </div>

              {/* Footer Preview */}
              <div className="border-t border-luxury-dark-800 pt-3 text-center">
                <span className="text-[10px] text-luxury-gold-500/80 block">معاينة ذيل الصفحة:</span>
                <p className="text-[9px] text-luxury-dark-400 mt-1">{footerText || 'حقوق النشر والملكية الفكرية.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
