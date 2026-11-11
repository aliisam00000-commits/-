import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Tag, 
  MapPin, 
  Phone, 
  FileText, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  ShieldCheck,
  BadgeCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CategoryType, Product, UserProfile, AL_WALI_NEIGHBORHOODS } from '../types';
import { createOnlineProduct, compressAndEncodeImage } from '../services/api';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onProductCreated: (newProduct: Product) => void;
  onOpenAuth: () => void;
}

const CATEGORIES_OPTIONS: CategoryType[] = [
  'الهواتف',
  'السيارات',
  'الأجهزة والإلكترونيات',
  'البيت والأثاث',
  'المواشي والزراعة',
  'خدمات',
  'ملابس',
  'عقارات',
  'أخرى'
];

const PRESET_SAMPLE_IMAGES = [
  { label: 'هاتف ذكي', url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&auto=format&fit=crop&q=80' },
  { label: 'لابتوب / كمبيوتر', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80' },
  { label: 'سيارة حديثة', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80' },
  { label: 'أثاث منزلي', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80' },
  { label: 'شاشة وتلفزيون', url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80' },
  { label: 'طاقة شمسية', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80' },
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProductCreated,
  onOpenAuth
}) => {
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<CategoryType>('الهواتف');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState('ج.س');
  const [desc, setDesc] = useState('');
  const [phone, setPhone] = useState(currentUser?.phoneNumber || '0912345678');
  const [neighborhood, setNeighborhood] = useState(currentUser?.neighborhood || AL_WALI_NEIGHBORHOODS[0]);
  const [sellerName, setSellerName] = useState(currentUser?.displayName || 'معلن في سوق الولي');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال عنوان الإعلان');
      return;
    }
    if (!price || isNaN(Number(price))) {
      setErrorMsg('يرجى إدخال سعر صحيح');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('يرجى إدخال رقم الهاتف للتواصل عبر الواتساب');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = imagePreview || PRESET_SAMPLE_IMAGES[0].url;

      // If user uploaded a local file, compress and encode it
      if (imageFile) {
        finalImageUrl = await compressAndEncodeImage(imageFile);
      }

      const isVerifiedUser = Boolean(currentUser?.isEmailVerified || currentUser?.isPhoneVerified || currentUser?.isVerified);

      const newProd = await createOnlineProduct({
        title: title.trim(),
        cat: cat,
        price: Number(price),
        currency: currency,
        desc: desc.trim() || 'لا يوجد وصف إضافي',
        img: finalImageUrl,
        phone: phone.trim(),
        uid: currentUser?.uid || 'user_guest',
        sellerName: sellerName.trim() || currentUser?.displayName || 'معلن في سوق الولي',
        sellerNeighborhood: neighborhood,
        isSellerVerified: isVerifiedUser,
        location: `قرية الولي - ${neighborhood}`,
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {}

      onProductCreated(newProd);
      onClose();
      
      // Reset form
      setTitle('');
      setPrice('');
      setDesc('');
      setImageFile(null);
      setImagePreview('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'فشل نشر الإعلان. تأكد من اتصالك بالإنترنت');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="addModal" className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#132238] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header with Back Button */}
        <div className="bg-gradient-to-r from-[#0d3b66] via-[#10487d] to-[#0d3b66] p-5 text-white flex items-center justify-between border-b border-[#d4af37]/30">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              title="الرجوع للقائمة الرئيسية"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>الرجوع للرئيسية</span>
            </button>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black whitespace-nowrap">
                إضافة إعلان جديد
              </h2>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Authenticated Seller Badge */}
          {currentUser ? (
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/40 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
              <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                <BadgeCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>سيتم نشر الإعلان بهويتك المعتمدة: <strong>{currentUser.displayName}</strong></span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 rounded-lg">
                {currentUser.neighborhood || 'قرية الولي'}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>يمكنك تسجيل الدخول المباشر بحساب Google للحصول على شارة التاجر المعتمد</span>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-600"
              >
                تسجيل الدخول
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ad Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              عنوان الإعلان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تويوتا كورولا 2022 فحص كامل / آيفون 15 نظيف"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
              required
            />
          </div>

          {/* Category & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>القسم <span className="text-red-500">*</span></span>
              </label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as CategoryType)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
              >
                {CATEGORIES_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>السعر المعروض <span className="text-red-500">*</span></span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="000"
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-[#d4af37]"
                  required
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none"
                >
                  <option value="ج.س">ج.س (جنيه سوداني)</option>
                  <option value="$">$ (دولار أمريكي)</option>
                  <option value="ر.س">ر.س (ريال سعودي)</option>
                  <option value="درهم">درهم إماراتي</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seller Name & Phone & Neighborhood */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>اسم المعلن</span>
              </label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="اسمك أو اسم المحل"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                <span>رقم الواتساب <span className="text-red-500">*</span></span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 0912345678"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>الحي في قرية الولي <span className="text-red-500">*</span></span>
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
              >
                {AL_WALI_NEIGHBORHOODS.map((nh) => (
                  <option key={nh} value={nh}>
                    {nh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>تفاصيل ووصف الإعلان</span>
            </label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="اكتب مواصفات السلعة، حالتها، مكان المعاينة في قرية الولي، وأي تفاصيل أخرى تهم المشتري..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37] leading-relaxed"
            />
          </div>

          {/* Photo Upload & Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>صورة المنتج أو الإعلان</span>
            </label>

            {/* Custom file upload input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#d4af37] rounded-2xl bg-slate-50 dark:bg-slate-900 transition-colors cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <Upload className="w-4 h-4 text-[#d4af37]" />
                <span>اختر صورة من جهازك / الكاميرا</span>
              </button>

              {imagePreview && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                  <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Sample Presets */}
            <div className="mt-3">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1.5 font-medium">
                أو اختر صورة جاهزة ومناسبة لقسم إعلانك:
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_SAMPLE_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImagePreview(preset.url);
                      setImageFile(null);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                      imagePreview === preset.url
                        ? 'bg-[#d4af37] text-[#0d3b66] border-[#d4af37] font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-transparent dark:border-slate-700"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>الرجوع للقائمة الرئيسية</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-[#d4af37] hover:bg-[#e0bc46] text-[#0d3b66] font-black px-6 py-3 rounded-xl shadow-lg transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارِ نشر الإعلان في سوق الولي...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>نشر الإعلان فوراً للجميع</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
