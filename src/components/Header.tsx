import React, { useEffect, useState } from 'react';
import {
  Search,
  Sun,
  Moon,
  User,
  LogOut,
  X,
  Download
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  onOpenProfile,
  currentUser,
  onLogout,
  searchQuery,
  onSearchChange
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header
      id="mainHeader"
      className="bg-[#0d3b66] dark:bg-[#081422] text-white border-b border-[#d4af37]/30 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-12 flex items-center justify-between gap-2 sm:gap-4">
        {/* Compact Logo & Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <img
            src="/assets/aistudio/Screenshot_____-__-__-__-__-__-___a23b203fd3aafc6dcb84e438dda678b6_ad4492b0.jpg"
            alt="Elwali"
            className="w-8 h-8 rounded-lg object-cover border border-[#d4af37]/50 shadow-2xs"
          />
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
            سوق الولي
          </h1>
        </div>

        {/* Compact Search Box - Icon only, no "بحث" text */}
        <div className="flex-1 max-w-xs sm:max-w-md">
          <div className="relative">
            <input
              id="mainSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="بحث"
              className="w-full bg-white/10 border border-[#d4af37]/30 focus:border-[#d4af37] rounded-xl py-1 pr-8 pl-7 text-xs text-white focus:outline-none transition-colors"
            />
            <Search className="absolute right-2.5 top-1.5 w-3.5 h-3.5 text-[#d4af37] pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute left-2 top-1.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#d4af37] hover:bg-[#f4d068] text-[#0d3b66] font-bold text-[11px] transition-colors cursor-pointer"
              title="ثبّت التطبيق"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ثبّت التطبيق</span>
            </button>
          )}
          <button
            onClick={onToggleDarkMode}
            id="headerThemeToggle"
            aria-label="تبديل المظهر"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenProfile}
                id="headerProfileBtn"
                className="flex items-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
                title="الحساب"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                  {currentUser.displayName ? currentUser.displayName.charAt(0) : 'U'}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">
                  {currentUser.displayName}
                </span>
              </button>

              <button
                onClick={onLogout}
                title="خروج"
                aria-label="تسجيل الخروج"
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              id="headerLoginBtn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>دخول</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
