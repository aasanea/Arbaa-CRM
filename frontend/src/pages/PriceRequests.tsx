import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import {
  Check,
  X,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Save,
  User,
  Home,
} from 'lucide-react';

import { NumberInput } from '../components/NumberInput';

export const PriceRequests: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, addToast } = useStore();

  // State to manage inline editing of request newPrice
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editNewPrice, setEditNewPrice] = useState('');

  // Query: Fetch price requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['priceRequests'],
    queryFn: async () => {
      const res = await api.get('/price-requests');
      return res.data;
    },
  });

  // Mutation: Approve request
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/price-requests/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      addToast('تمت الموافقة على الطلب وتحديث سعر العقار.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل الموافقة على الطلب.', 'error');
    },
  });

  // Mutation: Reject request
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/price-requests/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceRequests'] });
      addToast('تم رفض طلب تعديل السعر.', 'warning');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل رفض الطلب.', 'error');
    },
  });

  // Mutation: Direct Admin Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, newPrice }: { id: string; newPrice: number }) => {
      const res = await api.put(`/price-requests/${id}`, { newPrice });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceRequests'] });
      addToast('تم تعديل قيمة الطلب بواسطة المشرف.', 'success');
      setEditingRequestId(null);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل تعديل الطلب.', 'error');
    },
  });

  const handleStartEdit = (req: any) => {
    setEditingRequestId(req.id);
    setEditNewPrice(req.newPrice.toString());
  };

  const handleSaveEdit = (id: string) => {
    const priceNum = parseFloat(editNewPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      addToast('الرجاء إدخال سعر صحيح.', 'warning');
      return;
    }
    updateMutation.mutate({ id, newPrice: priceNum });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg font-semibold text-[10px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> معتمد
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-lg font-semibold text-[10px]">
            <XCircle className="w-3.5 h-3.5" /> مرفوض
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 border border-luxury-gold-500/20 bg-luxury-gold-500/10 text-luxury-gold-400 px-2.5 py-1 rounded-lg font-semibold text-[10px] animate-pulse">
            <Clock className="w-3.5 h-3.5" /> قيد المراجعة
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-luxury-dark-50">طلبات تعديل أسعار العقارات</h1>
        <p className="text-xs text-luxury-dark-400 mt-1">
          مراجعة طلبات خفض أو تعديل الأسعار المقدمة من المسوقين واعتمادها لتغيير سعر المعروض تلقائياً.
        </p>
      </div>

      {/* Requests table */}
      <div className="glass-card rounded-2xl border border-luxury-dark-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="p-16 text-center text-luxury-dark-400 space-y-2">
            <TrendingDown className="w-10 h-10 text-luxury-gold-500/50 mx-auto" />
            <p className="text-sm font-semibold">لا توجد طلبات تعديل أسعار عقارات مسجلة.</p>
            <p className="text-xs">تتم إضافة الطلبات بواسطة المسوقين عند الحاجة لتحديث الأسعار.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-luxury-dark-800 bg-luxury-dark-900/40 text-luxury-dark-300 text-xs font-semibold">
                  <th className="p-4">العقار المطلوب تعديله</th>
                  <th className="p-4">مقدم الطلب</th>
                  <th className="p-4">السعر القديم</th>
                  <th className="p-4">السعر المقترح الجديد</th>
                  <th className="p-4">نسبة التخفيض</th>
                  <th className="p-4">حالة الطلب</th>
                  <th className="p-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-dark-800/40 text-xs">
                {requests.map((req: any) => {
                  const priceDiff = req.oldPrice - req.newPrice;
                  const discountPct = req.oldPrice > 0 ? (priceDiff / req.oldPrice) * 100 : 0;
                  const isEditing = editingRequestId === req.id;

                  return (
                    <tr key={req.id} className="hover:bg-luxury-dark-900/30 transition-colors">
                      <td className="p-4 font-semibold text-luxury-dark-100">
                        <span className="inline-flex items-center gap-1.5">
                          <Home className="w-4 h-4 text-luxury-gold-500/60" /> {req.property?.nameAr || 'عقار محذوف'}
                        </span>
                      </td>
                      <td className="p-4 text-luxury-dark-200">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-luxury-dark-400" /> {req.requestedBy?.name}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-luxury-dark-300">
                        {req.oldPrice.toLocaleString()} ر.س
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <NumberInput
                              value={editNewPrice}
                              onChange={setEditNewPrice}
                              className="w-28 py-1 text-xs font-mono"
                            />
                            <button
                              onClick={() => handleSaveEdit(req.id)}
                              className="p-1 rounded bg-emerald-500 text-luxury-dark-950 font-bold"
                              title="حفظ التعديل"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRequestId(null)}
                              className="p-1 rounded bg-luxury-dark-800 text-luxury-dark-300"
                              title="إلغاء"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-luxury-gold-500 font-mono">
                            {req.newPrice.toLocaleString()} ر.س
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        {discountPct > 0 ? (
                          <span className="text-emerald-400">-{discountPct.toFixed(1)}%</span>
                        ) : discountPct < 0 ? (
                          <span className="text-rose-400">+{Math.abs(discountPct).toFixed(1)}%</span>
                        ) : (
                          <span className="text-luxury-dark-400">0%</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(req.status)}</td>
                      <td className="p-4 text-left">
                        {req.status === 'PENDING' ? (
                          <div className="inline-flex gap-1.5">
                            {/* Approve/Reject Buttons */}
                            {hasPermission('manage_requests') && (
                              <>
                                <button
                                  onClick={() => approveMutation.mutate(req.id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  className="flex items-center gap-1 border border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-luxury-dark-950 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" /> موافقة
                                </button>
                                <button
                                  onClick={() => rejectMutation.mutate(req.id)}
                                  disabled={approveMutation.isPending || rejectMutation.isPending}
                                  className="flex items-center gap-1 border border-rose-500/20 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-luxury-dark-950 text-rose-400 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                >
                                  <X className="w-3.5 h-3.5" /> رفض
                                </button>
                              </>
                            )}

                            {/* Direct Admin Edit Icon */}
                            {hasPermission('manage_requests') && !isEditing && (
                              <button
                                onClick={() => handleStartEdit(req)}
                                className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-gold-500 hover:border-luxury-gold-500/20 bg-luxury-dark-900/40 transition-all"
                                title="تعديل السعر المقترح مباشرة"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-luxury-dark-400">مكتمل</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
