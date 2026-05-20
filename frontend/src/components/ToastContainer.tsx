import React from 'react';
import { useStore, type Toast } from '../store/useStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-luxury-gold-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/20 bg-emerald-950/20';
      case 'error':
        return 'border-rose-500/20 bg-rose-950/20';
      case 'warning':
        return 'border-luxury-gold-500/20 bg-luxury-gold-950/10';
      case 'info':
      default:
        return 'border-blue-500/20 bg-blue-950/20';
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full select-none" dir="rtl">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 slide-up ${getBorderColor(
            toast.type
          )}`}
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
          <div className="flex-1 text-sm text-luxury-dark-50 font-medium leading-relaxed">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-luxury-dark-400 hover:text-luxury-dark-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
