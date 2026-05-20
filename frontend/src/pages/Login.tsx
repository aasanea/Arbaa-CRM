import React, { useState } from 'react';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { Shield, Lock, Mail, User as UserIcon, RefreshCw, Key } from 'lucide-react';
import { useTranslation } from '../context/I18nContext';

export const Login: React.FC = () => {
  const { t, locale, setLocale, isRtl } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleName, setRoleName] = useState('SALES_MANAGER');
  
  // Recovery Modal state
  const [showRecover, setShowRecover] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const [loading, setLoading] = useState(false);

  const { login, addToast, settings } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast(t('invalid_login_fields'), 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      
      // Get full user with permissions
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const permissions = meRes.data.user.permissions;

      login(token, user, permissions);
      addToast(locale === 'ar' ? `مرحباً بك مجدداً، ${user.name}!` : `Welcome back, ${user.name}!`, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'حدث خطأ أثناء تسجيل الدخول.';
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      addToast(t('invalid_login_fields'), 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, roleName });
      const { token, user } = res.data;
      
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const permissions = meRes.data.user.permissions;

      login(token, user, permissions);
      addToast(locale === 'ar' ? 'تم إنشاء الحساب بنجاح ومرحباً بك في النظام!' : 'Account created successfully, welcome to the CRM!', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'حدث خطأ في إنشاء الحساب.';
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      addToast(locale === 'ar' ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.', 'error');
      return;
    }
    try {
      const res = await api.post('/auth/recover', { email: recoveryEmail });
      setRecoveryMessage(res.data.message);
      addToast('تمت معالجة الطلب بنجاح.', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'البريد الإلكتروني غير مسجل.';
      addToast(errMsg, 'error');
    }
  };

  const triggerQuickLogin = async (quickEmail: string, quickPass: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: quickEmail, password: quickPass });
      const { token, user } = res.data;
      
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const permissions = meRes.data.user.permissions;

      login(token, user, permissions);
      addToast(`تم الدخول السريع بصفتك: ${user.name}`, 'success');
    } catch (err: any) {
      addToast('فشل الدخول السريع. يرجى التأكد من تشغيل الباك إند.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickAccounts = [
    { labelKey: 'SUPER_ADMIN', email: 'superadmin@arbaa.com', pass: 'admin123', badge: 'SUPER_ADMIN' },
    { labelKey: 'ADMIN', email: 'admin@arbaa.com', pass: 'admin123', badge: 'ADMIN' },
    { labelKey: 'SALES_MANAGER', email: 'sales@arbaa.com', pass: 'sales123', badge: 'SALES_MANAGER' },
    { labelKey: 'MARKETER', email: 'marketer@arbaa.com', pass: 'marketer123', badge: 'MARKETER' },
    { labelKey: 'ANALYST', email: 'analyst@arbaa.com', pass: 'analyst123', badge: 'ANALYST' },
  ];

  return (
    <div className="min-h-screen bg-luxury-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Floating Language Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 rounded-lg border border-luxury-gold-500/10 text-luxury-dark-300 hover:text-luxury-gold-500 bg-luxury-dark-900/60 text-xs font-bold transition-all cursor-pointer font-mono"
        >
          {locale === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>
      {/* Decorative luxury gradient background circles */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-luxury-gold-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-arbaa-cyan-400/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-luxury-gold-500/10 shadow-2xl relative z-10 fade-in">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border border-luxury-gold-500/10 bg-luxury-dark-900 p-2.5 mb-4 shadow-inner">
            <img src="/logo.png" alt="شعار شركة أربعة" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gold-gradient tracking-wide">{settings.companyName}</h1>
          <p className="text-xs text-luxury-dark-400 mt-2">{settings.siteTitle}</p>
        </div>

        {/* Forms Toggle tabs */}
        <div className="flex border-b border-luxury-dark-800 mb-6">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 pb-3 text-center text-sm font-medium border-b-2 transition-all ${
              !isRegister
                ? 'border-luxury-gold-500 text-luxury-gold-500'
                 : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
            }`}
          >
            {t('login_header')}
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 pb-3 text-center text-sm font-medium border-b-2 transition-all ${
              isRegister
                ? 'border-luxury-gold-500 text-luxury-gold-500'
                : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
            }`}
          >
            {t('register')}
          </button>
        </div>

        {/* Forms */}
        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-name" className={isRtl ? 'text-right' : 'text-left'}>{t('full_name')}</label>
              <div className="relative">
                <UserIcon className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-3.5 w-4 h-4 text-luxury-dark-400`} />
                <input
                  id="reg-name"
                  type="text"
                  placeholder={t('enter_name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${isRtl ? 'pr-10' : 'pl-10'}`}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className={isRtl ? 'text-right' : 'text-left'}>{t('email')}</label>
            <div className="relative">
              <Mail className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-3.5 w-4 h-4 text-luxury-dark-400`} />
              <input
                id="login-email"
                type="email"
                placeholder={t('enter_email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${isRtl ? 'pr-10' : 'pl-10'}`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="login-password" className={isRtl ? 'text-right' : 'text-left'}>{t('password')}</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setShowRecover(true);
                    setRecoveryMessage('');
                  }}
                  className="text-xs text-luxury-gold-500 hover:underline cursor-pointer"
                >
                  {t('forgot_password')}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-3.5 w-4 h-4 text-luxury-dark-400`} />
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${isRtl ? 'pr-10' : 'pl-10'}`}
              />
            </div>
          </div>

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-role" className={isRtl ? 'text-right' : 'text-left'}>{t('register_role')}</label>
              <select
                id="reg-role"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full bg-luxury-dark-900 border border-luxury-dark-800"
              >
                <option value="SALES_MANAGER">{t('SALES_MANAGER')}</option>
                <option value="MARKETER">{t('MARKETER')}</option>
                <option value="ANALYST">{t('ANALYST')}</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gold-gradient hover:opacity-95 text-luxury-dark-950 font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-luxury-gold-500/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : isRegister ? (
              t('confirm_register')
            ) : (
              t('secure_login')
            )}
          </button>
        </form>

        {/* Quick Logins Section */}
        <div className="mt-8 pt-6 border-t border-luxury-dark-800">
          <h3 className="text-xs font-semibold text-luxury-dark-400 mb-3 text-center uppercase tracking-wider">
            {t('quick_login')}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {quickAccounts.map((acc, index) => (
              <button
                key={index}
                onClick={() => triggerQuickLogin(acc.email, acc.pass)}
                disabled={loading}
                className={`${isRtl ? 'text-right' : 'text-left'} p-2.5 rounded-lg border border-luxury-dark-800 bg-luxury-dark-900/40 hover:bg-luxury-gold-500/5 hover:border-luxury-gold-500/20 text-xs transition-all flex flex-col gap-0.5 cursor-pointer`}
              >
                <span className="font-semibold text-luxury-dark-100">{t(acc.labelKey)}</span>
                <span className="text-[10px] text-arbaa-cyan-400 font-mono">{acc.badge}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showRecover && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-luxury-dark-900 border border-luxury-gold-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl slide-up" dir={isRtl ? 'rtl' : 'ltr'}>
            <h2 className="text-lg font-bold text-luxury-gold-500 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5" /> {t('recovery_title')}
            </h2>
            <p className="text-xs text-luxury-dark-300 mb-4 leading-relaxed">
              {t('recovery_desc')}
            </p>

            <form onSubmit={handleRecover} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className={isRtl ? 'text-right' : 'text-left'}>{t('email')}</label>
                <input
                  type="email"
                  required
                  placeholder="email@company.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full mt-1"
                />
              </div>

              {recoveryMessage && (
                <div className="p-3 bg-luxury-gold-500/10 border border-luxury-gold-500/20 text-xs text-luxury-gold-300 rounded-lg leading-relaxed">
                  {recoveryMessage}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecover(false)}
                  className="px-4 py-2 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-gold-gradient text-luxury-dark-950 font-semibold px-4 py-2 rounded-lg text-xs cursor-pointer"
                >
                  {t('send_request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
