import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  ShoppingBag, 
  Sparkles, 
  ArrowUpDown, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  MessageCircle,
  HelpCircle,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  ShieldCheck,
  Phone,
  Tag,
  User,
  UserCircle
} from 'lucide-react';
import { CategoryType, Product, UserProfile } from './types';
import { Header } from './components/Header';
import { CategoriesBar } from './components/CategoriesBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AddProductModal } from './components/AddProductModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { 
  subscribeToOnlineProducts, 
  getSavedUser, 
  saveActiveUser, 
  deleteOnlineProduct 
} from './services/api';
import { auth, signOut } from './services/firebase';

export default function App() {
  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('souq_alwali_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // User State (Persistent session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getSavedUser());

  // Products State from Central Database
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'price_low' | 'price_high'>('latest');

  // Modals State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sync Dark Mode with Document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('souq_alwali_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('souq_alwali_theme', 'light');
    }
  }, [darkMode]);

  // Subscribe to real-time products from Central Online Database
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToOnlineProducts((updatedProducts) => {
      setProducts(updatedProducts);
      setIsLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // MOBILE HARDWARE BACK BUTTON & BROWSER NAVIGATION (POPSTATE)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (selectedProduct) {
        setSelectedProduct(null);
        return;
      }
      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        return;
      }
      if (isProfileOpen) {
        setIsProfileOpen(false);
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return;
      }
      if (selectedCategory !== 'الكل') {
        setSelectedCategory('الكل');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProduct, isAddModalOpen, isProfileOpen, isAuthModalOpen, selectedCategory]);

  // Helper to push history state when opening a modal
  const openModalWithHistory = useCallback((modalType: string, callback: () => void) => {
    try {
      window.history.pushState({ modal: modalType }, '');
    } catch (e) {}
    callback();
  }, []);

  const handleSelectProduct = (prod: Product) => {
    openModalWithHistory('productDetail', () => setSelectedProduct(prod));
  };

  const handleOpenAddModal = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    openModalWithHistory('addModal', () => setIsAddModalOpen(true));
  };

  const handleOpenProfile = () => {
    openModalWithHistory('profileModal', () => setIsProfileOpen(true));
  };

  const handleToggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout error', e);
    }
    saveActiveUser(null);
    setCurrentUser(null);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteOnlineProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  };

  // Category counts calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'الكل': products.length };
    products.forEach((p) => {
      counts[p.cat] = (counts[p.cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // User's own ads count
  const userAdsCount = useMemo(() => {
    if (!currentUser) return 0;
    return products.filter(p => p.uid === currentUser.uid || p.sellerName === currentUser.displayName).length;
  }, [products, currentUser]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (selectedCategory !== 'الكل' && p.cat !== selectedCategory) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = p.title?.toLowerCase().includes(query);
        const descMatch = p.desc?.toLowerCase().includes(query);
        const catMatch = p.cat?.toLowerCase().includes(query);
        const locMatch = p.location?.toLowerCase().includes(query);
        const sellerMatch = p.sellerName?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !catMatch && !locMatch && !sellerMatch) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_low') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_high') {
        return (b.price || 0) - (a.price || 0);
      }
      // Latest by default
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // ------------------------------------------------------------------
  // MANDATORY LOGIN GATE (WHEN NOT AUTHENTICATED)
  // ------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          isGate={true}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      </div>
    );
  }

  return (
    <div id="appPage" className="min-h-screen flex flex-col bg-transparent text-slate-800 dark:text-slate-100 transition-colors duration-300 relative">
      {/* Fixed Full-Page Background - Clearly visible with cool, calm tone */}
      <div
        className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat saturate-[0.8] brightness-[0.95]"
        style={{ backgroundImage: "url('/assets/aistudio/file_00000000baa88211b721a7feedb079a5_0acf15d6.png')" }}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 -z-10 bg-sky-950/15 dark:bg-slate-950/45"
        aria-hidden="true"
      />

      {/* Unified Sticky Top Bars (Header + Categories + Compact Info Strip) */}
      <div className="sticky top-0 z-40 shadow-md">
        <Header
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenProfile={handleOpenProfile}
          currentUser={currentUser}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <CategoriesBar
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            try {
              window.history.pushState({ category: cat }, '');
            } catch (e) {}
          }}
          categoryCounts={categoryCounts}
        />

        {/* Compact Welcome & Info Strip */}
        <div className="bg-[#0d3b66]/95 dark:bg-[#081422]/95 backdrop-blur-md border-b border-[#d4af37]/30 py-1.5 px-3 text-white">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-[11px] sm:text-xs">
            <span className="font-semibold text-[#f4d068]">
              سوق الولي الإلكتروني — البيع المباشر من دون وسيط
            </span>
            <span className="flex items-center gap-1 bg-white/15 text-[#f4d068] font-bold px-2.5 py-0.5 rounded-lg text-[11px] shrink-0">
              <UserCircle className="w-3 h-3" />
              <span>{currentUser.displayName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8">
        
        {/* Section Header with controls & Back button if filtered */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 px-4 py-3 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Back Button if in category or search */}
            {(selectedCategory !== 'الكل' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('الكل');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="الرجوع للقائمة الرئيسية"
              >
                <ArrowRight className="w-4 h-4 ml-0.5" />
                <span>الرجوع للرئيسية</span>
              </button>
            )}

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{selectedCategory === 'الكل' ? 'جميع الإعلانات والمنتجات المعروضة' : `إعلانات قسم ${selectedCategory}`}</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                {filteredProducts.length} إعلان
              </span>
            </h2>

            {searchQuery && (
              <p className="text-xs text-[#0d3b66] dark:text-[#f4d068] font-bold">
                (نتائج البحث عن: "{searchQuery}")
              </p>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
              الترتيب:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white dark:bg-[#132238] border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 outline-none focus:border-[#d4af37]"
            >
              <option value="latest">الأحدث إعلاناً</option>
              <option value="price_low">السعر: من الأقل للأعلى</option>
              <option value="price_high">السعر: من الأعلى للأقل</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white dark:bg-[#132238] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="w-full h-[200px] bg-slate-200 dark:bg-slate-700 rounded-xl mb-3"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-3"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onSelect={handleSelectProduct}
                currentUser={currentUser}
                onDelete={handleDeleteProduct}
              />
            ))}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="text-center py-16 px-4 bg-white dark:bg-[#132238] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-[#d4af37] flex items-center justify-center mx-auto mb-4 text-3xl shadow-xs">
              <span>🛒</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              {selectedCategory !== 'الكل' ? `لا توجد إعلانات في قسم "${selectedCategory}" حالياً` : 'لا توجد إعلانات معروضة حالياً'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6">
              سوق الولي جاهز لاستقبال إعلاناتكم الجديدة، انشر إعلانك الآن وسيظهر مباشرة لجميع أهالي القرية والمشترين!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#d4af37] to-amber-500 text-[#0d3b66] hover:brightness-105 shadow cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>أضف أول إعلان الآن مجاناً</span>
              </button>
              {selectedCategory !== 'الكل' && (
                <button
                  onClick={() => {
                    setSelectedCategory('الكل');
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  <span>عرض كل الأقسام</span>
                </button>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Primary Fixed Circular Floating Action Button (FAB +) */}
      <button
        id="fabAddListingBtn"
        onClick={handleOpenAddModal}
        aria-label="إضافة إعلان جديد"
        title="أضف إعلانك في سوق الولي"
        className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#d4af37] via-amber-400 to-[#d4af37] text-[#0d3b66] shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border-2 border-white dark:border-slate-800 group"
      >
        <Plus className="w-8 h-8 stroke-[3.5] group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Footer */}
      <footer className="bg-[#07223b] dark:bg-[#050d18] text-slate-400 text-xs py-8 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🛒</span>
                <span className="font-black text-white text-base">سوق الولي الإلكتروني</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                منصة الإعلانات الشاملة والتواصل المباشر مع أصحاب الإعلانات عبر الواتساب والاتصال الهاتفي الفوري بدون أي وسيط أو عمولة.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-2.5">الأقسام الأكثر طلباً</h4>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button onClick={() => setSelectedCategory('الهواتف')} className="text-right hover:text-[#d4af37] transition-colors cursor-pointer">📱 الهواتف والملحقات</button>
                <button onClick={() => setSelectedCategory('السيارات')} className="text-right hover:text-[#d4af37] transition-colors cursor-pointer">🚗 السيارات والمركبات</button>
                <button onClick={() => setSelectedCategory('الأجهزة والإلكترونيات')} className="text-right hover:text-[#d4af37] transition-colors cursor-pointer">💻 أجهزة ولابتوبات</button>
                <button onClick={() => setSelectedCategory('البيت والأثاث')} className="text-right hover:text-[#d4af37] transition-colors cursor-pointer">🛋️ أثاث ومفروشات</button>
              </div>
            </div>
          </div>

          <div className="pt-4 text-center text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} سوق الولي الإلكتروني - جميع الحقوق محفوظة</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        currentUser={currentUser}
        onDelete={handleDeleteProduct}
        onProductUpdated={(updatedProduct) => {
          setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
          setSelectedProduct(updatedProduct);
        }}
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentUser={currentUser}
        onProductCreated={(newP) => {
          setProducts(prev => [newP, ...prev]);
        }}
        onOpenAuth={() => {
          setIsAddModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          saveActiveUser(user);
          setIsAuthModalOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        userAdsCount={userAdsCount}
      />

    </div>
  );
}
