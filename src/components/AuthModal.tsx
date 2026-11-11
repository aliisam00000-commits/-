import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Phone
} from 'lucide-react';
import { UserProfile, AL_WALI_NEIGHBORHOODS } from '../types';
import { 
  loginWithGooglePopup,
  authenticateWithGoogleIdentityServices
} from '../services/firebase';
import { 
  saveActiveUser, 
  directGoogleLoginService
} from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  isGate?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isGate = false
}) => {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(AL_WALI_NEIGHBORHOODS[0]);
  const [phoneInput, setPhoneInput] = useState('');

  // Loading & feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ------------------------------------------------------------------
  // Execute Real Google Account Verification & Login
  // ------------------------------------------------------------------
  const handleGoogleAuthWithOwnershipVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const finalNeighborhood = selectedNeighborhood || 'حي فريق قدام';
    const finalPhone = phoneInput.trim();

    try {
      // 1. Trigger Official Real Google OAuth Ownership Verification
      let verifiedProfile: UserProfile | null = null;

      try {
        verifiedProfile = await authenticateWithGoogleIdentityServices({
          neighborhood: finalNeighborhood,
          phoneNumber: finalPhone || undefined
        });
      } catch (gsiErr: any) {
        console.warn('GSI Token flow notice, trying popup flow:', gsiErr);
        const result = await loginWithGooglePopup({
          neighborhood: finalNeighborhood,
          phoneNumber: finalPhone || undefined
        });
        if (result && result.profile) {
          verifiedProfile = result.profile;
        }
      }

      if (verifiedProfile) {
        // Synchronize with backend
        try {
          await directGoogleLoginService({
            email: verifiedProfile.email || undefined,
            displayName: verifiedProfile.displayName,
            photoURL: verifiedProfile.photoURL || undefined,
            neighborhood: finalNeighborhood,
            phoneNumber: finalPhone || undefined
          });
        } catch (e) {
          console.warn('Sync note:', e);
        }

        saveActiveUser(verifiedProfile);
        setSuccessMsg('تم تسجيل الدخول المباشر بحساب Google بنجاح!');

        setTimeout(() => {
          onLoginSuccess(verifiedProfile!);
          if (onClose) onClose();
          setIsLoading(false);
        }, 400);
        return;
      }
    } catch (authError: any) {
      console.warn('Real Google popup verification error:', authError?.message);

      if (authError?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('تم إغلاق نافذة تسجيل الدخول من Google قبل إكمال تسجيل الدخول.');
      } else if (authError?.code === 'auth/popup-blocked') {
        setErrorMsg('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة لتسجيل الدخول.');
      } else {
        setErrorMsg(authError?.message || 'تعذر إتمام تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div 
      id="auth-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      dir="rtl"
    >
      <div 
        id="auth-modal-card" 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-all"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  سوق الولي الإلكتروني
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  تسجيل الدخول المباشر
                </p>
              </div>
            </div>

            {!isGate && onClose && (
              <button
                id="close-auth-modal-btn"
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {errorMsg && (
            <div id="auth-error-alert" className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div id="auth-success-alert" className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* Neighborhood & Contact info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الحي في قرية الولي <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="google-neighborhood-select"
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:text-white transition-all appearance-none cursor-pointer font-medium"
                >
                  {AL_WALI_NEIGHBORHOODS.map((nh) => (
                    <option key={nh} value={nh}>
                      {nh}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم الهاتف (اختياري)
              </label>
              <div className="relative">
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="google-phone-input"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:text-white transition-all text-left dir-ltr"
                />
              </div>
            </div>
          </div>

          {/* Direct 1-Click Real Google Sign-in Button with Ownership Verification */}
          <button
            id="direct-google-auth-btn"
            type="button"
            onClick={() => handleGoogleAuthWithOwnershipVerification()}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border-2 border-slate-300 dark:border-slate-600 font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-all disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
              </svg>
            )}
            <span>تسجيل الدخول المباشر بقوقل</span>
          </button>
        </div>

        {/* Clean Footer */}
        <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center text-[11px] text-slate-500 dark:text-slate-400">
          <span>سوق الولي الإلكتروني - قرية الولي</span>
        </div>
      </div>
    </div>
  );
};
