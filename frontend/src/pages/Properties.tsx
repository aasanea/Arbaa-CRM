import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { PropertyDetailsDrawer } from './PropertyDetailsDrawer';
import { NumberInput } from '../components/NumberInput';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Info,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  Percent,
  Users,
  Lock,
  Unlock,
} from 'lucide-react';

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

export const Properties: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, addToast, user: currentUser } = useStore();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modals & Drawer State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [viewingPropertyId, setViewingPropertyId] = useState<string | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellPropertyId, setSellPropertyId] = useState('');
  const [sellPropertyNameAr, setSellPropertyNameAr] = useState('');
  const [sellFinalPrice, setSellFinalPrice] = useState('');
  const [sellCommissionAmount, setSellCommissionAmount] = useState('');
  const [sellSoldById, setSellSoldById] = useState('');
  const [sellSplits, setSellSplits] = useState<Array<{ userId: string; name: string; percentage: number; locked: boolean }>>([]);

  // Form inputs state
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formType, setFormType] = useState('VILLA');
  const [formStatus, setFormStatus] = useState('AVAILABLE');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formDeedNumber, setFormDeedNumber] = useState('');
  const [formStreetWidth, setFormStreetWidth] = useState('');
  const [formCoordinates, setFormCoordinates] = useState('24.7136, 46.6753');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerPhone, setFormOwnerPhone] = useState('');
  const [formGoogleMapsUrl, setFormGoogleMapsUrl] = useState('');

  // Fetch properties query
  const { data, isLoading } = useQuery({
    queryKey: ['properties', search, type, status, neighborhood, sortBy, sortOrder, page],
    queryFn: async () => {
      const res = await api.get('/properties', {
        params: {
          search,
          type,
          status,
          neighborhood,
          sortBy,
          sortOrder,
          page,
          limit: 8,
        },
      });
      return res.data;
    },
  });

  const properties = data?.properties || [];
  const metadata = data?.metadata || { totalPages: 1, totalCount: 0, neighborhoods: [] };

  // Query: Users (to select partners)
  const { data: users } = useQuery({
    queryKey: ['teamUsers'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Mutation to save the deal
  const sellMutation = useMutation({
    mutationFn: async (dealData: any) => {
      const res = await api.post('/deals', dealData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      addToast('تهانينا! تم إغلاق الصفقة بنجاح وتحديث المحفظة وتوليد الإشعارات الذكية.', 'success');
      setShowSellModal(false);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل إغلاق الصفقة.', 'error');
    },
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (newProp: any) => {
      const res = await api.post('/properties', newProp);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      addToast('تمت إضافة العقار بنجاح في النظام.', 'success');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل إضافة العقار.', 'error');
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/properties/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      addToast('تم تحديث بيانات العقار بنجاح.', 'success');
      setEditingProperty(null);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل تعديل العقار.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/properties/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      addToast('تم حذف العقار من النظام نهائياً.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل حذف العقار.', 'error');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/properties/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      addToast('تم تحديث حالة العقار.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل تحديث الحالة.', 'error');
    },
  });

  const resetForm = () => {
    setFormNameAr('');
    setFormNameEn('');
    setFormType('VILLA');
    setFormStatus('AVAILABLE');
    setFormNeighborhood('');
    setFormPrice('');
    setFormArea('');
    setFormDeedNumber('');
    setFormStreetWidth('');
    setFormCoordinates('24.7136, 46.6753');
    setFormOwnerName('');
    setFormOwnerPhone('');
    setFormGoogleMapsUrl('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      nameAr: formNameAr,
      nameEn: formNameEn,
      type: formType,
      status: formStatus,
      neighborhood: formNeighborhood,
      price: formPrice,
      area: formArea,
      deedNumber: formDeedNumber,
      streetWidth: formStreetWidth,
      coordinates: formCoordinates,
      ownerName: formOwnerName,
      ownerPhone: formOwnerPhone,
      googleMapsUrl: formGoogleMapsUrl,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    editMutation.mutate({
      id: editingProperty.id,
      data: {
        nameAr: formNameAr,
        nameEn: formNameEn,
        type: formType,
        status: formStatus,
        neighborhood: formNeighborhood,
        price: formPrice,
        area: formArea,
        deedNumber: formDeedNumber,
        streetWidth: formStreetWidth,
        coordinates: formCoordinates,
        ownerName: formOwnerName,
        ownerPhone: formOwnerPhone,
        googleMapsUrl: formGoogleMapsUrl,
      },
    });
  };

  const startEdit = (prop: any) => {
    setEditingProperty(prop);
    setFormNameAr(prop.nameAr);
    setFormNameEn(prop.nameEn);
    setFormType(prop.type);
    setFormStatus(prop.status);
    setFormNeighborhood(prop.neighborhood);
    setFormPrice(prop.price.toString());
    setFormArea(prop.area.toString());
    setFormDeedNumber(prop.deedNumber);
    setFormStreetWidth(prop.streetWidth.toString());
    setFormCoordinates(prop.coordinates);
    setFormOwnerName(prop.ownerName);
    setFormOwnerPhone(prop.ownerPhone);
    setFormGoogleMapsUrl(prop.googleMapsUrl || '');
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/properties/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'properties_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('تم تحميل ملف العقارات بنجاح.', 'success');
    } catch (err) {
      addToast('فشل تصدير ملف CSV.', 'error');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا العقار بشكل نهائي؟')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'SOLD') {
      const prop = properties.find((p: any) => p.id === id);
      if (prop) {
        setSellPropertyId(prop.id);
        setSellPropertyNameAr(prop.nameAr);
        setSellFinalPrice(prop.price.toString());
        setSellCommissionAmount((prop.price * 0.025).toString());
        if (currentUser) {
          setSellSoldById(currentUser.id);
          setSellSplits([{ userId: currentUser.id, name: currentUser.name, percentage: 100, locked: false }]);
        } else {
          setSellSoldById('');
          setSellSplits([]);
        }
        setShowSellModal(true);
      }
    } else {
      statusMutation.mutate({ id, status: newStatus });
    }
  };

  const handleSellFinalPriceChange = (val: string) => {
    setSellFinalPrice(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setSellCommissionAmount((num * 0.025).toString());
    } else {
      setSellCommissionAmount('');
    }
  };

  const handleSellAddPartner = () => {
    if (!users || users.length === 0) return;
    const availableUser = users.find((u: any) => !sellSplits.some((s) => s.userId === u.id));
    if (!availableUser) {
      addToast('تمت إضافة جميع أعضاء الفريق بالفعل.', 'warning');
      return;
    }
    const newSplits = [...sellSplits, { userId: availableUser.id, name: availableUser.name, percentage: 0, locked: false }];
    setSellSplits(balanceSplits(newSplits));
  };

  const handleSellRemovePartner = (idx: number) => {
    const newSplits = sellSplits.filter((_, i) => i !== idx);
    setSellSplits(balanceSplits(newSplits));
  };

  const handleSellPartnerChange = (idx: number, field: string, value: any) => {
    const newSplits = [...sellSplits];
    if (field === 'userId') {
      const selectedUser = users.find((u: any) => u.id === value);
      if (selectedUser) {
        newSplits[idx].userId = selectedUser.id;
        newSplits[idx].name = selectedUser.name;
      }
      setSellSplits(newSplits);
    } else if (field === 'percentage') {
      const val = parseFloat(value) || 0;
      setSellSplits(balanceSplits(newSplits, idx, val));
    } else if (field === 'locked') {
      newSplits[idx].locked = value;
      setSellSplits(balanceSplits(newSplits));
    }
  };

  const totalPercentageSell = parseFloat(sellSplits.reduce((sum, s) => sum + s.percentage, 0).toFixed(2));
  const isValidSplitSell = sellSplits.length > 0 && Math.abs(totalPercentageSell - 100) < 0.05;

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellPropertyId || !sellFinalPrice || !sellCommissionAmount) {
      addToast('يرجى تحديد العقار والسعر والعمولة.', 'warning');
      return;
    }

    sellMutation.mutate({
      propertyId: sellPropertyId,
      finalPrice: parseFloat(sellFinalPrice),
      commissionAmount: parseFloat(sellCommissionAmount),
      soldById: sellSoldById,
      partnerSplits: sellSplits,
    });
  };

  const handleCloseSellModal = () => {
    setShowSellModal(false);
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-arbaa-cyan-400/10 text-arbaa-cyan-400 border-arbaa-cyan-400/20';
      case 'RESERVED':
        return 'bg-luxury-gold-500/10 text-luxury-gold-400 border-luxury-gold-500/20';
      case 'SOLD':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-luxury-dark-800 text-luxury-dark-400 border-luxury-dark-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'متاح';
      case 'RESERVED':
        return 'محجوز';
      case 'SOLD':
        return 'مباع';
      default:
        return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'VILLA':
        return 'فيلا';
      case 'APARTMENT':
        return 'شقة';
      case 'LAND':
        return 'أرض';
      case 'BUILDING':
        return 'عمارة';
      case 'OFFICE':
        return 'مكتب';
      default:
        return type;
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50">إدارة العقارات والطلبات</h1>
          <p className="text-xs text-luxury-dark-400 mt-1">إضافة، فلترة وتصدير قائمة العقارات بالمحفظة.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-luxury-dark-800 bg-luxury-dark-900/60 text-xs font-semibold hover:border-luxury-gold-500/20 transition-all text-luxury-dark-200"
          >
            <Download className="w-4 h-4 text-luxury-gold-500" /> تصدير CSV
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-gold-gradient hover:opacity-95 text-luxury-dark-950 px-4 py-2.5 rounded-lg text-xs font-bold shadow-md shadow-luxury-gold-500/5 transition-all"
          >
            <Plus className="w-4 h-4" /> إضافة عقار جديد
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="glass-card rounded-2xl p-4 border border-luxury-dark-800 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-luxury-dark-400" />
          <input
            type="text"
            placeholder="بحث باسم العقار، الصك أو المالك..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pr-10"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:w-[60%]">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 bg-luxury-dark-900 border-luxury-dark-800"
          >
            <option value="">كل الأنواع</option>
            <option value="VILLA">فيلا</option>
            <option value="APARTMENT">شقة</option>
            <option value="LAND">أرض سكنية</option>
            <option value="BUILDING">عمارة</option>
            <option value="OFFICE">مكتب تجاري</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 bg-luxury-dark-900 border-luxury-dark-800"
          >
            <option value="">كل الحالات</option>
            <option value="AVAILABLE">متاح</option>
            <option value="RESERVED">محجوز</option>
            <option value="SOLD">مباع</option>
          </select>

          <select
            value={neighborhood}
            onChange={(e) => {
              setNeighborhood(e.target.value);
              setPage(1);
            }}
            className="text-xs py-2 bg-luxury-dark-900 border-luxury-dark-800 col-span-2 sm:col-span-1"
          >
            <option value="">كل الأحياء</option>
            {metadata.neighborhoods?.map((nh: string) => (
              <option key={nh} value={nh}>
                {nh}
              </option>
            ))}
          </select>
        </div>

        {/* Sorting Dropdowns */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-luxury-dark-900 border-luxury-dark-800"
          >
            <option value="createdAt">تاريخ الإدراج</option>
            <option value="price">السعر</option>
            <option value="area">المساحة</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-xs bg-luxury-dark-900 border-luxury-dark-800"
          >
            <option value="desc">تنازلي</option>
            <option value="asc">تصاعدي</option>
          </select>
        </div>
      </div>

      {/* Main Table view */}
      <div className="glass-card rounded-2xl border border-luxury-dark-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="p-16 text-center text-luxury-dark-400 space-y-2">
            <Info className="w-10 h-10 text-luxury-gold-500/50 mx-auto" />
            <p className="text-sm font-semibold">لا توجد عقارات مطابقة لمعايير البحث والفلترة حالياً.</p>
            <p className="text-xs">اضغط على زر إضافة عقار جديد أو عدل معايير البحث.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-luxury-dark-800 bg-luxury-dark-900/40 text-luxury-dark-300 text-xs font-semibold">
                  <th className="p-4">العقار</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">الحي</th>
                  <th className="p-4">المساحة</th>
                  <th className="p-4">السعر المطلوب</th>
                  <th className="p-4">رقم الصك</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-left">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-dark-800/40 text-xs">
                {properties.map((prop: any) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-luxury-dark-900/30 transition-colors cursor-pointer"
                    onClick={() => setViewingPropertyId(prop.id)}
                  >
                    <td className="p-4 font-semibold text-luxury-dark-100">
                      <div className="flex flex-col">
                        <span>{prop.nameAr}</span>
                        <span className="text-[10px] text-luxury-dark-400 font-mono mt-0.5">{prop.nameEn}</span>
                      </div>
                    </td>
                    <td className="p-4 text-luxury-dark-200">{getTypeLabel(prop.type)}</td>
                    <td className="p-4 text-luxury-dark-200">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-luxury-gold-500/60" /> {prop.neighborhood}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-luxury-dark-200">{prop.area} م²</td>
                    <td className="p-4 font-bold text-luxury-gold-500 font-mono">
                      {prop.price.toLocaleString()} ر.س
                    </td>
                    <td className="p-4 font-mono text-luxury-dark-300">{prop.deedNumber}</td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      {/* Inline Status Dropdown (only for manager/admin/super_admin) */}
                      {hasPermission('manage_properties') ? (
                        <select
                          value={prop.status}
                          onChange={(e) => handleStatusChange(prop.id, e.target.value)}
                          className={`text-[11px] font-semibold border rounded-lg py-1 px-2 cursor-pointer focus:ring-0 ${getStatusBadgeClass(
                            prop.status
                          )}`}
                        >
                          <option value="AVAILABLE">متاح</option>
                          <option value="RESERVED">محجوز</option>
                          <option value="SOLD">مباع</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center border rounded-lg px-2.5 py-1 text-[10px] font-semibold ${getStatusBadgeClass(
                          prop.status
                        )}`}>
                          {getStatusLabel(prop.status)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-left" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setViewingPropertyId(prop.id)}
                          className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-luxury-gold-500 hover:border-luxury-gold-500/20 bg-luxury-dark-900/40 transition-colors"
                          title="عرض تفاصيل العقار"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        
                        {hasPermission('manage_properties') && (
                          <button
                            onClick={() => startEdit(prop)}
                            className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-blue-400 hover:border-blue-400/20 bg-luxury-dark-900/40 transition-colors"
                            title="تعديل العقار"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {hasPermission('delete_properties') && (
                          <button
                            onClick={() => handleDelete(prop.id)}
                            className="p-1.5 rounded-lg border border-luxury-dark-800 text-luxury-dark-400 hover:text-rose-500 hover:border-rose-500/20 bg-luxury-dark-900/40 transition-colors"
                            title="حذف العقار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!isLoading && metadata.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-luxury-dark-800/80 bg-luxury-dark-900/10 text-xs">
            <span className="text-luxury-dark-400">
              عرض الصفحة <span className="font-bold text-luxury-dark-200">{metadata.currentPage}</span> من{' '}
              <span className="font-bold text-luxury-dark-200">{metadata.totalPages}</span> صفحات ({metadata.totalCount} عقار مدرج)
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

      {/* Add / Edit Property Modal */}
      {(showAddModal || editingProperty) && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative slide-up my-8">
            <button
              onClick={() => {
                setShowAddModal(false);
                setEditingProperty(null);
              }}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">
              {editingProperty ? `تعديل عقار: ${editingProperty.nameAr}` : 'إضافة عقار جديد للمحفظة'}
            </h2>

            <form onSubmit={editingProperty ? handleEditSubmit : handleAddSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title Ar */}
                <div className="flex flex-col gap-1.5">
                  <label>اسم العقار بالعربية *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: فيلا الياسمين الفخمة"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                  />
                </div>

                {/* Title En */}
                <div className="flex flex-col gap-1.5">
                  <label>اسم العقار بالإنجليزية *</label>
                  <input
                    type="text"
                    required
                    placeholder="Example: Al-Yasmin Luxury Villa"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                  />
                </div>

                {/* Type */}
                <div className="flex flex-col gap-1.5">
                  <label>نوع العقار *</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                    <option value="VILLA">فيلا</option>
                    <option value="APARTMENT">شقة</option>
                    <option value="LAND">أرض</option>
                    <option value="BUILDING">عمارة</option>
                    <option value="OFFICE">مكتب</option>
                  </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label>حالة العقار *</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    <option value="AVAILABLE">متاح</option>
                    <option value="RESERVED">محجوز</option>
                  </select>
                </div>

                {/* Neighborhood */}
                <div className="flex flex-col gap-1.5">
                  <label>حي العقار *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الياسمين، الصحافة"
                    value={formNeighborhood}
                    onChange={(e) => setFormNeighborhood(e.target.value)}
                  />
                </div>

                {/* Deed Number */}
                <div className="flex flex-col gap-1.5">
                  <label>رقم الصك (فريد) *</label>
                  <input
                    type="text"
                    required
                    placeholder="أدخل رقم الصك المكون من 10 أرقام"
                    value={formDeedNumber}
                    onChange={(e) => setFormDeedNumber(e.target.value)}
                  />
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label>السعر المطلوب (ر.س) *</label>
                  <NumberInput
                    required
                    placeholder="مثال: 3500000"
                    value={formPrice}
                    onChange={setFormPrice}
                  />
                </div>

                {/* Area */}
                <div className="flex flex-col gap-1.5">
                  <label>المساحة (متر مربع) *</label>
                  <NumberInput
                    required
                    placeholder="مثال: 450"
                    value={formArea}
                    onChange={setFormArea}
                  />
                </div>

                {/* Street Width */}
                <div className="flex flex-col gap-1.5">
                  <label>عرض الشارع (متر)</label>
                  <NumberInput
                    placeholder="مثال: 20"
                    value={formStreetWidth}
                    onChange={setFormStreetWidth}
                  />
                </div>

                {/* Coordinates */}
                <div className="flex flex-col gap-1.5">
                  <label>الإحداثيات الجغرافية (Latitude, Longitude)</label>
                  <input
                    type="text"
                    placeholder="مثال: 24.8123, 46.6432"
                    value={formCoordinates}
                    onChange={(e) => setFormCoordinates(e.target.value)}
                  />
                </div>

                {/* Owner Name */}
                <div className="flex flex-col gap-1.5">
                  <label>اسم المالك *</label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الكامل لمالك العقار"
                    value={formOwnerName}
                    onChange={(e) => setFormOwnerName(e.target.value)}
                  />
                </div>

                {/* Owner Phone */}
                <div className="flex flex-col gap-1.5">
                  <label>رقم هاتف المالك *</label>
                  <input
                    type="text"
                    required
                    placeholder="05xxxxxxxx"
                    value={formOwnerPhone}
                    onChange={(e) => setFormOwnerPhone(e.target.value)}
                  />
                </div>

                {/* Google Maps Embed iframe URL */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label>رابط خارطة جوجل مابس (Embed URL)</label>
                  <input
                    type="text"
                    placeholder="https://www.google.com/maps/embed?..."
                    value={formGoogleMapsUrl}
                    onChange={(e) => setFormGoogleMapsUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-luxury-dark-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProperty(null);
                  }}
                  className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors border border-transparent"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending || editMutation.isPending}
                  className="bg-gold-gradient text-luxury-dark-950 font-bold px-6 py-2.5 rounded-lg text-xs"
                >
                  {addMutation.isPending || editMutation.isPending ? 'جاري الحفظ...' : 'حفظ العقار في النظام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Property Details Drawer Overlay */}
      {viewingPropertyId && (
        <PropertyDetailsDrawer
          propertyId={viewingPropertyId}
          onClose={() => setViewingPropertyId(null)}
        />
      )}

      {/* Sell Property Modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative slide-up my-8 text-xs text-luxury-dark-200 animate-fadeIn" dir="rtl">
            <button
              onClick={handleCloseSellModal}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">تسجيل صفقة بيع وإغلاق عقد</h2>

            <form onSubmit={handleSellSubmit} className="space-y-5">
              {/* Target Property info (readonly) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-luxury-dark-300 font-semibold">العقار المباع</label>
                <div className="w-full bg-luxury-dark-900/60 border border-luxury-dark-800 rounded-lg p-3 font-semibold text-luxury-dark-100">
                  {sellPropertyNameAr}
                </div>
              </div>

              {/* Final price & custom commission override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-luxury-dark-300 font-semibold">السعر النهائي المتفق عليه *</label>
                  <NumberInput
                    required
                    placeholder="مثال: 3450000"
                    value={sellFinalPrice}
                    onChange={handleSellFinalPriceChange}
                    className="font-mono bg-luxury-dark-900 border border-luxury-dark-800 rounded-lg p-2.5 text-luxury-dark-100 focus:outline-none focus:ring-1 focus:ring-luxury-gold-500/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-luxury-dark-300 font-semibold">عمولة الصفقة للشركة (قابلة للتعديل) *</label>
                  <NumberInput
                    required
                    value={sellCommissionAmount}
                    onChange={setSellCommissionAmount}
                    className="font-mono text-emerald-400 font-bold bg-luxury-dark-900 border border-luxury-dark-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-luxury-gold-500/30"
                  />
                </div>
              </div>

              {/* Custom SoldBy selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-luxury-dark-300 font-semibold">المنفذ الرئيسي للصفقة *</label>
                <select
                  required
                  value={sellSoldById}
                  onChange={(e) => setSellSoldById(e.target.value)}
                  className="w-full bg-luxury-dark-900 border border-luxury-dark-800 rounded-lg p-2.5 text-luxury-dark-100 focus:outline-none focus:ring-1 focus:ring-luxury-gold-500/30"
                >
                  <option value="">-- اختر من فريق المبيعات --</option>
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
                    onClick={handleSellAddPartner}
                    className="flex items-center gap-1 text-[10px] font-bold text-luxury-gold-500 hover:text-luxury-gold-400 bg-luxury-gold-500/5 border border-luxury-gold-500/10 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة شريك
                  </button>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {sellSplits.map((split, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Select partner */}
                      <select
                        value={split.userId}
                        onChange={(e) => handleSellPartnerChange(idx, 'userId', e.target.value)}
                        className="flex-1 text-xs py-1.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-lg p-2 text-luxury-dark-100"
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
                          onChange={(val) => handleSellPartnerChange(idx, 'percentage', val)}
                          className="w-full text-xs py-1.5 pl-6 text-left font-mono bg-luxury-dark-900 border border-luxury-dark-800 rounded-lg p-2 text-luxury-dark-100"
                          min={0}
                          max={100}
                          step={0.01}
                        />
                        <span className="absolute left-2.5 top-2.5 text-[10px] text-luxury-dark-400 font-mono">%</span>
                      </div>

                      {/* Lock Button */}
                      <button
                        type="button"
                        onClick={() => handleSellPartnerChange(idx, 'locked', !split.locked)}
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
                        {((split.percentage / 100) * (parseFloat(sellCommissionAmount) || 0)).toLocaleString()} ر.س
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleSellRemovePartner(idx)}
                        disabled={sellSplits.length <= 1}
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
                  onClick={handleCloseSellModal}
                  className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sellMutation.isPending || !isValidSplitSell}
                  className={`font-bold px-6 py-2.5 rounded-lg text-xs transition-all ${
                    isValidSplitSell
                      ? 'bg-gold-gradient text-luxury-dark-950 hover:brightness-110 shadow-lg shadow-luxury-gold-500/10 cursor-pointer'
                      : 'bg-luxury-dark-800 text-luxury-dark-500 border border-luxury-dark-700 cursor-not-allowed'
                  }`}
                >
                  {sellMutation.isPending ? 'جاري تسجيل الصفقة...' : 'إتمام الصفقة وإغلاق العقد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
