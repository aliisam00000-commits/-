import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  User, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Moon, 
  Sun, 
  LogOut, 
  CheckCircle2, 
  Save, 
  Share2, 
  Sparkles, 
  Layers,
  MapPin,
  BadgeCheck,
  Smartphone
} from 'lucide-react';
import { UserProfile, AL_WALI_NEIGHBORHOODS } from '../types';
import { updateProfileService, saveActiveUser } from '../services/api';
import { syncUserToFirestore } from '../services/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  userAdsCount?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  darkMode,
  onToggleDarkMode,
  userAdsCount = 0
}) => {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [neighborhood, setNeighborhood] = useState(currentUser?.neighborhood || AL_WALI_NEIGHBORHOODS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setIsSaving(true);
    try {
      const updated = await updateProfileService(currentUser.uid, {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        neighborhood: neighborhood,
        isEmailVerified: currentUser.isEmailVerified,
        isPhoneVerified: currentUser.isPhoneVerified
      });

      // Sync with Firestore as well
      await syncUserToFirestore(updated);
      saveActiveUser(updated);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'تطبيق سوق الولي الإلكتروني',
        text: 'استخدم تطبيق سوق الولي الإلكتروني لبيع وشراء الهواتف والسيارات والأجهزة بدون أي وسيط!',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('تم نسخ رابط تطبيق سوق الولي إلى الحافظة!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#132238] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header with Back Button */}
        <div className="bg-gradient-to-r from-[#0d3b66] via-[#10487d] to-[#0d3b66] p-5 text-white flex items-center justify-between border-b border-[#d4af37]/30">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              title="الرجوع للقائمة الرئيسية"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>الرجوع للرئيسية</span>
            </button>
            <h2 className="text-base sm:text-lg font-black flex items-center gap-1.5">
              <span>الملف الشخصي وإعدادات العضوية</span>
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* User Profile Card */}
          {currentUser && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-amber-50/50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#d4af37] to-amber-400 text-[#0d3b66] font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                {currentUser.displayName ? currentUser.displayName.charAt(0) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                    {currentUser.displayName}
                  </h3>
                  <BadgeCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5" dir="ltr">
                  {currentUser.email || currentUser.phoneNumber || 'عضو موثق'}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                    {currentUser.isEmailVerified ? 'موثق بالإيميل' : 'حساب نشط ومعتمد'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                    {currentUser.neighborhood || 'قرية الولي'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                    <Layers className="w-3 h-3 text-blue-600 dark:text-blue-300" />
                    {userAdsCount} إعلانات
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>تعديل بيانات الحساب والحي السكني</span>
            </h4>

            {savedSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>تم حفظ وتحديث بياناتك بنجاح في قاعدة البيانات وسوق الولي!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                الاسم الظاهر في الإعلانات:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="اسمك أو اسم محلك التجاري"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
                  required
                />
                <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                البريد الإلكتروني:
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
                  dir="ltr"
                />
                <Mail className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                رقم الهاتف للتواصل والواتساب:
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
                  dir="ltr"
                />
                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                الحي في قرية الولي:
              </label>
              <div className="relative">
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pr-10 pl-3 text-xs text-slate-800 dark:text-white outline-none focus:border-[#d4af37]"
                >
                  {AL_WALI_NEIGHBORHOODS.map((nh) => (
                    <option key={nh} value={nh}>
                      {nh}
                    </option>
                  ))}
                </select>
                <MapPin className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-[#0d3b66] dark:bg-[#1a4b7c] hover:bg-[#124b80] dark:hover:bg-[#205890] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-colors text-xs cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جارِ الحفظ والمزامنة...' : 'حفظ التعديلات في الحساب'}</span>
            </button>
          </form>

          {/* Preferences Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              المظهر والتطبيق
            </h4>

            {/* Dark Mode Switcher */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-[#d4af37] dark:text-[#f4d068]">
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    الوضع الليلي (Dark Mode)
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {darkMode ? 'المظهر الليلي مفعل حالياً' : 'المظهر الفاتح مفعل حالياً'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-[#d4af37]' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Share App */}
            <button
              onClick={handleShareApp}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-white">مشاركة تطبيق سوق الولي</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">شارك الرابط مع أصدقائك وتجار السوق</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 rotate-180" />
            </button>
          </div>

          {/* Logout Button */}
          {currentUser && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 text-red-600 dark:text-red-200 rounded-2xl border border-red-200 dark:border-red-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج من الحساب</span>
              </button>
            </div>
          )}

          {/* Footer Back Button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer border border-transparent dark:border-slate-700"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>الرجوع للقائمة الرئيسية</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
