import { create } from 'zustand';
import { api } from '../utils/api';

interface User {
  id: string;
  name: string;
  email: string;
  roleName: string;
}

interface CMSSettings {
  companyName: string;
  siteTitle: string;
  siteDescription: string;
  footerText: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  permissions: string[];
  activeFeatures: string[];
  login: (token: string, user: User, permissions: string[]) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  fetchActiveFeatures: () => Promise<void>;
  hasFeature: (feature: string) => boolean;

  // CMS Settings
  settings: CMSSettings;
  setSettings: (settings: Partial<CMSSettings>) => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const initialToken = localStorage.getItem('arbaa_token');
const initialUserJson = localStorage.getItem('arbaa_user');
const initialPermissionsJson = localStorage.getItem('arbaa_permissions');

const initialUser = initialUserJson ? JSON.parse(initialUserJson) : null;
const initialPermissions = initialPermissionsJson ? JSON.parse(initialPermissionsJson) : [];

export const useStore = create<AppState>((set, get) => ({
  // Auth Store
  token: initialToken,
  user: initialUser,
  permissions: initialPermissions,
  activeFeatures: [],
  
  login: (token, user, permissions) => {
    localStorage.setItem('arbaa_token', token);
    localStorage.setItem('arbaa_user', JSON.stringify(user));
    localStorage.setItem('arbaa_permissions', JSON.stringify(permissions));
    set({ token, user, permissions });
    get().fetchActiveFeatures();
  },
  
  logout: () => {
    localStorage.removeItem('arbaa_token');
    localStorage.removeItem('arbaa_user');
    localStorage.removeItem('arbaa_permissions');
    set({ token: null, user: null, permissions: [], activeFeatures: [] });
  },

  hasPermission: (permission) => {
    const { user, permissions } = get();
    if (!user) return false;
    if (user.roleName === 'SUPER_ADMIN') return true;
    return permissions.includes(permission);
  },

  fetchActiveFeatures: async () => {
    try {
      const token = get().token;
      if (!token) return;
      const res = await api.get('/features/active');
      set({ activeFeatures: res.data.activeKeys || [] });
    } catch (e) {
      console.error('Failed to fetch active features:', e);
    }
  },

  hasFeature: (feature) => {
    const { activeFeatures } = get();
    return activeFeatures.includes(feature);
  },

  // CMS Settings Store
  settings: {
    companyName: 'شركة أربعة للتسويق العقاري',
    siteTitle: 'بوابة إدارة علاقات العملاء الفاخرة',
    siteDescription: 'النظام الداخلي المتكامل لإدارة العقارات، الصفقات وتوزيع العمولات لشركة أربعة',
    footerText: 'جميع الحقوق محفوظة © ٢٠٢٦ لشركة أربعة للتسويق العقاري',
  },

  setSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  // Toasts
  toasts: [],
  
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
