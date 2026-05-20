import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { FormattedDate } from '../components/FormattedDate';
import {
  ShieldAlert,
  Search,
  Download,
  Info,
  Calendar,
  Layers,
  Globe,
  Terminal,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { addToast } = useStore();

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);

  // Selected log for detailed view modal
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Query: Audit logs list
  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', search, severity, page],
    queryFn: async () => {
      const res = await api.get('/audit-logs', {
        params: { search, severity, page, limit: 10 },
      });
      return res.data;
    },
  });

  const logs = data?.logs || [];
  const metadata = data?.metadata || { totalPages: 1, totalCount: 0 };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/audit-logs/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_logs_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('تم تحميل ملف سجل العمليات بنجاح.', 'success');
    } catch (err) {
      addToast('فشل تصدير سجل العمليات.', 'error');
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 border border-rose-500/20 bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded text-[10px] font-semibold">
            حرِج
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 border border-luxury-gold-500/20 bg-luxury-gold-500/10 text-luxury-gold-400 px-2 py-0.5 rounded text-[10px] font-semibold">
            تنبيه
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 border border-blue-500/20 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-semibold">
            معلومات
          </span>
        );
    }
  };

  const formatBrowser = (ua: string) => {
    if (!ua) return 'غير معروف';
    if (ua.includes('Chrome')) return 'Google Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Apple Safari';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Edge')) return 'Microsoft Edge';
    if (ua.includes('Seeder')) return 'نظام التهيئة البذرية';
    return 'متصفح ويب';
  };

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-luxury-gold-500" /> سجل العمليات والرقابة (Audit Logs)
          </h1>
          <p className="text-xs text-luxury-dark-400 mt-1">
            مراقبة وتتبع جميع العمليات المسجلة في قاعدة البيانات لمراجعة نشاط المستخدمين.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-luxury-dark-800 bg-luxury-dark-900/60 text-xs font-semibold hover:border-luxury-gold-500/20 transition-all text-luxury-dark-200"
        >
          <Download className="w-4 h-4 text-luxury-gold-500" /> تصدير السجل CSV
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="glass-card rounded-2xl p-4 border border-luxury-dark-800 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-luxury-dark-400" />
          <input
            type="text"
            placeholder="بحث باسم المستخدم، العملية، أو تفاصيل الحدث..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pr-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-luxury-dark-900 border-luxury-dark-800 w-44"
          >
            <option value="">كل المستويات</option>
            <option value="INFO">معلومات (INFO)</option>
            <option value="WARNING">تنبيهات (WARNING)</option>
            <option value="CRITICAL">حرِج (CRITICAL)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-luxury-dark-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-luxury-dark-400 space-y-2">
            <ShieldAlert className="w-10 h-10 text-luxury-gold-500/50 mx-auto" />
            <p className="text-sm font-semibold">سجل العمليات فارغ تماماً.</p>
            <p className="text-xs">لم تسجل أي عمليات تحت المعايير المحددة حالياً.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-luxury-dark-800 bg-luxury-dark-900/40 text-luxury-dark-300 text-xs font-semibold">
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">العملية</th>
                  <th className="p-4">الكيان المستهدف</th>
                  <th className="p-4">عنوان IP</th>
                  <th className="p-4">المنصة / المتصفح</th>
                  <th className="p-4">المستوى</th>
                  <th className="p-4">التاريخ والوقت</th>
                  <th className="p-4 text-left">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-dark-800/40 text-xs">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-luxury-dark-900/30 transition-colors">
                    <td className="p-4 font-semibold text-luxury-dark-100">
                      {log.userName || (log.user ? log.user.name : 'النظام تلقائي')}
                    </td>
                    <td className="p-4 font-mono text-luxury-gold-500 text-[11px]">{log.action}</td>
                    <td className="p-4 text-luxury-dark-200">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-luxury-dark-400" /> {log.entity}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-luxury-dark-300">{log.ipAddress}</td>
                    <td className="p-4 text-luxury-dark-200">
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-luxury-dark-400" />
                        {formatBrowser(log.userAgent)}
                      </span>
                    </td>
                    <td className="p-4">{getSeverityBadge(log.severity)}</td>
                    <td className="p-4 font-mono text-luxury-dark-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <FormattedDate date={log.createdAt} showTime />
                      </span>
                    </td>
                    <td className="p-4 text-left">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-gold-500 hover:border-luxury-gold-500/20 bg-luxury-dark-900/40 transition-colors"
                        title="عرض كامل معطيات العملية"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && metadata.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-luxury-dark-800 bg-luxury-dark-900/10 text-xs">
            <span className="text-luxury-dark-400">
              عرض الصفحة <span className="font-bold text-luxury-dark-200">{metadata.currentPage}</span> من{' '}
              <span className="font-bold text-luxury-dark-200">{metadata.totalPages}</span> صفحات ({metadata.totalCount} عملية مسجلة)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 rounded-lg border border-luxury-dark-800 hover:border-luxury-gold-500/20 disabled:opacity-30 disabled:pointer-events-none text-luxury-dark-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={page >= metadata.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-lg border border-luxury-dark-800 hover:border-luxury-gold-500/20 disabled:opacity-30 disabled:pointer-events-none text-luxury-dark-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details comparison Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative slide-up flex flex-col max-h-[80vh]">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-gold-gradient mb-1 flex items-center gap-2">
              <Terminal className="w-5 h-5" /> تفاصيل العملية الكاملة
            </h2>
            <p className="text-[10px] text-luxury-dark-400 mb-4 font-mono">
              معرف العملية: {selectedLog.id}
            </p>

            {/* Render Log data */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Event Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs p-3.5 bg-luxury-dark-900/40 border border-luxury-dark-800/80 rounded-xl">
                <div>
                  <span className="text-luxury-dark-400 block mb-0.5">المستخدم:</span>
                  <span className="font-semibold text-luxury-dark-200">
                    {selectedLog.userName || 'النظام'}
                  </span>
                </div>
                <div>
                  <span className="text-luxury-dark-400 block mb-0.5">رمز الحدث:</span>
                  <span className="font-mono font-bold text-luxury-gold-500">
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-luxury-dark-400 block mb-0.5">العنوان الجغرافي (IP):</span>
                  <span className="font-mono text-luxury-dark-200">
                    {selectedLog.ipAddress}
                  </span>
                </div>
                <div>
                  <span className="text-luxury-dark-400 block mb-0.5">التوقيت:</span>
                  <span className="font-mono text-luxury-dark-200">
                    <FormattedDate date={selectedLog.createdAt} showTime />
                  </span>
                </div>
              </div>

              {/* JSON/Comparison Details Viewer */}
              <div className="space-y-1.5 flex flex-col">
                <span className="text-xs text-luxury-dark-300 font-bold">
                  بيانات معطيات العملية (Payload / Changes):
                </span>
                <div className="p-4 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl font-mono text-[11px] overflow-x-auto select-text leading-relaxed text-luxury-dark-100 max-h-[300px]">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedLog.details);
                      
                      // Check if it's an update change log containing Old vs New diff comparisons
                      if (parsed.changes && typeof parsed.changes === 'object') {
                        return (
                          <div className="space-y-3 font-sans">
                            <span className="text-[10px] text-luxury-gold-500 font-semibold block border-b border-luxury-dark-800 pb-1">
                              مقارنة التعديلات (Old Value vs New Value):
                            </span>
                            <div className="space-y-2">
                              {Object.entries(parsed.changes).map(([field, delta]: any, idx) => (
                                <div key={idx} className="flex flex-col gap-1 text-[11px] p-2 bg-luxury-dark-950 rounded border border-luxury-dark-800/60">
                                  <span className="text-luxury-dark-400 font-semibold">{field}:</span>
                                  <div className="flex items-center gap-2 justify-between">
                                    <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-[10px] max-w-[45%] truncate" title={String(delta.old)}>
                                      السابق: {String(delta.old)}
                                    </span>
                                    <span className="text-luxury-dark-400">←</span>
                                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] max-w-[45%] truncate" title={String(delta.new)}>
                                      الجديد: {String(delta.new)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Print general JSON
                      return <pre className="whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>;
                    } catch (e) {
                      // Fallback as plain string
                      return <p className="whitespace-pre-wrap">{selectedLog.details}</p>;
                    }
                  })()}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-luxury-dark-800 mt-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-luxury-dark-800 text-luxury-dark-200 hover:text-luxury-dark-50 text-xs px-5 py-2 rounded-lg font-semibold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
