import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import {
  Plus,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  X,
  MessageSquare,
  Search,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { NumberInput } from '../components/NumberInput';

const STAGES = [
  { id: 'NEW', name: 'جديد', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
  { id: 'CONTACTED', name: 'تم التواصل', color: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5' },
  { id: 'INTERESTED', name: 'مهتم', color: 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5' },
  { id: 'NEGOTIATION', name: 'تفاوض', color: 'border-luxury-gold-500/20 text-luxury-gold-400 bg-luxury-gold-500/5' },
  { id: 'WON', name: 'ناجحة 🎉', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
  { id: 'LOST', name: 'خسارة 🚫', color: 'border-rose-500/20 text-rose-400 bg-rose-500/5' },
];

export const Leads: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, addToast, user: currentUser } = useStore();

  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSource, setNewSource] = useState('SOCIAL_MEDIA');
  const [newStatus, setNewStatus] = useState('NEW');
  const [newNotes, setNewNotes] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('VILLA');
  const [newBudget, setNewBudget] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');

  // Queries
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const res = await api.get('/leads');
      return res.data;
    },
  });

  const { data: users } = useQuery({
    queryKey: ['teamUsers'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (leadData: any) => {
      const res = await api.post('/leads', leadData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast('تمت إضافة العميل الجديد إلى لوحة المتابعة.', 'success');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل إضافة العميل الجديد.', 'error');
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/leads/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast('تم نقل العميل وتحديث مرحلة التفاوض بنجاح.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل نقل العميل.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/leads/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addToast('تم حذف العميل بنجاح من لوحة المتابعة.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل حذف العميل.', 'error');
    },
  });

  const resetForm = () => {
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewSource('SOCIAL_MEDIA');
    setNewStatus('NEW');
    setNewNotes('');
    setNewPropertyType('VILLA');
    setNewBudget('');
    if (currentUser) {
      setNewAssignedTo(currentUser.id);
    } else {
      setNewAssignedTo('');
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      addToast('يرجى ملء الاسم ورقم الهاتف.', 'warning');
      return;
    }
    addMutation.mutate({
      name: newName,
      phone: newPhone,
      email: newEmail || null,
      source: newSource,
      status: newStatus,
      notes: newNotes || null,
      propertyType: newPropertyType,
      budget: newBudget ? parseFloat(newBudget) : null,
      assignedToId: newAssignedTo || null,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleMoveStage = (id: string, currentStatus: string, direction: 'forward' | 'backward') => {
    const currentIndex = STAGES.findIndex((s) => s.id === currentStatus);
    let nextIndex = currentIndex;
    if (direction === 'forward' && currentIndex < STAGES.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === 'backward' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }

    if (nextIndex !== currentIndex) {
      updateStageMutation.mutate({ id, status: STAGES[nextIndex].id });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف العميل "${name}" من النظام نهائياً؟`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filter leads based on queries
  const filteredLeads = (leads || []).filter((lead: any) => {
    const matchSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || 
                        lead.phone.includes(search);
    const matchSource = filterSource ? lead.source === filterSource : true;
    const matchAssigned = filterAssigned ? lead.assignedToId === filterAssigned : true;
    return matchSearch && matchSource && matchAssigned;
  });

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'SOCIAL_MEDIA': return 'وسائل التواصل الاجتماعي';
      case 'WEBSITE': return 'الموقع الإلكتروني';
      case 'DIRECT': return 'زيارة مباشرة';
      case 'REFERRAL': return 'توصية شريك';
      default: return src;
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'VILLA': return 'فيلا';
      case 'APARTMENT': return 'شقة';
      case 'LAND': return 'أرض';
      case 'BUILDING': return 'عمارة';
      case 'OFFICE': return 'مكتب';
      default: return type || 'غير محدد';
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50">إدارة ومتابعة العملاء (Leads)</h1>
          <p className="text-xs text-luxury-dark-400 mt-1">تتبع قنوات التسويق وحالة تفاوض العملاء الجدد عبر لوحة Kanban تفاعلية.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-gold-gradient hover:opacity-95 text-luxury-dark-950 px-4 py-2.5 rounded-lg text-xs font-bold shadow-md shadow-luxury-gold-500/5 transition-all"
        >
          <Plus className="w-4 h-4" /> إضافة عميل محتمل
        </button>
      </div>

      {/* Filter panel */}
      <div className="glass-card rounded-2xl p-4 border border-luxury-dark-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-luxury-dark-400" />
          <input
            type="text"
            placeholder="بحث باسم العميل أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 text-xs py-2.5"
          />
        </div>
        {/* Source */}
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="text-xs py-2"
        >
          <option value="">كل القنوات التسويقية</option>
          <option value="SOCIAL_MEDIA">وسائل التواصل الاجتماعي</option>
          <option value="WEBSITE">الموقع الإلكتروني</option>
          <option value="DIRECT">زيارة مباشرة</option>
          <option value="REFERRAL">توصية شريك</option>
        </select>
        {/* Assigned Representative */}
        <select
          value={filterAssigned}
          onChange={(e) => setFilterAssigned(e.target.value)}
          className="text-xs py-2"
        >
          <option value="">كل الموظفين المسؤولين</option>
          {users?.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l: any) => l.status === stage.id);
          return (
            <div
              key={stage.id}
              className="glass-card border border-luxury-dark-800/80 rounded-2xl p-4 min-w-[240px] flex flex-col h-[70vh] bg-luxury-dark-900/10"
            >
              {/* Stage Title Header */}
              <div className={`border-b pb-3 mb-3 flex items-center justify-between text-xs font-bold rounded-lg px-2.5 py-1.5 ${stage.color} border-current/10`}>
                <span>{stage.name}</span>
                <span className="font-mono bg-luxury-dark-950 text-luxury-dark-200 px-2 py-0.5 rounded text-[10px]">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards wrapper */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {stageLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="bg-luxury-dark-950/60 border border-luxury-dark-800/50 rounded-xl p-3.5 hover:border-luxury-gold-500/20 transition-all flex flex-col justify-between space-y-3 relative group"
                  >
                    <div>
                      {/* Title & Delete */}
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[11px] font-bold text-luxury-dark-50 truncate max-w-[140px]" title={lead.name}>
                          {lead.name}
                        </span>
                        <button
                          onClick={() => handleDelete(lead.id, lead.name)}
                          className="p-1 rounded text-luxury-dark-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Source badge */}
                      <span className="inline-block text-[8px] bg-luxury-dark-900 border border-luxury-dark-800 text-luxury-gold-500 px-1.5 py-0.5 rounded mt-1 font-medium">
                        {getSourceLabel(lead.source)}
                      </span>

                      {/* Contact items */}
                      <div className="space-y-1 mt-2.5">
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1.5 text-[9px] text-luxury-dark-400 hover:text-arbaa-cyan-400"
                        >
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </a>
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-1.5 text-[9px] text-luxury-dark-400 hover:text-arbaa-cyan-400 truncate block"
                            title={lead.email}
                          >
                            <Mail className="w-3 h-3" /> {lead.email}
                          </a>
                        )}
                      </div>

                      {/* Interest & Budget */}
                      <div className="border-t border-luxury-dark-900/60 pt-2 mt-2 space-y-1 text-[9px] text-luxury-dark-300">
                        <div>
                          الاهتمام:{' '}
                          <span className="font-bold text-luxury-dark-100">
                            {getPropertyTypeLabel(lead.propertyType)}
                          </span>
                        </div>
                        {lead.budget && (
                          <div className="flex items-center gap-0.5 text-emerald-400 font-bold font-mono">
                            <DollarSign className="w-2.5 h-2.5" />
                            {lead.budget.toLocaleString()} ر.س
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned User Footer */}
                    <div className="flex items-center justify-between border-t border-luxury-dark-900/60 pt-2.5 text-[9px] text-luxury-dark-400">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-luxury-gold-500" />
                        {lead.assignedTo?.name || 'غير معين'}
                      </span>

                      {/* Moving stage controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveStage(lead.id, lead.status, 'backward')}
                          disabled={stage.id === 'NEW'}
                          className="p-1 rounded bg-luxury-dark-900 border border-luxury-dark-800 disabled:opacity-20 hover:text-luxury-gold-500"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveStage(lead.id, lead.status, 'forward')}
                          disabled={stage.id === 'LOST'}
                          className="p-1 rounded bg-luxury-dark-900 border border-luxury-dark-800 disabled:opacity-20 hover:text-luxury-gold-500"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-luxury-dark-950 border border-luxury-gold-500/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative slide-up">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute left-6 top-6 text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gold-gradient mb-6">إضافة عميل محتمل جديد للشركة</h2>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label>اسم العميل الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فيصل الحربي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label>رقم الهاتف الجوال *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 05xxxxxxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label>البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label>قناة الوصول *</label>
                  <select value={newSource} onChange={(e) => setNewSource(e.target.value)}>
                    <option value="SOCIAL_MEDIA">وسائل التواصل</option>
                    <option value="WEBSITE">الموقع الإلكتروني</option>
                    <option value="DIRECT">زيارة مباشرة</option>
                    <option value="REFERRAL">توصية شريك</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label>مرحلة التفاوض *</label>
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label>العقار المستهدف *</label>
                  <select value={newPropertyType} onChange={(e) => setNewPropertyType(e.target.value)}>
                    <option value="VILLA">فيلا</option>
                    <option value="APARTMENT">شقة</option>
                    <option value="LAND">أرض</option>
                    <option value="BUILDING">عمارة</option>
                    <option value="OFFICE">مكتب</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label>الميزانية القصوى (SAR)</label>
                  <NumberInput
                    placeholder="مثال: 1500000"
                    value={newBudget}
                    onChange={setNewBudget}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label>المسؤول المباشر *</label>
                <select value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)}>
                  <option value="">-- اختر موظف المبيعات --</option>
                  {users?.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label>ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  placeholder="المتطلبات الخاصة بالعميل..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-luxury-dark-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="bg-gold-gradient text-luxury-dark-950 font-bold px-6 py-2.5 rounded-lg text-xs"
                >
                  {addMutation.isPending ? 'جاري الإضافة...' : 'حفظ وإضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Leads;
