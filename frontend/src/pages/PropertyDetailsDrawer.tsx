import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';
import {
  X,
  Tag,
  Navigation,
  User,
  Phone,
  Copy,
  Check,
  Megaphone,
  Briefcase,
} from 'lucide-react';

interface PropertyDetailsDrawerProps {
  propertyId: string;
  onClose: () => void;
}

export const PropertyDetailsDrawer: React.FC<PropertyDetailsDrawerProps> = ({
  propertyId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { hasPermission, addToast } = useStore();
  const [copied, setCopied] = useState(false);

  // Fetch full property details
  const { data: prop, isLoading } = useQuery({
    queryKey: ['propertyDetails', propertyId],
    queryFn: async () => {
      const res = await api.get(`/properties/${propertyId}`);
      return res.data;
    },
  });

  // Mutation to update status from drawer
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.patch(`/properties/${propertyId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyDetails', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      addToast('تم تحديث حالة العقار بنجاح.', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.error || 'فشل تحديث الحالة.', 'error');
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-y-0 left-0 right-64 z-30 flex justify-end bg-black/50 backdrop-blur-sm" dir="rtl">
        <div className="w-full max-w-md h-full bg-luxury-dark-950 border-r border-luxury-gold-500/10 p-6 skeleton-shimmer" />
      </div>
    );
  }

  if (!prop) return null;

  // Calculated metrics
  const pricePerSqm = prop.area > 0 ? prop.price / prop.area : 0;
  const commission = prop.price * 0.025; // 2.5% standard commission

  // Parse partner splits if property is sold
  let splits: Array<{ userId: string; name: string; percentage: number }> = [];
  const deal = prop.deals && prop.deals[0];
  if (deal && deal.partnerSplits) {
    try {
      splits = typeof deal.partnerSplits === 'string' ? JSON.parse(deal.partnerSplits) : deal.partnerSplits;
    } catch (e) {
      console.error('Failed to parse deal splits');
    }
  }

  const getTypeLabelAr = (type: string) => {
    switch (type) {
      case 'VILLA': return 'فيلا سكنية فاخرة';
      case 'APARTMENT': return 'شقة مودرن مجهزة';
      case 'LAND': return 'أرض سكنية متميزة';
      case 'BUILDING': return 'عمارة استثمارية';
      case 'OFFICE': return 'مكتب تجاري فاخر';
      default: return type;
    }
  };

  // Marketing Ad Text Generator
  const generateAdText = () => {
    return `✨ *شركة أربعة للتسويق العقاري* ✨
فرصة عقارية مميزة وحصرية!

🏡 *عقار للبيع:* ${prop.nameAr}
📌 *النوع:* ${getTypeLabelAr(prop.type)}
📍 *الموقع:* حي ${prop.neighborhood}، الرياض
📐 *المساحة:* ${prop.area} متر مربع
🛣️ *عرض الشارع:* ${prop.streetWidth} متر
📋 *رقم الصك:* ${prop.deedNumber}
💵 *السعر المطلوب:* ${prop.price.toLocaleString()} ريال سعودي
📍 *الإحداثيات:* https://maps.google.com/?q=${prop.coordinates}

للاستفسار والتواصل ولمزيد من التفاصيل، يسعدنا تواصلكم معنا عبر أرقام خدمة العملاء.
رقم الترخيص العقاري: 120000344`;
  };

  const handleCopyAd = () => {
    const text = generateAdText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('تم نسخ نص الإعلان الجاهز للحافظة بنجاح 📋', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback Google Maps iframe if no embed URL is set
  const defaultIframeUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    prop.coordinates
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const mapUrl = prop.googleMapsUrl || defaultIframeUrl;

  return (
    <div className="fixed inset-y-0 left-0 right-64 z-30 flex justify-end bg-black/60 backdrop-blur-sm font-cairo" dir="rtl">
      {/* Background closer */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Drawer Body - slide in from left */}
      <div className="w-full max-w-md h-full bg-luxury-dark-950 border-r border-luxury-gold-500/10 shadow-2xl flex flex-col slide-up relative">
        
        {/* Fixed Header */}
        <div className="p-6 border-b border-luxury-dark-800 flex justify-between items-center shrink-0">
          <h2 className="text-md font-bold text-luxury-gold-500 flex items-center gap-2">
            <Tag className="w-5 h-5" /> تفاصيل العقار الفنية
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg border border-luxury-dark-800 hover:border-luxury-gold-500/20 text-luxury-dark-400 hover:text-luxury-dark-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <span className="text-[10px] uppercase font-bold text-luxury-gold-500 font-mono tracking-widest block mb-0.5">
              {prop.type} - {prop.status}
            </span>
            <h3 className="text-lg font-bold text-luxury-dark-50">{prop.nameAr}</h3>
            <p className="text-xs text-luxury-dark-400 font-mono mt-0.5">{prop.nameEn}</p>
          </div>

          {/* Google Maps Iframe */}
          <div className="w-full h-44 rounded-xl border border-luxury-dark-800 overflow-hidden relative shrink-0">
            <iframe
              title="موقع العقار على الخريطة"
              src={mapUrl}
              className="w-full h-full border-none"
              allowFullScreen={false}
              loading="lazy"
            />
            {/* Overlay coordinates */}
            <span className="absolute bottom-2 left-2 bg-luxury-dark-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-luxury-dark-300 font-mono flex items-center gap-1 border border-luxury-dark-800">
              <Navigation className="w-2.5 h-2.5 text-luxury-gold-500" /> {prop.coordinates}
            </span>
          </div>

          {/* Specs List */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-luxury-dark-900/40 border border-luxury-dark-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-luxury-dark-400 block">المساحة</span>
              <span className="text-sm font-bold text-luxury-dark-100 font-mono flex items-baseline gap-1">
                {prop.area} <span className="text-[10px] font-normal text-luxury-dark-400">م²</span>
              </span>
            </div>

            <div className="p-3 bg-luxury-dark-900/40 border border-luxury-dark-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-luxury-dark-400 block">سعر المتر التقريبي</span>
              <span className="text-sm font-bold text-luxury-gold-500 font-mono flex items-baseline gap-1">
                {Math.round(pricePerSqm).toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-luxury-dark-400">ر.س</span>
              </span>
            </div>

            <div className="p-3 bg-luxury-dark-900/40 border border-luxury-dark-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-luxury-dark-400 block">السعر المطلوب</span>
              <span className="text-sm font-bold text-luxury-gold-500 font-mono flex items-baseline gap-1">
                {prop.price.toLocaleString()}{' '}
                <span className="text-[10px] font-normal text-luxury-dark-400">ر.س</span>
              </span>
            </div>

            <div className="p-3 bg-luxury-dark-900/40 border border-luxury-dark-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-luxury-dark-400 block">رقم الصك</span>
              <span className="text-sm font-bold text-luxury-dark-200 font-mono">{prop.deedNumber}</span>
            </div>

            <div className="p-3 bg-luxury-dark-900/40 border border-luxury-dark-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-luxury-dark-400 block">عرض الشارع</span>
              <span className="text-sm font-bold text-luxury-dark-200 font-mono flex items-baseline gap-1">
                {prop.streetWidth} <span className="text-[10px] font-normal text-luxury-dark-400">متر</span>
              </span>
            </div>

            <div className="p-3 bg-luxury-dark-900/40 border border-luxury-dark-800 rounded-xl space-y-0.5">
              <span className="text-[10px] text-luxury-dark-400 block">الحي</span>
              <span className="text-sm font-bold text-luxury-dark-100 flex items-baseline gap-1">
                {prop.neighborhood}
              </span>
            </div>
          </div>

          {/* Owner details (Requires permissions) */}
          <div className="p-3 bg-luxury-gold-500/5 border border-luxury-gold-500/10 rounded-xl space-y-2">
            <span className="text-[10px] text-luxury-gold-500 font-semibold block uppercase tracking-wider">
              بيانات التواصل مع المالك
            </span>
            <div className="flex items-center justify-between text-xs text-luxury-dark-200">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-luxury-gold-500/80" /> {prop.ownerName}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-luxury-gold-500/80" /> {prop.ownerPhone}
              </span>
            </div>
          </div>

          {/* Sold / Commission Details */}
          {prop.status === 'SOLD' && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
              <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> تفاصيل العمولة والأرباح (2.5%)
              </span>
              <div className="flex justify-between text-xs border-b border-luxury-dark-800 pb-2">
                <span className="text-luxury-dark-300">إجمالي قيمة الصفقة:</span>
                <span className="font-bold text-luxury-dark-100 font-mono">{prop.price.toLocaleString()} ر.س</span>
              </div>
              <div className="flex justify-between text-xs border-b border-luxury-dark-800 pb-2">
                <span className="text-luxury-dark-300">إجمالي عمولة الشركة (2.5%):</span>
                <span className="font-bold text-emerald-400 font-mono">{commission.toLocaleString()} ر.س</span>
              </div>

              {/* Profit distribution list */}
              {splits.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-luxury-dark-400 block font-semibold">توزيع أرباح الشركاء:</span>
                  <div className="space-y-1">
                    {splits.map((s, idx) => {
                      const share = commission * (s.percentage / 100);
                      return (
                        <div key={idx} className="flex justify-between text-[11px] bg-luxury-dark-900/30 p-1.5 rounded border border-luxury-dark-800/40">
                          <span className="text-luxury-dark-200">{s.name} ({s.percentage}%)</span>
                          <span className="font-bold text-luxury-gold-500 font-mono">{share.toLocaleString()} ر.س</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ad copy generator */}
          <div className="p-4 bg-luxury-dark-900/30 border border-luxury-dark-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-luxury-dark-300 font-semibold flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-luxury-gold-500" /> مولد الإعلان التسويقي
              </span>
              <button
                onClick={handleCopyAd}
                className="flex items-center gap-1 text-[10px] font-bold text-luxury-gold-500 hover:text-luxury-gold-400 bg-luxury-gold-500/5 px-2.5 py-1 rounded-lg border border-luxury-gold-500/10 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'تم النسخ' : 'نسخ الإعلان'}
              </button>
            </div>
            <textarea
              readOnly
              rows={4}
              value={generateAdText()}
              className="w-full text-[10px] bg-luxury-dark-950 font-sans border-luxury-dark-900 focus:ring-0 leading-relaxed rounded-lg p-2.5 select-all"
            />
          </div>
        </div>

        {/* Change status drawer actions (Sticky Footer) */}
        {hasPermission('manage_properties') && (
          <div className="border-t border-luxury-dark-800 bg-luxury-dark-950/90 backdrop-blur-md p-6 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-luxury-dark-300">تغيير حالة العقار:</span>
              <div className="flex gap-1.5 flex-1 max-w-[200px]">
                <button
                  onClick={() => statusMutation.mutate('AVAILABLE')}
                  disabled={prop.status === 'AVAILABLE' || statusMutation.isPending}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg border text-center font-bold transition-all ${
                    prop.status === 'AVAILABLE'
                      ? 'bg-arbaa-cyan-400/10 text-arbaa-cyan-400 border-arbaa-cyan-400/20'
                      : 'border-luxury-dark-800 text-luxury-dark-400 hover:border-luxury-dark-700'
                  }`}
                >
                  متاح
                </button>
                <button
                  onClick={() => statusMutation.mutate('RESERVED')}
                  disabled={prop.status === 'RESERVED' || statusMutation.isPending}
                  className={`flex-1 text-[11px] py-1.5 rounded-lg border text-center font-bold transition-all ${
                    prop.status === 'RESERVED'
                      ? 'bg-luxury-gold-500/10 text-luxury-gold-400 border-luxury-gold-500/20'
                      : 'border-luxury-dark-800 text-luxury-dark-400 hover:border-luxury-dark-700'
                  }`}
                >
                  محجوز
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
