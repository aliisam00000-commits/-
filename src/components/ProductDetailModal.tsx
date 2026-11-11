import React, { useState } from 'react';
import { 
  X, 
  MessageCircle, 
  Phone, 
  MapPin, 
  Clock, 
  Share2, 
  ShieldCheck, 
  CheckCircle, 
  User, 
  Tag,
  ArrowRight,
  Eye,
  Calendar,
  BadgeCheck,
  Trash2,
  Edit3,
  Check,
  Loader2
} from 'lucide-react';
import { Product, UserProfile, CategoryType, AL_WALI_NEIGHBORHOODS } from '../types';
import { formatAccurateTimeAgo, formatExactArabicDateTime } from '../utils/dateUtils';
import { updateOnlineProduct } from '../services/api';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  currentUser: UserProfile | null;
  onDelete?: (id: string) => void;
  onProductUpdated?: (updatedProduct: Product) => void;
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

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  currentUser,
  onDelete,
  onProductUpdated
}) => {
  if (!product) return null;

  // Edit Mode state for owner
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(product.title);
  const [editCat, setEditCat] = useState<CategoryType>(product.cat);
  const [editPrice, setEditPrice] = useState(String(product.price));
  const [editCurrency, setEditCurrency] = useState(product.currency || 'ج.س');
  const [editDesc, setEditDesc] = useState(product.desc);
  const [editPhone, setEditPhone] = useState(product.phone);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const rawPhone = product.phone ? product.phone.replace(/\D/g, '') : '912345678';
  let cleanPhone = rawPhone;
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  if (!cleanPhone.startsWith('249') && cleanPhone.length <= 10) cleanPhone = `249${cleanPhone}`;

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله، أنا مهتم بمنتجك المعروض في سوق الولي الإلكتروني:\n*${product.title}*\nالسعر: ${product.price.toLocaleString('ar-EG')} ${product.currency || 'ج.س'}`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  const isOwner = currentUser && (
    currentUser.uid === product.uid || 
    currentUser.displayName === product.sellerName || 
    (currentUser.phoneNumber && product.phone && currentUser.phoneNumber.includes(product.phone.replace(/\D/g, '')))
  );

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: `${product.title} - السعر: ${product.price} ${product.currency || 'ج.س'} في سوق الولي`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${product.title} - السعر: ${product.price} ${product.currency || 'ج.س'}\nرابط سوق الولي: ${window.location.href}`);
      alert('تم نسخ رابط وتفاصيل الإعلان إلى الحافظة!');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editTitle.trim()) {
      setEditError('يرجى إدخال عنوان الإعلان');
      return;
    }
    if (!editPrice || isNaN(Number(editPrice))) {
      setEditError('يرجى إدخال سعر صحيح');
      return;
    }
    if (!editPhone.trim()) {
      setEditError('يرجى إدخال رقم الهاتف');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateOnlineProduct(product.id, {
        title: editTitle.trim(),
        cat: editCat,
        price: Number(editPrice),
        currency: editCurrency,
        desc: editDesc.trim() || 'لا يوجد وصف إضافي',
        phone: editPhone.trim()
      });

      if (onProductUpdated) {
        onProductUpdated(updated);
      }
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'فشل حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  const displayLocation = product.sellerNeighborhood ? `قرية الولي - ${product.sellerNeighborhood}` : (product.location || 'قرية الولي');
  const exactPublishDate = formatExactArabicDateTime(product.createdAt);
  const relativeTime = formatAccurateTimeAgo(product.createdAt);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#132238] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Top Bar with Clear Back Button & Action Controls */}
        <div className="bg-slate-100 dark:bg-slate-900/90 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-slate-300 dark:border-slate-700 shadow-xs"
            title="الرجوع للقائمة الرئيسية"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            <span>الرجوع للقائمة الرئيسية</span>
          </button>

          <div className="flex items-center gap-2">
            {isOwner && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  title="تعديل تفاصيل إعلاني"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تعديل الإعلان</span>
                </button>

                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm("هل أنت متأكد من حذف هذا الإعلان بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.")) {
                        onDelete(product.id);
                        onClose();
                      }
                    }}
                    className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                    title="حذف الإعلان"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="مشاركة الإعلان"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* Product Image */}
          <div className="relative bg-slate-950 flex items-center justify-center min-h-[300px] md:min-h-[420px] p-2">
            <img
              src={product.img || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80'}
              alt={product.title}
              className="max-h-[380px] w-full object-contain rounded-xl"
            />
            <div className="absolute top-4 right-4 bg-[#0d3b66] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md border border-white/20">
              {product.cat}
            </div>
            {product.isSellerVerified && (
              <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 border border-emerald-400/40">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>تاجر موثق</span>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="p-6 flex flex-col justify-between">
            {isEditing ? (
              /* EDIT MODE FORM FOR OWNER */
              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-amber-500" />
                    <span>تعديل بيانات الإعلان</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    إلغاء
                  </button>
                </div>

                {editError && (
                  <div className="p-2 text-xs bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
                    {editError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان الإعلان:
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      القسم:
                    </label>
                    <select
                      value={editCat}
                      onChange={(e) => setEditCat(e.target.value as CategoryType)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {CATEGORIES_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      السعر ({editCurrency}):
                    </label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم هاتف التواصل:
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الوصف والمواصفات:
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>حفظ التعديلات في السوق</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              /* REGULAR VIEW MODE */
              <div>
                {/* Category & Location */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                    {displayLocation}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    {product.cat}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-3">
                  {product.title}
                </h2>

                {/* Exact Date and Time Badge */}
                <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 mb-3 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>تاريخ النشر:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{exactPublishDate}</span>
                  </span>
                  <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    {relativeTime}
                  </span>
                </div>

                {/* Price Banner */}
                <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-700/80 rounded-2xl p-3.5 mb-3.5 flex items-baseline justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">السعر المطلوب:</span>
                  <div className="text-left flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {product.price.toLocaleString('ar-EG')}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
                      {product.currency || 'ج.س'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">مواصفات وتفاصيل السلعة:</h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-100 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-[140px] overflow-y-auto">
                    {product.desc}
                  </p>
                </div>

                {/* Seller info card */}
                <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800/90 rounded-2xl mb-3 border border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-xl bg-[#0d3b66] dark:bg-[#1e4470] text-[#d4af37] dark:text-[#f4d068] flex items-center justify-center font-bold text-base shadow-sm">
                    {product.sellerName ? product.sellerName.charAt(0) : '🛒'}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>{product.sellerName || 'معلن في سوق الولي'}</span>
                      {product.isSellerVerified ? (
                        <BadgeCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" title="عضو موثق بالإيميل في سوق الولي" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      الموقع: <span className="font-semibold text-slate-800 dark:text-slate-100">{displayLocation}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      رقم التواصل: <span dir="ltr" className="font-mono font-semibold text-slate-800 dark:text-slate-100">{product.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Contact CTAs */}
            {!isEditing && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs sm:text-sm"
                >
                  <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
                  <span>مراسلة البائع عبر الواتساب فوراً</span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-xl font-semibold text-xs transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span>اتصال هاتفي</span>
                  </a>

                  <button
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-2.5 px-3 rounded-xl font-semibold text-xs transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4 ml-1" />
                    <span>الرجوع للرئيسية</span>
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

