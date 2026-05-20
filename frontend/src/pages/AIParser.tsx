import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import { Sparkles, FileText, ArrowLeftRight, Check, RefreshCw } from 'lucide-react';
import { NumberInput } from '../components/NumberInput';

export const AIParser: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useStore();

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  // Editable draft fields
  const [nameAr, setNameAr] = useState('');
  const [type, setType] = useState('VILLA');
  const [neighborhood, setNeighborhood] = useState('');
  const [price, setPrice] = useState('');
  const [area, setArea] = useState('');
  const [streetWidth, setStreetWidth] = useState('');
  const [deedNumber, setDeedNumber] = useState('');
  const [ownerName, setOwnerName] = useState('المالك المباشر');
  const [ownerPhone, setOwnerPhone] = useState('0500000000');

  // Mutation to parse text via backend AI engine
  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await api.post('/ai/parse', { text });
      return res.data;
    },
    onMutate: () => {
      setParsing(true);
    },
    onSuccess: (data) => {
      setDraft(data);
      // Populate editable states
      setNameAr(`عقار تم تحليله في حي ${data.neighborhood || 'غير محدد'}`);
      setType(data.type || 'VILLA');
      setNeighborhood(data.neighborhood || 'غير محدد');
      setPrice(data.price ? data.price.toString() : '');
      setArea(data.area ? data.area.toString() : '');
      setStreetWidth(data.streetWidth ? data.streetWidth.toString() : '15');
      setDeedNumber(data.deedNumber || '');
      addToast('تم تحليل النص بنجاح وتعبئة المسودة بالبيانات المستخرجة.', 'success');
    },
    onError: () => {
      addToast('حدث خطأ أثناء تحليل النص بالذكاء الاصطناعي.', 'error');
    },
    onSettled: () => {
      setParsing(false);
    },
  });

  // Mutation to save the drafted property
  const saveMutation = useMutation({
    mutationFn: async (propData: any) => {
      const res = await api.post('/properties', propData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardProperties'] });
      addToast('تم اعتماد المسودة وإنشاء العقار بنجاح في المحفظة! 🎉', 'success');
      setDraft(null);
      setRawText('');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'حدث خطأ أثناء محاولة حفظ العقار.', 'error');
    },
  });

  const handleParse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      addToast('يرجى كتابة أو لصق وصف العقار أولاً.', 'warning');
      return;
    }
    parseMutation.mutate(rawText);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !neighborhood || !price || !area || !deedNumber) {
      addToast('يرجى ملء جميع الحقول المطلوبة للمسودة قبل الاعتماد.', 'warning');
      return;
    }

    saveMutation.mutate({
      nameAr,
      nameEn: `AI Parsed ${type} in ${neighborhood}`,
      type,
      status: 'AVAILABLE',
      neighborhood,
      price,
      area,
      deedNumber,
      streetWidth,
      coordinates: '24.8123, 46.6432', // default Riyadh coordinates
      ownerName,
      ownerPhone,
    });
  };

  // Samples for click-to-fill testing
  const sampleTexts = [
    {
      title: 'فيلا بالياسمين',
      text: 'للبيع فيلا فخمة ومتميزة في حي الياسمين شمال الرياض، المساحة 450م، السعر 3,800,000 ريال، صك رقم 9988776655، شارع عرض 20 متر، تشطيب مودرن ممتاز.',
    },
    {
      title: 'أرض بالملقا',
      text: 'أرض سكنية للبيع في حي الملقا، مساحة 800 متر مربع، بسعر 5200000 ريال، رقم الصك 8877665544، تفتح على شارع عرض 15م، مناسبة لبناء فيلا أو فلتين دوبلكس.',
    },
    {
      title: 'شقة بالصحافة',
      text: 'شقة فاخرة للبيع في حي الصحافة، المساحة: 180م، السعر المطلوب: 1250000 ريال، رقم الصك 7766554433، تحتوي على 3 غرف نوم وصالة واسعة ومطبخ راكب.',
    },
  ];

  return (
    <div className="p-6 space-y-6 fade-in" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-luxury-dark-50 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-luxury-gold-500 animate-pulse" /> محلل العقارات بالذكاء الاصطناعي (AI Parser)
        </h1>
        <p className="text-xs text-luxury-dark-400 mt-1">
          قم بلصق الإعلان العقاري بصيغته النصية، وسيقوم النظام بتفصيل واستخراج حقول العقار وتجهيز مسودة للإقرار.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Textpaste inputs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-luxury-dark-800 space-y-4">
            <h2 className="text-xs font-bold text-luxury-gold-500 uppercase tracking-wider">
              1. إدخال النص العقاري
            </h2>

            {/* Click to fill samples */}
            <div className="space-y-1">
              <span className="text-[10px] text-luxury-dark-400 block font-semibold">تعبئة نموذج تجريبي سريع:</span>
              <div className="flex gap-1.5 flex-wrap">
                {sampleTexts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => setRawText(sample.text)}
                    className="text-[10px] bg-luxury-dark-900 border border-luxury-dark-800 hover:border-luxury-gold-500/30 hover:bg-luxury-gold-500/5 px-2 py-1 rounded text-luxury-dark-300 transition-colors"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleParse} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label>نص الإعلان العقاري</label>
                <textarea
                  rows={8}
                  placeholder="انسخ والصق نص الإعلان هنا. مثال: فيلا للبيع في حي الياسمين مساحتها 350 متر بسعر 3200000 ريال..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full text-xs font-sans leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={parsing}
                className="w-full bg-gold-gradient text-luxury-dark-950 font-bold py-3 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                {parsing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {parsing ? 'جاري تحليل واستخراج البيانات...' : 'تحليل النص واستخراج الحقول'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Parsed output / editing draft */}
        <div className="lg:col-span-3">
          {draft ? (
            <div className="glass-card rounded-2xl p-5 border border-luxury-gold-500/20 slide-up space-y-5">
              <div className="flex items-center justify-between border-b border-luxury-dark-800 pb-3">
                <h2 className="text-xs font-bold text-luxury-gold-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 animate-bounce" /> 2. مراجعة وتعديل مسودة العقار
                </h2>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                  تحليل ذكي ناجح
                </span>
              </div>

              <form onSubmit={handleSaveDraft} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Title */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label>اسم العقار المقترح *</label>
                    <input
                      type="text"
                      required
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label>نوع العقار المستخرج *</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="VILLA">فيلا</option>
                      <option value="APARTMENT">شقة</option>
                      <option value="LAND">أرض</option>
                      <option value="BUILDING">عمارة</option>
                      <option value="OFFICE">مكتب</option>
                    </select>
                  </div>

                  {/* Neighborhood */}
                  <div className="flex flex-col gap-1.5">
                    <label>الحي المستخرج *</label>
                    <input
                      type="text"
                      required
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                    />
                  </div>

                  {/* Price */}
                  <div className="flex flex-col gap-1.5">
                    <label>السعر المستخرج (ر.س) *</label>
                    <NumberInput
                      required
                      value={price}
                      onChange={setPrice}
                      className="font-mono text-luxury-gold-500 font-bold"
                    />
                  </div>

                  {/* Area */}
                  <div className="flex flex-col gap-1.5">
                    <label>المساحة المستخرجة (م²) *</label>
                    <NumberInput
                      required
                      value={area}
                      onChange={setArea}
                      className="font-mono"
                    />
                  </div>

                  {/* Street Width */}
                  <div className="flex flex-col gap-1.5">
                    <label>عرض الشارع المستخرج (متر)</label>
                    <NumberInput
                      value={streetWidth}
                      onChange={setStreetWidth}
                      className="font-mono"
                    />
                  </div>

                  {/* Deed Number */}
                  <div className="flex flex-col gap-1.5">
                    <label>رقم الصك المستخرج (مطلوب فريد) *</label>
                    <input
                      type="text"
                      required
                      placeholder="رقم الصك"
                      value={deedNumber}
                      onChange={(e) => setDeedNumber(e.target.value)}
                      className="font-mono text-luxury-dark-100 font-semibold"
                    />
                  </div>

                  {/* Owner details */}
                  <div className="flex flex-col gap-1.5">
                    <label>اسم مالك العقار</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label>هاتف مالك العقار</label>
                    <input
                      type="text"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-luxury-dark-800 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="px-4 py-2.5 text-xs text-luxury-dark-400 hover:text-luxury-dark-100 transition-colors"
                  >
                    تجاهل المسودة
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-gold-gradient text-luxury-dark-950 font-bold px-6 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-luxury-gold-500/5 hover:opacity-95 transition-all"
                  >
                    {saveMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {saveMutation.isPending ? 'جاري الاعتماد...' : 'اعتماد وحفظ في قاعدة البيانات'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-10 border border-luxury-dark-800 text-center space-y-3 flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="w-12 h-12 rounded-full border border-luxury-dark-800 bg-luxury-dark-900/50 flex items-center justify-center text-luxury-dark-400 mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-luxury-dark-200">في انتظار النص العقاري</h3>
              <p className="text-xs text-luxury-dark-400 max-w-xs leading-relaxed">
                ادخل نص الإعلان العقاري في الخانة المقابلة واضغط على تحليل لإظهار الحقول وتعبئة المسودة للمراجعة.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
