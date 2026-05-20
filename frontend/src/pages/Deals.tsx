import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import {
  DollarSign,
  Briefcase,
  Users,
  Percent,
  Plus,
  Trash2,
  Calendar,
  X,
  TrendingUp,
  Edit2,
  Printer,
  FileText,
  Lock,
  Unlock,
} from 'lucide-react';
import { NumberInput } from '../components/NumberInput';
import { FormattedDate, formatGregorian } from '../components/FormattedDate';

// Intelligent Auto-Distribution Engine
function balanceSplits(
  currentSplits: Array<{ userId: string; name: string; percentage: number; locked: boolean }>,
  changedIndex?: number,
  changedValue?: number
): Array<{ userId: string; name: string; percentage: number; locked: boolean }> {
  if (currentSplits.length === 0) return [];
  if (currentSplits.length === 1) {
    return [{ ...currentSplits[0], percentage: 100, locked: false }];
  }

  const splits = currentSplits.map(s => ({ ...s }));

  if (changedIndex !== undefined && changedValue !== undefined) {
    splits[changedIndex].percentage = changedValue;
  }

  const isFixed = (idx: number) => {
    if (idx === changedIndex) return true;
    return splits[idx].locked;
  };

  const fixedIndices = splits.map((_, idx) => isFixed(idx));
  const numFixed = fixedIndices.filter(Boolean).length;
  const numUnlocked = splits.length - numFixed;

  let fixedSum = 0;
  splits.forEach((s, idx) => {
    if (isFixed(idx)) {
      fixedSum += s.percentage;
    }
  });

  if (fixedSum > 100) {
    if (changedIndex !== undefined && changedValue !== undefined) {
      const otherFixedSum = fixedSum - changedValue;
      const allowedValue = Math.max(0, 100 - otherFixedSum);
      splits[changedIndex].percentage = allowedValue;
      fixedSum = otherFixedSum + allowedValue;
    } else {
      let scale = 100 / fixedSum;
      splits.forEach((s, idx) => {
        if (isFixed(idx)) s.percentage = parseFloat((s.percentage * scale).toFixed(2));
      });
      let newFixedSum = 0;
      let lastFixedIdx = -1;
      splits.forEach((s, idx) => {
        if (isFixed(idx)) {
          newFixedSum += s.percentage;
          lastFixedIdx = idx;
        }
      });
      if (lastFixedIdx !== -1) {
        splits[lastFixedIdx].percentage += (100 - newFixedSum);
      }
      fixedSum = 100;
    }
  }

  const remainingPercent = 100 - fixedSum;

  if (numUnlocked > 0) {
    const baseShare = parseFloat((remainingPercent / numUnlocked).toFixed(2));
    let distributedSum = 0;
    let lastUnlockedIdx = -1;

    splits.forEach((s, idx) => {
      if (!isFixed(idx)) {
        s.percentage = baseShare;
        distributedSum += baseShare;
        lastUnlockedIdx = idx;
      }
    });

    if (lastUnlockedIdx !== -1) {
      const diff = parseFloat((remainingPercent - distributedSum).toFixed(2));
      splits[lastUnlockedIdx].percentage = parseFloat((splits[lastUnlockedIdx].percentage + diff).toFixed(2));
    }
  } else {
    if (fixedSum < 100) {
      const adjustIdx = changedIndex !== undefined ? changedIndex : splits.length - 1;
      splits[adjustIdx].percentage = parseFloat((splits[adjustIdx].percentage + (100 - fixedSum)).toFixed(2));
    }
  }

  return splits.map(s => ({
    ...s,
    percentage: Math.max(0, parseFloat(s.percentage.toFixed(2)))
  }));
}

export const Deals: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser, addToast } = useStore();

  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [soldById, setSoldById] = useState('');
  
  // Splits state: list of partners in the deal
  const [splits, setSplits] = useState<Array<{ userId: string; name: string; percentage: number; locked: boolean }>>([]);

  // Super Admin Edit Deal Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDealId, setEditingDealId] = useState('');
  const [editFinalPrice, setEditFinalPrice] = useState('');
  const [editCommissionAmount, setEditCommissionAmount] = useState('');
  const [editSoldById, setEditSoldById] = useState('');
  const [editSplits, setEditSplits] = useState<Array<{ userId: string; name: string; percentage: number; locked: boolean }>>([]);

  // Contract PDF Generator State
  const [showContractModal, setShowContractModal] = useState(false);
  const [printingDeal, setPrintingDeal] = useState<any>(null);

  // Query: Deals list
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const res = await api.get('/deals');
      return res.data;
    },
  });

  // Query: Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dealsStats'],
    queryFn: async () => {
      const res = await api.get('/deals/stats');
      return res.data;
    },
  });

  // Query: Available/Reserved properties for the select dropdown
  const { data: propertiesData } = useQuery({
    queryKey: ['availablePropertiesForSale'],
    queryFn: async () => {
      const res = await api.get('/properties', { params: { limit: 1000 } });
      return res.data.properties.filter((p: any) => p.status !== 'SOLD');
    },
  });

  // Query: Users (to select partners)
  const { data: users } = useQuery({
    queryKey: ['teamUsers'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const availableProperties = propertiesData || [];

  // Mutation to save the deal
  const sellMutation = useMutation({
    mutationFn: async (dealData: any) => {
      const res = await api.post('/deals', dealData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dealsStats'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      queryClient.invalidateQueries({ queryKey: ['availablePropertiesForSale'] });
      queryClient.invalidateQueries({ queryKey: ['teamUsers'] });
      addToast('تهانينا! تم إغلاق الصفقة بنجاح وتحديث المحفظة وتوليد الإشعارات الذكية.', 'success');
      setShowSellModal(false);
      resetModal();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل إغلاق الصفقة.', 'error');
    },
  });

  // Mutation to update an existing deal (Super Admin override)
  const editMutation = useMutation({
    mutationFn: async ({ id, dealData }: { id: string; dealData: any }) => {
      const res = await api.put(`/deals/${id}`, dealData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dealsStats'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      addToast('تم تعديل بيانات الصفقة بنجاح وتوثيق العملية في سجل الرقابة.', 'success');
      setShowEditModal(false);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل تعديل بيانات الصفقة.', 'error');
    },
  });

  const resetModal = () => {
    setSelectedPropertyId('');
    setFinalPrice('');
    setCommissionAmount('');
    if (currentUser) {
      setSoldById(currentUser.id);
      setSplits([{ userId: currentUser.id, name: currentUser.name, percentage: 100, locked: false }]);
    } else {
      setSoldById('');
      setSplits([]);
    }
  };

  const handleOpenSellModal = () => {
    resetModal();
    setShowSellModal(true);
  };

  const handleFinalPriceChange = (val: string) => {
    setFinalPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setCommissionAmount((num * 0.025).toString());
    } else {
      setCommissionAmount('');
    }
  };

  const handleEditFinalPriceChange = (val: string) => {
    setEditFinalPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setEditCommissionAmount((num * 0.025).toString());
    } else {
      setEditCommissionAmount('');
    }
  };

  const handleAddPartner = () => {
    if (!users || users.length === 0) return;
    const availableUser = users.find((u: any) => !splits.some((s) => s.userId === u.id));
    if (!availableUser) {
      addToast('تمت إضافة جميع أعضاء الفريق بالفعل.', 'warning');
      return;
    }
    const newSplits = [...splits, { userId: availableUser.id, name: availableUser.name, percentage: 0, locked: false }];
    setSplits(balanceSplits(newSplits));
  };

  const handleAddEditPartner = () => {
    if (!users || users.length === 0) return;
    const availableUser = users.find((u: any) => !editSplits.some((s) => s.userId === u.id));
    if (!availableUser) {
      addToast('تمت إضافة جميع أعضاء الفريق بالفعل.', 'warning');
      return;
    }
    const newSplits = [...editSplits, { userId: availableUser.id, name: availableUser.name, percentage: 0, locked: false }];
    setEditSplits(balanceSplits(newSplits));
  };

  const handleRemovePartner = (idx: number) => {
    const newSplits = splits.filter((_, i) => i !== idx);
    setSplits(balanceSplits(newSplits));
  };

  const handleRemoveEditPartner = (idx: number) => {
    const newSplits = editSplits.filter((_, i) => i !== idx);
    setEditSplits(balanceSplits(newSplits));
  };

  const handlePartnerChange = (idx: number, field: string, value: any) => {
    const newSplits = [...splits];
    if (field === 'userId') {
      const selectedUser = users.find((u: any) => u.id === value);
      if (selectedUser) {
        newSplits[idx].userId = selectedUser.id;
        newSplits[idx].name = selectedUser.name;
      }
      setSplits(newSplits);
    } else if (field === 'percentage') {
      const val = parseFloat(value) || 0;
      setSplits(balanceSplits(newSplits, idx, val));
    } else if (field === 'locked') {
      newSplits[idx].locked = value;
      setSplits(balanceSplits(newSplits));
    }
  };

  const handleEditPartnerChange = (idx: number, field: string, value: any) => {
    const newSplits = [...editSplits];
    if (field === 'userId') {
      const selectedUser = users.find((u: any) => u.id === value);
      if (selectedUser) {
        newSplits[idx].userId = selectedUser.id;
        newSplits[idx].name = selectedUser.name;
      }
      setEditSplits(newSplits);
    } else if (field === 'percentage') {
      const val = parseFloat(value) || 0;
      setEditSplits(balanceSplits(newSplits, idx, val));
    } else if (field === 'locked') {
      newSplits[idx].locked = value;
      setEditSplits(balanceSplits(newSplits));
    }
  };

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId || !finalPrice || !commissionAmount) {
      addToast('يرجى تحديد العقار والسعر والعمولة.', 'warning');
      return;
    }

    sellMutation.mutate({
      propertyId: selectedPropertyId,
      finalPrice,
      commissionAmount,
      soldById,
      partnerSplits: splits,
    });
  };

  const handleOpenEditModal = (deal: any) => {
    let dealSplits: any[] = [];
    try {
      dealSplits = typeof deal.partnerSplits === 'string' ? JSON.parse(deal.partnerSplits) : deal.partnerSplits;
    } catch (e) {
      dealSplits = [];
    }

    const normalizedSplits = dealSplits.map((s: any) => ({
      userId: s.userId,
      name: s.name,
      percentage: s.percentage,
      locked: !!s.locked,
    }));

    setEditingDealId(deal.id);
    setEditFinalPrice(deal.finalPrice.toString());
    setEditCommissionAmount(deal.commissionAmount.toString());
    setEditSoldById(deal.soldById);
    setEditSplits(normalizedSplits);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFinalPrice || !editCommissionAmount) {
      addToast('يرجى تحديد السعر والعمولة.', 'warning');
      return;
    }

    editMutation.mutate({
      id: editingDealId,
      dealData: {
        finalPrice: editFinalPrice,
        commissionAmount: editCommissionAmount,
        soldById: editSoldById,
        partnerSplits: editSplits,
      },
    });
  };

  const handleGenerateContract = (deal: any) => {
    setPrintingDeal(deal);
    setShowContractModal(true);
  };

  const totalPercentageSell = parseFloat(splits.reduce((sum, s) => sum + s.percentage, 0).toFixed(2));
  const isValidSplitSell = splits.length > 0 && Math.abs(totalPercentageSell - 100) < 0.05;

  const totalPercentageEdit = parseFloat(editSplits.reduce((sum, s) => sum + s.percentage, 0).toFixed(2));
  const isValidSplitEdit = editSplits.length > 0 && Math.abs(totalPercentageEdit - 100) < 0.05;

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* CSS print utility override styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50">إدارة المبيعات والعمولات</h1>
          <p className="text-xs text-luxury-dark-400 mt-1">عرض الصفقات المغلقة وتوزيع العمولات بين الشركاء وتوليد العقود.</p>
        </div>
        <button
          onClick={handleOpenSellModal}
          className="flex items-center gap-2 bg-gold-gradient hover:opacity-95 text-luxury-dark-950 px-4 py-2.5 rounded-lg text-xs font-bold shadow-md shadow-luxury-gold-500/5 transition-all"
        >
          <Plus className="w-4 h-4" /> تسجيل صفقة بيع
        </button>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat 1: Total Sales */}
        <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover">
          <div className="space-y-1">
            <span className="text-xs text-luxury-dark-400 block font-medium">إجمالي المبيعات المغلقة</span>
            <span className="text-xl font-bold text-luxury-gold-500 font-mono">
              {(stats?.totalSales || 0).toLocaleString()} <span className="text-xs">ريال</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-luxury-gold-500/10 border border-luxury-gold-500/20 flex items-center justify-center text-luxury-gold-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 2: Deal Count */}
        <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover">
          <div className="space-y-1">
            <span className="text-xs text-luxury-dark-400 block font-medium">عدد الصفقات الإجمالي</span>
            <span className="text-xl font-bold text-blue-400 font-mono">{stats?.dealCount || 0} صفقات</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Stat 3: Total Commission */}
        <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/10 flex items-center justify-between glass-card-hover">
          <div className="space-y-1">
            <span className="text-xs text-luxury-dark-400 block font-medium">إجمالي عمولات الصفقات</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {(stats?.totalCommission || 0).toLocaleString()} <span className="text-xs">ريال</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Deals Table */}
      <div className="glass-card rounded-2xl border border-luxury-dark-800 overflow-hidden">
        {dealsLoading || statsLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : !deals || deals.length === 0 ? (
          <div className="p-16 text-center text-luxury-dark-400 space-y-2">
            <Briefcase className="w-10 h-10 text-luxury-gold-500/50 mx-auto" />
            <p className="text-sm font-semibold">لم يتم تسجيل أي صفقات مبيعات في النظام حالياً.</p>
            <p className="text-xs">اضغط على زر "تسجيل صفقة بيع" بالنفاد من العقارات المتاحة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-luxury-dark-800 bg-luxury-dark-900/40 text-luxury-dark-300 text-xs font-semibold">
                  <th className="p-4">العقار المباع</th>
                  <th className="p-4">المنفذ</th>
                  <th className="p-4">السعر النهائي</th>
                  <th className="p-4">العمولة الكلية</th>
                  <th className="p-4">توزيع الشركاء والنسب</th>
                  <th className="p-4">تاريخ البيع</th>
                  <th className="p-4 text-center">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-dark-800/40 text-xs">
                {deals.map((deal: any) => {
                  let dealSplits: any[] = [];
                  try {
                    dealSplits = typeof deal.partnerSplits === 'string' ? JSON.parse(deal.partnerSplits) : deal.partnerSplits;
                  } catch (e) {
                    console.error('Failed to parse split data');
                  }

                  return (
                    <tr key={deal.id} className="hover:bg-luxury-dark-900/30 transition-colors">
                      <td className="p-4 font-semibold text-luxury-dark-100 font-sans">
                        {deal.property?.nameAr || 'عقار محذوف'}
                      </td>
                      <td className="p-4 text-luxury-dark-200">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-luxury-gold-500/60" /> {deal.soldBy?.name || 'مستخدم النظام'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-luxury-dark-100 font-mono">
                        {deal.finalPrice.toLocaleString()} ر.س
                      </td>
                      <td className="p-4 font-bold text-emerald-400 font-mono">
                        {deal.commissionAmount.toLocaleString()} ر.س
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {dealSplits.map((split: any, sIdx: number) => {
                            const cashValue = (split.percentage / 100) * deal.commissionAmount;
                            return (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 text-[10px] bg-luxury-dark-900 border border-luxury-dark-800 text-luxury-dark-300 px-2.5 py-1 rounded-lg font-sans"
                              >
                                {split.name}:{' '}
                                <span className="font-bold text-luxury-gold-500">{split.percentage}%</span>{' '}
                                <span className="text-emerald-400 font-mono">({cashValue.toLocaleString()} ر.س)</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-luxury-dark-400 font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <FormattedDate date={deal.soldAt} />
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex gap-1.5 justify-center">
                          {/* Print / PDF Contract */}
                          <button
                            onClick={() => handleGenerateContract(deal)}
                            className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-arbaa-cyan-400 hover:border-arbaa-cyan-400/20 bg-luxury-dark-900/40 transition-colors"
                            title="توليد وتصدير عقد PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit deal (Super Admin only) */}
                          {currentUser?.roleName === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleOpenEditModal(deal)}
                              className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-gold-500 hover:border-luxury-gold-500/20 bg-luxury-dark-900/40 transition-colors"
                              title="تعديل تفاصيل الصفقة"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sell Property Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative slide-up my-8">
            <button
              onClick={() => setShowSellModal(false)}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">تسجيل صفقة بيع وإغلاق عقد</h2>

            <form onSubmit={handleSellSubmit} className="space-y-5">
              {/* Select property */}
              <div className="flex flex-col gap-1.5">
                <label>اختر العقار المباع *</label>
                <select
                  required
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full"
                >
                  <option value="">-- اختر من العقارات المتاحة --</option>
                  {availableProperties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} - حي {p.neighborhood} ({p.price.toLocaleString()} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              {/* Final price & custom commission override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label>السعر النهائي المتفق عليه *</label>
                  <NumberInput
                    required
                    placeholder="مثال: 3450000"
                    value={finalPrice}
                    onChange={handleFinalPriceChange}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>عمولة الصفقة للشركة (قابلة للتعديل) *</label>
                  <NumberInput
                    required
                    value={commissionAmount}
                    onChange={setCommissionAmount}
                    className="font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* Custom SoldBy selection */}
              <div className="flex flex-col gap-1.5">
                <label>المنفذ الرئيسي للصفقة *</label>
                <select
                  required
                  value={soldById}
                  onChange={(e) => setSoldById(e.target.value)}
                  className="w-full"
                >
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.description || u.role?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Splits sections */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-luxury-dark-800 pb-2">
                  <span className="text-xs text-luxury-gold-500 font-bold flex items-center gap-1">
                    <Percent className="w-4 h-4" /> شركاء الصفقة وتوزيع النسب *
                  </span>
                  <button
                    type="button"
                    onClick={handleAddPartner}
                    className="flex items-center gap-1 text-[10px] font-bold text-luxury-gold-500 hover:text-luxury-gold-400 bg-luxury-gold-500/5 border border-luxury-gold-500/10 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة شريك
                  </button>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {splits.map((split, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Select partner */}
                      <select
                        value={split.userId}
                        onChange={(e) => handlePartnerChange(idx, 'userId', e.target.value)}
                        className="flex-1 text-xs py-1.5"
                      >
                        {users?.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>

                      {/* Percentage */}
                      <div className="relative w-24">
                        <NumberInput
                          placeholder="النسبة"
                          required
                          value={split.percentage === 0 ? '0' : split.percentage || ''}
                          onChange={(val) => handlePartnerChange(idx, 'percentage', val)}
                          className="w-full text-xs py-1.5 pl-6 text-left font-mono"
                          min={0}
                          max={100}
                          step={0.01}
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-luxury-dark-400 font-mono">%</span>
                      </div>

                      {/* Lock Button */}
                      <button
                        type="button"
                        onClick={() => handlePartnerChange(idx, 'locked', !split.locked)}
                        className={`p-2 rounded-lg border transition-all shrink-0 ${
                          split.locked
                            ? 'bg-luxury-gold-500/10 border-luxury-gold-500/20 text-luxury-gold-500'
                            : 'bg-luxury-dark-900/40 border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-dark-200'
                        }`}
                        title={split.locked ? 'إلغاء قفل النسبة' : 'قفل النسبة الحالية'}
                      >
                        {split.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Computed Cash split */}
                      <div className="w-24 text-left font-mono text-emerald-400 text-xs font-semibold truncate">
                        {((split.percentage / 100) * (parseFloat(commissionAmount) || 0)).toLocaleString()} ر.س
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePartner(idx)}
                        disabled={splits.length <= 1}
                        className="p-2 rounded-lg border border-luxury-dark-800 hover:border-rose-500/20 text-luxury-dark-400 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Validation Info */}
                <div className="flex justify-between items-center text-[10px] pt-1.5">
                  <span className="text-luxury-dark-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    نظام الموازنة التلقائي نشط (Auto-balancing)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-luxury-dark-400">الإجمالي:</span>
                    <span className="font-bold font-mono px-2 py-0.5 rounded border bg-emerald-500/5 text-emerald-400 border-emerald-500/10">
                      {totalPercentageSell}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-luxury-dark-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sellMutation.isPending || !isValidSplitSell}
                  className={`font-bold px-6 py-2.5 rounded-lg text-xs transition-all ${
                    isValidSplitSell
                      ? 'bg-gold-gradient text-luxury-dark-950 hover:opacity-95'
                      : 'bg-luxury-dark-800 text-luxury-dark-500 cursor-not-allowed border border-luxury-dark-700'
                  }`}
                >
                  {sellMutation.isPending ? 'جاري تسجيل العقد...' : 'إغلاق الصفقة وتأكيد التوزيع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deal Modal (Super Admin absolute control) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative slide-up my-8">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">تعديل تفاصيل الصفقة (Super Admin Control)</h2>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Final price & custom commission override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label>السعر النهائي *</label>
                  <NumberInput
                    required
                    value={editFinalPrice}
                    onChange={handleEditFinalPriceChange}
                    className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>عمولة الصفقة للشركة *</label>
                  <NumberInput
                    required
                    value={editCommissionAmount}
                    onChange={setEditCommissionAmount}
                    className="font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>

              {/* Custom SoldBy selection */}
              <div className="flex flex-col gap-1.5">
                <label>المنفذ الرئيسي للصفقة *</label>
                <select
                  required
                  value={editSoldById}
                  onChange={(e) => setEditSoldById(e.target.value)}
                  className="w-full"
                >
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.description || u.role?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Splits sections */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-luxury-dark-800 pb-2">
                  <span className="text-xs text-luxury-gold-500 font-bold flex items-center gap-1">
                    <Percent className="w-4 h-4" /> تعديل نسب التوزيع والعمولات *
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEditPartner}
                    className="flex items-center gap-1 text-[10px] font-bold text-luxury-gold-500 hover:text-luxury-gold-400 bg-luxury-gold-500/5 border border-luxury-gold-500/10 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة شريك
                  </button>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {editSplits.map((split, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Select partner */}
                      <select
                        value={split.userId}
                        onChange={(e) => handleEditPartnerChange(idx, 'userId', e.target.value)}
                        className="flex-1 text-xs py-1.5"
                      >
                        {users?.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>

                      {/* Percentage */}
                      <div className="relative w-24">
                        <NumberInput
                          placeholder="النسبة"
                          required
                          value={split.percentage === 0 ? '0' : split.percentage || ''}
                          onChange={(val) => handleEditPartnerChange(idx, 'percentage', val)}
                          className="w-full text-xs py-1.5 pl-6 text-left font-mono"
                          min={0}
                          max={100}
                          step={0.01}
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-luxury-dark-400 font-mono">%</span>
                      </div>

                      {/* Lock Button */}
                      <button
                        type="button"
                        onClick={() => handleEditPartnerChange(idx, 'locked', !split.locked)}
                        className={`p-2 rounded-lg border transition-all shrink-0 ${
                          split.locked
                            ? 'bg-luxury-gold-500/10 border-luxury-gold-500/20 text-luxury-gold-500'
                            : 'bg-luxury-dark-900/40 border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-dark-200'
                        }`}
                        title={split.locked ? 'إلغاء قفل النسبة' : 'قفل النسبة الحالية'}
                      >
                        {split.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Computed Cash split */}
                      <div className="w-24 text-left font-mono text-emerald-400 text-xs font-semibold truncate">
                        {((split.percentage / 100) * (parseFloat(editCommissionAmount) || 0)).toLocaleString()} ر.س
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditPartner(idx)}
                        disabled={editSplits.length <= 1}
                        className="p-2 rounded-lg border border-luxury-dark-800 hover:border-rose-500/20 text-luxury-dark-400 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Validation Info */}
                <div className="flex justify-between items-center text-[10px] pt-1.5">
                  <span className="text-luxury-dark-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    نظام الموازنة التلقائي نشط (Auto-balancing)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-luxury-dark-400">الإجمالي:</span>
                    <span className="font-bold font-mono px-2 py-0.5 rounded border bg-emerald-500/5 text-emerald-400 border-emerald-500/10">
                      {totalPercentageEdit}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-luxury-dark-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending || !isValidSplitEdit}
                  className={`font-bold px-6 py-2.5 rounded-lg text-xs transition-all ${
                    isValidSplitEdit
                      ? 'bg-gold-gradient text-luxury-dark-950 hover:opacity-95'
                      : 'bg-luxury-dark-800 text-luxury-dark-500 cursor-not-allowed border border-luxury-dark-700'
                  }`}
                >
                  {editMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات وعمل رصد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract print Modal */}
      {showContractModal && printingDeal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:absolute print:bg-white print:text-black print:inset-0 print:p-0 print:z-[9999]">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-4xl p-8 shadow-2xl relative slide-up my-8 print:w-full print:max-w-none print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
            {/* Close & Print Buttons inside CRM (hidden during printing) */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-luxury-dark-800 print:hidden">
              <h2 className="text-lg font-bold text-gold-gradient flex items-center gap-2">
                <FileText className="w-5 h-5" /> معاينة وتوليد عقد الصفقة العقارية
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-gold-gradient text-luxury-dark-950 px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" /> طباعة أو حفظ PDF
                </button>
                <button
                  onClick={() => {
                    setShowContractModal(false);
                    setPrintingDeal(null);
                  }}
                  className="p-2 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The actual legal contract content styled for printing */}
            <div id="print-area" className="bg-white text-luxury-dark-950 p-10 border border-luxury-dark-200 rounded-xl space-y-8 font-sans leading-relaxed text-right print:border-none print:p-0">
              {/* Logo / Header */}
              <div className="flex justify-between items-center border-b-2 border-luxury-dark-950 pb-6">
                <div className="text-right">
                  <h1 className="text-2xl font-black tracking-tight text-luxury-dark-950">شركة أربعة للتسويق العقاري</h1>
                  <span className="text-[10px] font-bold text-luxury-dark-600 block mt-1">ترخيص الهيئة العامة للعقار بالمملكة العربية السعودية</span>
                </div>
                <div className="w-14 h-14 rounded-xl border-2 border-luxury-dark-950 flex items-center justify-center font-black text-xl bg-luxury-dark-950 text-white font-serif">
                  ٤
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-4 space-y-1">
                <h2 className="text-lg font-extrabold underline decoration-2">عقد تسويق وإغلاق صفقة عقارية</h2>
                <span className="text-xs text-luxury-dark-600 font-mono">رقم الصفقة: {printingDeal.id.slice(0, 8).toUpperCase()} | تاريخ العقد: <FormattedDate date={printingDeal.soldAt} noTooltip /></span>
              </div>

              {/* Introduction */}
              <p className="text-sm text-justify">
                إنه في يوم {formatGregorian(printingDeal.soldAt, { weekday: 'long' })} الموافق <FormattedDate date={printingDeal.soldAt} noTooltip />، تم تحرير هذا العقد بالتراضي والاتفاق التام بين الأطراف أدناه بشأن إغلاق الصفقة العقارية وتسجيل استحقاقات العمولات والشركاء تحت مظلة <strong>شركة أربعة للتسويق العقاري</strong>.
              </p>

              {/* Section 1: Property Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold border-r-4 border-luxury-dark-950 pr-2">أولاً: بيانات العقار المباع</h3>
                <table className="w-full text-xs text-right border-collapse border border-luxury-dark-300">
                  <tbody>
                    <tr className="border-b border-luxury-dark-300">
                      <td className="p-2.5 font-bold bg-luxury-dark-50 w-32 border-l border-luxury-dark-300">اسم العقار:</td>
                      <td className="p-2.5">{printingDeal.property?.nameAr || 'عقار مسجل'}</td>
                      <td className="p-2.5 font-bold bg-luxury-dark-50 w-32 border-l border-r border-luxury-dark-300">نوع العقار:</td>
                      <td className="p-2.5">
                        {printingDeal.property?.type === 'VILLA' ? 'فيلا' : 
                         printingDeal.property?.type === 'LAND' ? 'أرض' : 
                         printingDeal.property?.type === 'APARTMENT' ? 'شقة' : 'مكتب/آخر'}
                      </td>
                    </tr>
                    <tr className="border-b border-luxury-dark-300">
                      <td className="p-2.5 font-bold bg-luxury-dark-50 border-l border-luxury-dark-300">حي العقار:</td>
                      <td className="p-2.5">حي {printingDeal.property?.neighborhood || 'غير محدد'}</td>
                      <td className="p-2.5 font-bold bg-luxury-dark-50 border-l border-r border-luxury-dark-300">رقم الصك:</td>
                      <td className="p-2.5 font-mono">{printingDeal.property?.deedNumber || 'غير متوفر'}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold bg-luxury-dark-50 border-l border-luxury-dark-300">المساحة الإجمالية:</td>
                      <td className="p-2.5 font-mono">{printingDeal.property?.area || 'غير محدد'} م²</td>
                      <td className="p-2.5 font-bold bg-luxury-dark-50 border-l border-r border-luxury-dark-300">المالك الأصلي:</td>
                      <td className="p-2.5">{printingDeal.property?.ownerName || 'مسجل بالنظام'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Financials & Commission */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold border-r-4 border-luxury-dark-950 pr-2">ثانياً: القيمة المالية ونسبة السعي والعمولة</h3>
                <p className="text-xs">
                  تم بيع العقار المذكور أعلاه بقيمة نهائية متفق عليها وقدرها <strong>{printingDeal.finalPrice.toLocaleString()} ريال سعودي</strong> (فقط {printingDeal.finalPrice.toLocaleString()} ر.س)، واستحقاق سعي وعمولة الشركة الإجمالي المتفق عليه وقدره <strong>{printingDeal.commissionAmount.toLocaleString()} ريال سعودي</strong>.
                </p>
                <table className="w-full text-xs text-right border-collapse border border-luxury-dark-300">
                  <thead>
                    <tr className="bg-luxury-dark-50 border-b border-luxury-dark-300">
                      <th className="p-2.5 border-l border-luxury-dark-300">الشريك المستفيد</th>
                      <th className="p-2.5 border-l border-luxury-dark-300 text-center">النسبة المئوية</th>
                      <th className="p-2.5 text-left">مبلغ التوزيع المستحق بالريال (SAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-dark-300">
                    {(() => {
                      let splitsArr: any[] = [];
                      try {
                        splitsArr = typeof printingDeal.partnerSplits === 'string' ? JSON.parse(printingDeal.partnerSplits) : printingDeal.partnerSplits;
                      } catch (e) {
                        splitsArr = [];
                      }
                      return splitsArr.map((split: any, idx: number) => {
                        const amount = (split.percentage / 100) * printingDeal.commissionAmount;
                        return (
                          <tr key={idx}>
                            <td className="p-2.5 border-l border-luxury-dark-300">{split.name}</td>
                            <td className="p-2.5 border-l border-luxury-dark-300 text-center font-mono font-bold">{split.percentage}%</td>
                            <td className="p-2.5 text-left font-mono font-bold text-luxury-dark-950">{amount.toLocaleString(undefined, {minimumFractionDigits: 2})} ر.س</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Section 3: Legal Terms */}
              <div className="space-y-2 text-[10px] text-justify text-luxury-dark-700 leading-normal">
                <h3 className="text-xs font-bold text-luxury-dark-950 border-r-4 border-luxury-dark-950 pr-2">ثالثاً: الشروط والالتزامات</h3>
                <p>1. يقر الأطراف بصحة البيانات المدرجة في هذا العقد ومطابقتها للمستندات والصكوك الرسمية الصادرة من وزارة العدل والهيئة العامة للعقار.</p>
                <p>2. يتم صرف المبالغ الموضحة في جدول توزيع الشركاء بعد استلام عمولة السعي كاملة في حسابات الشركة البنكية المعتمدة.</p>
                <p>3. يعتبر هذا المحضر وثيقة داخلية لحفظ حقوق المسوقين والوسطاء ولا يجوز نشره خارج الشركة.</p>
              </div>

              {/* Section 4: Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
                <div className="space-y-8">
                  <span className="font-bold block">توقيع المسوق المنفذ</span>
                  <div className="h-1 bg-luxury-dark-300 w-32 mx-auto" />
                  <span className="text-[10px] text-luxury-dark-600 block">{printingDeal.soldBy?.name}</span>
                </div>
                <div className="space-y-8">
                  <span className="font-bold block">شركة أربعة للتسويق العقاري</span>
                  <div className="w-12 h-12 border border-luxury-dark-300 border-dashed rounded-full mx-auto flex items-center justify-center text-[8px] text-luxury-dark-400 font-serif">
                    ختم الشركة الرسمي
                  </div>
                </div>
                <div className="space-y-8">
                  <span className="font-bold block">اعتماد مدير الإدارة</span>
                  <div className="h-1 bg-luxury-dark-300 w-32 mx-auto" />
                  <span className="text-[10px] text-luxury-dark-600">إدارة العمليات العقارية</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
