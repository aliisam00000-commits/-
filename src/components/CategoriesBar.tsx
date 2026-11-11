import React from 'react';
import { 
  Sparkles, 
  Smartphone, 
  Car, 
  Tv, 
  Sofa, 
  Trees, 
  Wrench, 
  Shirt, 
  Building2, 
  Grid,
  Filter,
  ArrowRight
} from 'lucide-react';
import { CategoryType } from '../types';

interface CategoriesBarProps {
  selectedCategory: CategoryType;
  onSelectCategory: (cat: CategoryType) => void;
  categoryCounts: Record<string, number>;
}

const CATEGORIES: { id: CategoryType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'الكل', label: 'الكل (الرئيسية)', icon: Sparkles },
  { id: 'الهواتف', label: 'الهواتف', icon: Smartphone },
  { id: 'السيارات', label: 'السيارات', icon: Car },
  { id: 'الأجهزة والإلكترونيات', label: 'الإلكترونيات', icon: Tv },
  { id: 'البيت والأثاث', label: 'البيت والأثاث', icon: Sofa },
  { id: 'المواشي والزراعة', label: 'المواشي والزراعة', icon: Trees },
  { id: 'خدمات', label: 'خدمات', icon: Wrench },
  { id: 'ملابس', label: 'ملابس', icon: Shirt },
  { id: 'عقارات', label: 'عقارات', icon: Building2 },
  { id: 'أخرى', label: 'أخرى', icon: Grid },
];

export const CategoriesBar: React.FC<CategoriesBarProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts
}) => {
  return (
    <div className="bg-[#0a2e52] dark:bg-[#06101c] border-b border-[#d4af37]/25 py-1.5 px-3 transition-colors">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                id={`catBtn_${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0d3b66] dark:bg-[#d4af37] text-white dark:text-[#0b1523] shadow-md shadow-[#0d3b66]/20 transform scale-[1.02]'
                    : 'bg-slate-100 dark:bg-[#15253d] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1e3454] border border-transparent hover:border-slate-300 dark:border-slate-700/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#d4af37] dark:text-[#0b1523]' : 'text-slate-500 dark:text-slate-300'}`} />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-[#0b1523]'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
