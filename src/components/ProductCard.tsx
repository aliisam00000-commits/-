import React from 'react';
import { 
  MessageCircle, 
  Phone, 
  MapPin, 
  Clock, 
  Share2, 
  Trash2, 
  ShieldCheck,
  Sparkles,
  User,
  CheckCircle2,
  BadgeCheck
} from 'lucide-react';
import { Product, UserProfile } from '../types';
import { formatAccurateTimeAgo, formatExactArabicDateTime } from '../utils/dateUtils';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  currentUser: UserProfile | null;
  onDelete?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  currentUser,
  onDelete
}) => {
  // Format clean WhatsApp phone number
  const rawPhone = product.phone ? product.phone.replace(/\D/g, '') : '912345678';
  let cleanPhone = rawPhone;
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  if (!cleanPhone.startsWith('249') && cleanPhone.length <= 10) {
    cleanPhone = `249${cleanPhone}`;
  }

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم ورحمة الله، أنا مهتم بمنتجك المعروض في سوق الولي الإلكتروني:\n*${product.title}*\nالسعر: ${product.price.toLocaleString('ar-EG')} ${product.currency || 'ج.س'}`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  const isOwner = currentUser && (
    currentUser.uid === product.uid || 
    currentUser.displayName === product.sellerName || 
    (currentUser.phoneNumber && product.phone && currentUser.phoneNumber.includes(product.phone.replace(/\D/g, '')))
  );

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: product.title,
        text: `${product.title} - سوق الولي الإلكتروني`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${product.title} - السعر: ${product.price} ${product.currency || 'ج.س'}\nرابط سوق الولي: ${window.location.href}`);
      alert("تم نسخ رابط وتفاصيل الإعلان إلى الحافظة!");
    }
  };

  const sellerDisplay = product.sellerName && product.sellerName.trim() ? product.sellerName : 'معلن في سوق الولي';
  const displayLocation = product.sellerNeighborhood ? `قرية الولي - ${product.sellerNeighborhood}` : (product.location || 'قرية الولي');
  const exactTimeText = formatExactArabicDateTime(product.createdAt);
  const relativeTimeText = formatAccurateTimeAgo(product.createdAt);

  return (
    <div 
      id={`productCard_${product.id}`}
      onClick={() => onSelect(product)}
      className="card-custom group flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 relative bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-800 rounded-2xl"
    >
      {/* Top Image Container */}
      <div className="relative w-full h-[200px] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img
          src={product.img || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80'}
          alt={product.title}
          loading="lazy"
          className="w-full h-[200px] object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {/* Category Pill Tag */}
        <div className="absolute top-2.5 right-2.5 bg-[#0d3b66]/90 dark:bg-[#07223b]/95 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs shadow-xs flex items-center gap-1 border border-white/10">
          <span>{product.cat}</span>
        </div>

        {/* Featured or Verified Badge */}
        {product.isSellerVerified && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 border border-emerald-400/30">
            <BadgeCheck className="w-3 h-3 text-emerald-200" />
            <span>تاجر موثق</span>
          </div>
        )}

        {/* Action icons overlay on image */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleShare}
            className="p-1.5 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-white dark:hover:bg-slate-900 shadow-xs transition-colors"
            title="مشاركة الإعلان"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {isOwner && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("هل أنت متأكد من حذف هذا الإعلان؟ لن يتمكن أحد من استرجاعه بعد الحذف.")) {
                  onDelete(product.id);
                }
              }}
              className="p-1.5 bg-red-600/90 text-white rounded-lg hover:bg-red-700 shadow-xs transition-colors"
              title="حذف إعلاني"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Location and Time metadata */}
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
            <span className="flex items-center gap-1 truncate max-w-[60%]" title={displayLocation}>
              <MapPin className="w-3 h-3 text-[#d4af37] shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </span>
            <span 
              className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-medium"
              title={`تاريخ النشر الدقيق: ${exactTimeText}`}
            >
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{relativeTimeText}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-black text-slate-900 dark:text-white text-base line-clamp-1 group-hover:text-[#0d3b66] dark:group-hover:text-[#f4d068] transition-colors mb-2">
            {product.title}
          </h3>

          {/* Advertiser / Seller Name Badge - Prominently Displayed */}
          <div className="flex items-center gap-2 py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700 mb-2.5">
            <div className="w-6 h-6 rounded-full bg-[#0d3b66] dark:bg-[#1a3a60] text-[#d4af37] dark:text-[#f4d068] text-xs flex items-center justify-center font-black shrink-0 shadow-xs">
              {sellerDisplay.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-300 leading-none">صاحب الإعلان:</div>
              <div className="text-xs font-bold text-[#0d3b66] dark:text-[#f4d068] truncate flex items-center gap-1">
                <span>{sellerDisplay}</span>
                {product.isSellerVerified ? (
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" title="عضو موثق في سوق الولي" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 dark:text-slate-200 line-clamp-2 leading-relaxed mb-3">
            {product.desc}
          </p>
        </div>

        {/* Price & Primary CTA */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">السعر المطلوب:</span>
            <div className="text-left flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-[#16a34a] dark:text-emerald-400">
                {product.price ? product.price.toLocaleString('ar-EG') : 'على السوم'}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                {product.currency || 'ج.س'}
              </span>
            </div>
          </div>

          {/* Action Buttons: WhatsApp Button in Green as specified */}
          <div className="grid grid-cols-5 gap-2">
            <a
              id={`whatsappBtn_${product.id}`}
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="col-span-4 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 px-3 rounded-xl shadow-xs hover:shadow-md transition-all text-xs sm:text-sm"
              title="تواصل مع المعلن عبر الواتساب"
            >
              <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
              <span>تواصل واتساب</span>
            </a>

            <a
              id={`callBtn_${product.id}`}
              href={`tel:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="col-span-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl transition-all border border-transparent dark:border-slate-700"
              title="اتصال هاتفي مباشر"
            >
              <Phone className="w-4 h-4 text-[#0d3b66] dark:text-[#f4d068]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
