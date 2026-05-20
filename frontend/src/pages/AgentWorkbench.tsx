import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { useTranslation } from '../context/I18nContext';
import {
  Users, Heart, Phone, CheckSquare, BarChart, Calendar, Mail, Copy, Check, Play,
  FolderOpen, Compass, Search, MapPin, Mic, FileText, Plus, Trash, Eye, Award
} from 'lucide-react';
import { FormattedDate } from '../components/FormattedDate';

export const AgentWorkbench: React.FC = () => {
  const { t, locale, isRtl } = useTranslation();
  const { addToast, user, hasFeature } = useStore();
  const [activeTab, setActiveTab] = useState('clients');

  // Voice Search states
  const [isListening, setIsListening] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');

  // Fetch properties for widgets to interact with
  const { data: propertiesData } = useQuery({
    queryKey: ['workbenchProperties'],
    queryFn: async () => {
      const res = await api.get('/properties', { params: { limit: 100 } });
      return res.data;
    },
  });
  const properties = propertiesData?.properties || [];

  // Local storage lists
  const [wishlists, setWishlists] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_agent_wishlists');
    return val ? JSON.parse(val) : [];
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const val = localStorage.getItem('arbaa_agent_favorites');
    return val ? JSON.parse(val) : [];
  });
  const [tasks, setTasks] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_agent_tasks');
    return val ? JSON.parse(val) : [
      { id: '1', title: 'متابعة مع المستثمر خالد الراجحي', date: '2026-05-22', done: false },
      { id: '2', title: 'تجهيز عرض أسعار فيلا الملقا للاستشاري', date: '2026-05-21', done: true }
    ];
  });
  const [meetings, setMeetings] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_agent_meetings');
    return val ? JSON.parse(val) : [
      { id: '1', title: 'اجتماع توقيع عقد فيلا الياسمين', time: '2026-05-21T10:00:00' },
      { id: '2', title: 'معاينة شقة النرجس مع العميل', time: '2026-05-23T16:30:00' }
    ];
  });
  const [interactions, setInteractions] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_agent_interactions');
    return val ? JSON.parse(val) : [
      { id: '1', type: 'CALL', notes: 'اتصال مع المهندس فهد بخصوص مساحة الشارع', time: '2026-05-20T11:00:00' },
      { id: '2', type: 'MEETING', notes: 'مقابلة في مقر الشركة لشرح تفاصيل عمولة الشركاء', time: '2026-05-19T14:20:00' }
    ];
  });
  const [clientNotes, setClientNotes] = useState<any[]>(() => {
    const val = localStorage.getItem('arbaa_agent_client_notes');
    return val ? JSON.parse(val) : [
      { id: '1', name: 'عبد الله السديري', text: 'يفضل التواصل بعد العصر، يبحث عن مجمع سكني مغلق.' }
    ];
  });

  // Sync to Local Storage
  useEffect(() => {
    localStorage.setItem('arbaa_agent_wishlists', JSON.stringify(wishlists));
  }, [wishlists]);
  useEffect(() => {
    localStorage.setItem('arbaa_agent_favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    localStorage.setItem('arbaa_agent_tasks', JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem('arbaa_agent_meetings', JSON.stringify(meetings));
  }, [meetings]);
  useEffect(() => {
    localStorage.setItem('arbaa_agent_interactions', JSON.stringify(interactions));
  }, [interactions]);
  useEffect(() => {
    localStorage.setItem('arbaa_agent_client_notes', JSON.stringify(clientNotes));
  }, [clientNotes]);

  // Form states
  const [newWish, setNewWish] = useState({ clientName: '', type: 'VILLA', maxPrice: '', minArea: '' });
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingTime, setNewMeetingTime] = useState('');
  const [newInteractType, setNewInteractType] = useState('CALL');
  const [newInteractNotes, setNewInteractNotes] = useState('');
  const [newNoteName, setNewNoteName] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  // Whatsapp template
  const [waPhone, setWaPhone] = useState('');
  const [waText, setWaText] = useState('مرحباً بك، معك شركة أربعة العقارية. نود تزويدك بتفاصيل العقار المطلوب...');
  
  // Compare state
  const [compareId1, setCompareId1] = useState('');
  const [compareId2, setCompareId2] = useState('');

  // Target values
  const monthlyVolumeTarget = 5000000; // 5 Million SAR
  const monthlyVolumeCurrent = 3200000;
  const commissionTarget = 125000; // 125K SAR
  const commissionCurrent = 80000;

  // Voice Search Handler
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addToast(locale === 'ar' ? 'المتصفح لا يدعم البحث الصوتي.' : 'Voice recognition is not supported in this browser.', 'error');
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = locale === 'ar' ? 'ar-SA' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setVoiceQuery(speechToText);
      setIsListening(false);
      addToast(
        locale === 'ar' ? `بحث صوتي عن: "${speechToText}"` : `Voice search query received: "${speechToText}"`,
        'info'
      );
    };

    recognition.onerror = () => {
      setIsListening(false);
      addToast(locale === 'ar' ? 'حدث خطأ في التقاط الصوت.' : 'Voice capture error occurred.', 'error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast(locale === 'ar' ? 'تم نسخ النص إلى الحافظة.' : 'Text copied to clipboard.', 'success');
  };

  // Automated Whatsapp redirection
  const handleWhatsappSend = () => {
    if (!waPhone) {
      addToast(locale === 'ar' ? 'يرجى إدخال رقم الهاتف أولاً.' : 'Please input phone number first.', 'error');
      return;
    }
    const cleanPhone = waPhone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank');
  };

  // Feature Flag checks
  const agentFeatures = [
    { key: 'client_wishlist', labelAr: 'قائمة رغبات العملاء', labelEn: 'Client Wishlist' },
    { key: 'property_favorites', labelAr: 'العقارات المفضلة للمسوق', labelEn: 'Property Favorites' },
    { key: 'whatsapp_integration', labelAr: 'التكامل التلقائي مع واتساب', labelEn: 'Automated WhatsApp' },
    { key: 'task_reminders', labelAr: 'التذكيرات والمهام الداخلية', labelEn: 'In-app Task Reminders' },
    { key: 'performance_tracker', labelAr: 'مؤشر الأداء الشخصي', labelEn: 'Performance Tracker' },
    { key: 'interaction_history', labelAr: 'سجل التفاعل مع العملاء', labelEn: 'Interaction History' },
    { key: 'email_templates', labelAr: 'مكتبة قوالب البريد الإلكتروني', labelEn: 'Email Templates' },
    { key: 'property_comparison', labelAr: 'مقارنة العقارات', labelEn: 'Property Comparison' },
    { key: 'document_vault', labelAr: 'خزنة المستندات والوثائق', labelEn: 'Document Vault' },
    { key: 'meeting_scheduler', labelAr: 'مجدول الاجتماعات', labelEn: 'Meeting Scheduler' },
    { key: 'target_tracking', labelAr: 'تتبع الأهداف المالية', labelEn: 'Target Tracking' },
    { key: 'lead_nurturing', labelAr: 'رعاية وتأهيل العملاء المهتمين', labelEn: 'Lead Nurturing Flow' },
    { key: 'voice_search', labelAr: 'البحث الصوتي السريع', labelEn: 'Quick Voice Search' },
    { key: 'availability_calendar', labelAr: 'تقويم التوفر والحجوزات', labelEn: 'Availability Calendar' },
    { key: 'commission_history', labelAr: 'سجل تفاصيل العمولات', labelEn: 'Commission Breakdown' },
    { key: 'amenities_finder', labelAr: 'مستكشف الخدمات المجاورة', labelEn: 'Nearby Amenities' },
    { key: 'virtual_tour', labelAr: 'مشاهدة الجولات الافتراضية', labelEn: 'Virtual Tour Field' },
    { key: 'profile_notes', labelAr: 'ملاحظات سريعة على العملاء', labelEn: 'Client Profile Notes' },
    { key: 'conversion_funnel', labelAr: 'قمع تحليل معدل التحويل', labelEn: 'Lead Conversion Funnel' },
    { key: 'internal_messaging', labelAr: 'نظام المراسلات الداخلي', labelEn: 'Internal Messaging' }
  ];

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
            <Award className="w-6 h-6 text-luxury-gold-500" />
            {locale === 'ar' ? 'صندوق أدوات المسوق العقاري (Agent Workbench)' : 'Sales Agent Workbench'}
          </h1>
          <p className="text-xs text-luxury-dark-400 mt-1">
            {locale === 'ar'
              ? 'مجموعة متكاملة من 20 أداة وتسهيل تقني لرفع كفاءة عمليات البيع والتسويق لشركة أربعة.'
              : 'Complete set of 20 integrated tools configured to enhance sales productivity and deals flow.'}
          </p>
        </div>

        {/* Voice Search (Feature 13) */}
        {hasFeature('voice_search') && (
          <div className="flex items-center gap-2 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl px-3 py-1.5 w-full md:w-80 justify-between">
            <div className="flex items-center gap-2 text-xs text-luxury-dark-300">
              <Mic className={`w-4 h-4 ${isListening ? 'text-rose-500 animate-pulse' : 'text-luxury-dark-400'}`} />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'ابحث صوتياً عن عقار...' : 'Search properties by voice...'}
                value={voiceQuery}
                onChange={(e) => setVoiceQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-luxury-dark-100 placeholder-luxury-dark-500 w-full"
              />
            </div>
            <button
              onClick={startVoiceSearch}
              className={`p-1.5 rounded-lg border transition-all ${
                isListening
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  : 'bg-luxury-gold-500/10 border-luxury-gold-500/20 text-luxury-gold-500 hover:bg-luxury-gold-500/20'
              }`}
              title="تفعيل الميكروفون للبحث"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-luxury-dark-800 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'clients' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'العملاء والطلبات' : 'Clients & Wishlists'}
        </button>
        <button
          onClick={() => setActiveTab('comms')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'comms' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'الاتصالات والتسويق' : 'Comms & Messaging'}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'tasks' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'التخطيط والمهام' : 'Tasks & Calendar'}
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 shrink-0 ${
            activeTab === 'tools' ? 'border-luxury-gold-500 text-luxury-gold-500' : 'border-transparent text-luxury-dark-400 hover:text-luxury-dark-200'
          }`}
        >
          {locale === 'ar' ? 'أدوات متطورة' : 'Advanced Systems'}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* PANEL 1: CLIENTS & WISHLISTS */}
        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wishlist Matcher (Feature 1) */}
            {hasFeature('client_wishlist') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex justify-between items-center border-b border-luxury-dark-800 pb-2">
                  <h3 className="text-xs font-bold text-luxury-dark-100 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500" />
                    {locale === 'ar' ? 'قائمة رغبات العملاء والمطابقة التلقائية' : 'Client Wishlist Matcher'}
                  </h3>
                  <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                    {wishlists.length} {locale === 'ar' ? 'طلبات نشطة' : 'active wishes'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'اسم العميل' : 'Client name'}
                    value={newWish.clientName}
                    onChange={(e) => setNewWish({ ...newWish, clientName: e.target.value })}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100"
                  />
                  <input
                    type="number"
                    placeholder={locale === 'ar' ? 'الحد الأقصى للسعر (ر.س)' : 'Max Price (SAR)'}
                    value={newWish.maxPrice}
                    onChange={(e) => setNewWish({ ...newWish, maxPrice: e.target.value })}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100"
                  />
                  <select
                    value={newWish.type}
                    onChange={(e) => setNewWish({ ...newWish, type: e.target.value })}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100"
                  >
                    <option value="VILLA">{locale === 'ar' ? 'فيلا' : 'Villa'}</option>
                    <option value="APARTMENT">{locale === 'ar' ? 'شقة' : 'Apartment'}</option>
                    <option value="LAND">{locale === 'ar' ? 'أرض' : 'Land'}</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!newWish.clientName || !newWish.maxPrice) return;
                      setWishlists([...wishlists, { id: Math.random().toString(), ...newWish }]);
                      setNewWish({ clientName: '', type: 'VILLA', maxPrice: '', minArea: '' });
                      addToast(locale === 'ar' ? 'تم إضافة رغبة العميل بنجاح.' : 'Client wishlist preference added.', 'success');
                    }}
                    className="bg-luxury-gold-500 text-luxury-dark-950 hover:bg-luxury-gold-600 font-bold rounded-lg text-xs py-2"
                  >
                    {locale === 'ar' ? 'إضافة طلب' : 'Add Wish'}
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {wishlists.map((w) => {
                    const matches = properties.filter(
                      (p) => p.type === w.type && p.price <= parseFloat(w.maxPrice) && p.status === 'AVAILABLE'
                    );

                    return (
                      <div key={w.id} className="p-3 bg-luxury-dark-900/60 border border-luxury-dark-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-luxury-dark-100">{w.clientName}</span>
                          <button
                            onClick={() => setWishlists(wishlists.filter((x) => x.id !== w.id))}
                            className="text-rose-500 hover:text-rose-400 p-0.5"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-luxury-dark-400">
                          <span>{locale === 'ar' ? 'النوع:' : 'Type:'} {w.type}</span>
                          <span>{locale === 'ar' ? 'الميزانية:' : 'Budget:'} {parseFloat(w.maxPrice).toLocaleString()} ر.س</span>
                        </div>
                        {/* Auto Match (Feature 1 matching output) */}
                        <div className="border-t border-luxury-dark-800/80 pt-1.5">
                          <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                            ✨ {locale === 'ar' ? `تم إيجاد (${matches.length}) عقارات متطابقة:` : `Found (${matches.length}) matching listings:`}
                          </span>
                          {matches.slice(0, 2).map((m) => (
                            <div key={m.id} className="flex justify-between items-center text-[9px] text-luxury-dark-200">
                              <span>{locale === 'ar' ? m.nameAr : m.nameEn}</span>
                              <span className="font-mono text-luxury-gold-500">{m.price.toLocaleString()} ر.س</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Property Favorites (Feature 2) */}
            {hasFeature('property_favorites') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex justify-between items-center border-b border-luxury-dark-800 pb-2">
                  <h3 className="text-xs font-bold text-luxury-dark-100 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    {locale === 'ar' ? 'العقارات المفضلة للمسوق' : 'Property Favorites (Shortlist)'}
                  </h3>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {properties.map((p) => {
                    const isFav = favorites.includes(p.id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-luxury-dark-900/60 border border-luxury-dark-800 rounded-xl">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-luxury-dark-100">
                            {locale === 'ar' ? p.nameAr : p.nameEn}
                          </span>
                          <span className="text-[9px] text-luxury-dark-400 block font-mono">
                            {p.neighborhood} | {p.price.toLocaleString()} ر.س
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (isFav) {
                              setFavorites(favorites.filter((id) => id !== p.id));
                            } else {
                              setFavorites([...favorites, p.id]);
                            }
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isFav ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-luxury-dark-950 border-luxury-dark-850 text-luxury-dark-400 hover:text-luxury-dark-200'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client Profile Notes (Feature 18) */}
            {hasFeature('profile_notes') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4 lg:col-span-2">
                <div className="flex justify-between items-center border-b border-luxury-dark-800 pb-2">
                  <h3 className="text-xs font-bold text-luxury-dark-100 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-luxury-gold-500" />
                    {locale === 'ar' ? 'ملاحظات سريعة على ملفات العملاء' : 'Client Profile Sticky Notes'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 bg-luxury-dark-950/60 border border-luxury-dark-800 p-4 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-luxury-dark-200 block">
                      {locale === 'ar' ? 'إضافة ملاحظة جديدة' : 'Add New Note'}
                    </span>
                    <input
                      type="text"
                      placeholder={locale === 'ar' ? 'اسم العميل' : 'Client Name'}
                      value={newNoteName}
                      onChange={(e) => setNewNoteName(e.target.value)}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                    />
                    <textarea
                      placeholder={locale === 'ar' ? 'الملاحظات المهمة...' : 'Note text...'}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={3}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                    />
                    <button
                      onClick={() => {
                        if (!newNoteName || !newNoteText) return;
                        setClientNotes([...clientNotes, { id: Math.random().toString(), name: newNoteName, text: newNoteText }]);
                        setNewNoteName('');
                        setNewNoteText('');
                      }}
                      className="bg-luxury-gold-500 text-luxury-dark-950 hover:bg-luxury-gold-600 font-bold rounded-lg text-xs py-2 w-full"
                    >
                      {locale === 'ar' ? 'حفظ الملاحظة' : 'Save Note'}
                    </button>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {clientNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-luxury-gold-500/5 border border-luxury-gold-500/20 rounded-xl relative space-y-2">
                        <span className="text-xs font-bold text-luxury-gold-500 block">{note.name}</span>
                        <p className="text-[10px] text-luxury-dark-300 leading-relaxed">{note.text}</p>
                        <button
                          onClick={() => setClientNotes(clientNotes.filter((x) => x.id !== note.id))}
                          className="absolute top-2 left-2 text-rose-500 hover:text-rose-400 p-0.5"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 2: COMMS & MESSAGING */}
        {activeTab === 'comms' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Automated WhatsApp integration (Feature 3) */}
            {hasFeature('whatsapp_integration') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'التكامل التلقائي مع واتساب' : 'Automated WhatsApp Redirection'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-luxury-dark-400 block font-bold">
                      {locale === 'ar' ? 'رقم هاتف العميل (مع رمز الدولة، مثلاً 966500000000)' : 'Client Phone (with country code, e.g. 966500000000)'}
                    </label>
                    <input
                      type="text"
                      placeholder="966500000000"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-luxury-dark-400 block font-bold">
                      {locale === 'ar' ? 'نص الرسالة التلقائي' : 'Pre-filled message template'}
                    </label>
                    <textarea
                      value={waText}
                      onChange={(e) => setWaText(e.target.value)}
                      rows={4}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                    />
                  </div>

                  <button
                    onClick={handleWhatsappSend}
                    className="bg-emerald-500 hover:bg-emerald-600 text-luxury-dark-950 font-bold rounded-lg text-xs py-2 w-full flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {locale === 'ar' ? 'فتح المحادثة على واتساب' : 'Open WhatsApp Chat'}
                  </button>
                </div>
              </div>
            )}

            {/* Email Templates Library (Feature 7) */}
            {hasFeature('email_templates') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Mail className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مكتبة قوالب البريد الإلكتروني' : 'Email Templates Library'}
                  </h3>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                  <div className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-luxury-gold-500">
                        {locale === 'ar' ? 'ترحيب بعميل جديد' : 'New Investor Greeting'}
                      </span>
                      <button
                        onClick={() => copyToClipboard('مرحباً بك عميلنا العزيز في شركة أربعة العقارية. نسعد بخدمتك ونقدم لك العروض الحصرية...')}
                        className="text-luxury-dark-400 hover:text-luxury-dark-200"
                        title="نسخ القالب"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-luxury-dark-300 line-clamp-2">
                      مرحباً بك عميلنا العزيز في شركة أربعة العقارية. نسعد بخدمتك ونقدم لك العروض الحصرية...
                    </p>
                  </div>

                  <div className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-luxury-gold-500">
                        {locale === 'ar' ? 'عرض سعر العقار رسمي' : 'Property Commercial Proposal'}
                      </span>
                      <button
                        onClick={() => copyToClipboard('بناءً على طلبكم، نرفق لكم تفاصيل عرض السعر والمواصفات الخاصة بالعقار رقم...')}
                        className="text-luxury-dark-400 hover:text-luxury-dark-200"
                        title="نسخ القالب"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-luxury-dark-300 line-clamp-2">
                      بناءً على طلبكم، نرفق لكم تفاصيل عرض السعر والمواصفات الخاصة بالعقار...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Internal Messaging (Feature 20) */}
            {hasFeature('internal_messaging') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4 lg:col-span-2">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'نظام المراسلات والمحادثات الداخلي' : 'Internal Messaging Board'}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="h-40 bg-luxury-dark-950 border border-luxury-dark-850 rounded-xl p-3 overflow-y-auto text-xs space-y-2">
                    <div className="p-2 rounded bg-luxury-dark-900/60 border border-luxury-dark-800">
                      <span className="font-bold text-luxury-gold-500">سارة الأحمد (Super Admin):</span>
                      <p className="text-luxury-dark-200 mt-1">تذكير للجميع: هناك تعديل في سياسة العمولات للمبيعات التي تزيد عن 5 مليون ريال.</p>
                    </div>
                    <div className="p-2 rounded bg-luxury-dark-900/60 border border-luxury-dark-800">
                      <span className="font-bold text-emerald-400">{user?.name} ({locale === 'ar' ? 'أنت' : 'You'}):</span>
                      <p className="text-luxury-dark-200 mt-1">تمت موازنة عمولة الشركاء وإغلاق صفقة فيلا الياسمين.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={locale === 'ar' ? 'اكتب رسالة للمجموعة...' : 'Post a message to team feed...'}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 flex-1"
                    />
                    <button
                      className="bg-luxury-gold-500 hover:bg-luxury-gold-600 text-luxury-dark-950 font-bold rounded-lg text-xs px-4"
                      onClick={() => addToast(locale === 'ar' ? 'تم إرسال الرسالة إلى المجموعة.' : 'Message posted to workspace feed.', 'success')}
                    >
                      {locale === 'ar' ? 'إرسال' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 3: TASKS & CALENDAR */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* In-app task reminders (Feature 4) */}
            {hasFeature('task_reminders') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <CheckSquare className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'التذكيرات والمهام الداخلية للمسوق' : 'In-app Task Reminders'}
                  </h3>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'موضوع التذكير...' : 'Task text...'}
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 flex-1"
                  />
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-32"
                  />
                  <button
                    onClick={() => {
                      if (!newTaskText) return;
                      setTasks([...tasks, { id: Math.random().toString(), title: newTaskText, date: newTaskDate || '2026-05-20', done: false }]);
                      setNewTaskText('');
                      setNewTaskDate('');
                    }}
                    className="bg-luxury-gold-500 text-luxury-dark-950 font-bold px-3 rounded-lg text-xs"
                  >
                    {locale === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => {
                            setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
                          }}
                          className="w-3.5 h-3.5 rounded accent-luxury-gold-500 cursor-pointer"
                        />
                        <span className={`text-xs ${t.done ? 'line-through text-luxury-dark-500' : 'text-luxury-dark-100'}`}>
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[9px] text-luxury-dark-400 font-mono">{t.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meeting Scheduler (Feature 10) */}
            {hasFeature('meeting_scheduler') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مجدول الاجتماعات مع المستثمرين' : 'Meeting Scheduler'}
                  </h3>
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'موضوع الاجتماع / اسم العميل' : 'Meeting subject'}
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100"
                  />
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={newMeetingTime}
                      onChange={(e) => setNewMeetingTime(e.target.value)}
                      className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 flex-1"
                    />
                    <button
                      onClick={() => {
                        if (!newMeetingTitle || !newMeetingTime) return;
                        setMeetings([...meetings, { id: Math.random().toString(), title: newMeetingTitle, time: newMeetingTime }]);
                        setNewMeetingTitle('');
                        setNewMeetingTime('');
                      }}
                      className="bg-luxury-gold-500 text-luxury-dark-950 font-bold px-4 rounded-lg text-xs"
                    >
                      {locale === 'ar' ? 'جدولة' : 'Schedule'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {meetings.map((m) => (
                    <div key={m.id} className="flex justify-between items-center p-2.5 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl">
                      <span className="text-xs text-luxury-dark-100">{m.title}</span>
                      <span className="text-[9px] text-luxury-gold-500 font-mono">
                        <FormattedDate dateString={m.time} showTime />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead Nurturing Flow (Feature 12) */}
            {hasFeature('lead_nurturing') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4 lg:col-span-2">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مسار رعاية وتأهيل العملاء المهتمين' : 'Lead Nurturing Pipeline'}
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { key: 'NEW', label: locale === 'ar' ? 'عميل جديد' : 'New Lead', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                    { key: 'CONTACTED', label: locale === 'ar' ? 'تم التواصل' : 'Contacted', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                    { key: 'INTERESTED', label: locale === 'ar' ? 'مهتم بالعروض' : 'Interested', color: 'bg-luxury-gold-500/10 text-luxury-gold-500 border-luxury-gold-500/20' },
                    { key: 'NEGOTIATION', label: locale === 'ar' ? 'مفاوضات' : 'Negotiating', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                  ].map((col) => (
                    <div key={col.key} className={`p-3 rounded-xl border ${col.color} space-y-2`}>
                      <span className="text-xs font-bold block border-b border-current pb-1 mb-2">{col.label}</span>
                      <div className="text-[10px] bg-luxury-dark-950 p-1.5 rounded border border-luxury-dark-800">
                        {col.key === 'NEW' ? 'عمر القحطاني' : col.key === 'CONTACTED' ? 'يوسف المطيري' : col.key === 'INTERESTED' ? 'عبد المحسن الرشيد' : 'فيصل العتيبي'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL 4: ADVANCED SYSTEMS */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Target Tracking & Personal Tracker (Features 5 & 11) */}
            {hasFeature('performance_tracker') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <BarChart className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مؤشر الأداء الشخصي وتتبع الأهداف' : 'Personal Performance & Target Tracker'}
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Sales Target */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-luxury-dark-300">{locale === 'ar' ? 'هدف حجم المبيعات الشهري:' : 'Monthly Sales Target:'}</span>
                      <span className="font-bold text-luxury-dark-100 font-mono">{(monthlyVolumeCurrent/1000000).toFixed(1)}M / {(monthlyVolumeTarget/1000000).toFixed(0)}M ر.س</span>
                    </div>
                    <div className="w-full h-2.5 bg-luxury-dark-950 rounded-full overflow-hidden border border-luxury-dark-800">
                      <div className="h-full bg-luxury-gold-500 rounded-full" style={{ width: `${(monthlyVolumeCurrent/monthlyVolumeTarget)*100}%` }} />
                    </div>
                  </div>

                  {/* Commission Target */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-luxury-dark-300">{locale === 'ar' ? 'هدف العمولات المحققة:' : 'Monthly Commission Target:'}</span>
                      <span className="font-bold text-luxury-dark-100 font-mono">{commissionCurrent.toLocaleString()} / {commissionTarget.toLocaleString()} ر.س</span>
                    </div>
                    <div className="w-full h-2.5 bg-luxury-dark-950 rounded-full overflow-hidden border border-luxury-dark-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(commissionCurrent/commissionTarget)*100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Property Comparison Tool (Feature 8) */}
            {hasFeature('property_comparison') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'أداة مقارنة العقارات للمستثمرين' : 'Property Comparison Tool'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={compareId1}
                    onChange={(e) => setCompareId1(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                  >
                    <option value="">{locale === 'ar' ? '-- اختر العقار الأول --' : '-- Choose Property 1 --'}</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{locale === 'ar' ? p.nameAr : p.nameEn}</option>)}
                  </select>
                  <select
                    value={compareId2}
                    onChange={(e) => setCompareId2(e.target.value)}
                    className="bg-luxury-dark-950 border border-luxury-dark-800 rounded-lg p-2 text-xs text-luxury-dark-100 w-full"
                  >
                    <option value="">{locale === 'ar' ? '-- اختر العقار الثاني --' : '-- Choose Property 2 --'}</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{locale === 'ar' ? p.nameAr : p.nameEn}</option>)}
                  </select>
                </div>

                {compareId1 && compareId2 && (
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-center border border-luxury-dark-800 rounded-xl p-3 bg-luxury-dark-950/40">
                    <span className="font-bold text-luxury-dark-400"></span>
                    <span className="font-bold text-luxury-gold-500">{locale === 'ar' ? properties.find(x => x.id === compareId1)?.nameAr : properties.find(x => x.id === compareId1)?.nameEn}</span>
                    <span className="font-bold text-blue-400">{locale === 'ar' ? properties.find(x => x.id === compareId2)?.nameAr : properties.find(x => x.id === compareId2)?.nameEn}</span>

                    <span className="text-luxury-dark-300">{locale === 'ar' ? 'السعر' : 'Price'}</span>
                    <span className="font-mono">{properties.find(x => x.id === compareId1)?.price.toLocaleString()} ر.س</span>
                    <span className="font-mono">{properties.find(x => x.id === compareId2)?.price.toLocaleString()} ر.س</span>

                    <span className="text-luxury-dark-300">{locale === 'ar' ? 'المساحة' : 'Area'}</span>
                    <span className="font-mono">{properties.find(x => x.id === compareId1)?.area} م²</span>
                    <span className="font-mono">{properties.find(x => x.id === compareId2)?.area} م²</span>

                    <span className="text-luxury-dark-300">{locale === 'ar' ? 'الحي' : 'Neighborhood'}</span>
                    <span>{properties.find(x => x.id === compareId1)?.neighborhood}</span>
                    <span>{properties.find(x => x.id === compareId2)?.neighborhood}</span>
                  </div>
                )}
              </div>
            )}

            {/* Document Vault (Feature 9) */}
            {hasFeature('document_vault') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <FolderOpen className="w-4 h-4 text-luxury-gold-500" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'خزنة المستندات والوثائق ونماذج العقود' : 'Document Vault (Templates)'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div
                    onClick={() => addToast('تم تحميل نموذج عقد بيع عقار سكني.pdf', 'success')}
                    className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-luxury-gold-500/35 transition-all"
                  >
                    <span>{locale === 'ar' ? 'نموذج عقد بيع سكني' : 'Residential Sale Contract'}</span>
                    <FileText className="w-4 h-4 text-luxury-gold-500" />
                  </div>
                  <div
                    onClick={() => addToast('تم تحميل نموذج اتفاقية وساطة تسويقية.pdf', 'success')}
                    className="p-3 bg-luxury-dark-900 border border-luxury-dark-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-luxury-gold-500/35 transition-all"
                  >
                    <span>{locale === 'ar' ? 'اتفاقية تسويق ووساطة' : 'Marketing Agreement'}</span>
                    <FileText className="w-4 h-4 text-luxury-gold-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Virtual Tour Player (Feature 17) */}
            {hasFeature('virtual_tour') && (
              <div className="glass-card p-5 rounded-2xl border border-luxury-dark-800/80 space-y-4">
                <div className="flex items-center gap-1.5 border-b border-luxury-dark-800 pb-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-luxury-dark-100">
                    {locale === 'ar' ? 'مشاهدة الجولات الافتراضية للعقارات' : 'Virtual Tour Player Overlay'}
                  </h3>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-luxury-dark-950 border border-luxury-dark-850 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-luxury-dark-950 to-transparent flex flex-col justify-end p-4 text-[10px]">
                    <span className="font-bold text-luxury-dark-100">{locale === 'ar' ? 'جولة تفاعلية: فيلا حي الياسمين النموذجية' : 'Interactive Tour: Yasmin Villa model'}</span>
                    <span className="text-luxury-dark-400">https://tours.arbaa.sa/v/yasmin-villa-101</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-luxury-gold-500 flex items-center justify-center text-luxury-dark-950 shadow-lg cursor-pointer hover:scale-105 transition-all">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
