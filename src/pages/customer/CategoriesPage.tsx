import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories } from '@/hooks/useData';
import { CategoryCard } from '@/components/CategoryCard';
import { CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Category } from '@/types';

export function CategoriesPage() {
  const { t } = useLanguage();
  const { categories, loading } = useCategories();
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<Category[]>([]);

  useEffect(() => {
    if (categories.length === 0) return;
    (async () => {
      const updated = await Promise.all(
        categories.map(async cat => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .eq('status', 'active');
          return { ...cat, product_count: count || 0 };
        })
      );
      setCategoriesWithCounts(updated);
    })();
  }, [categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{t('categories')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('shopByCategory')}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categoriesWithCounts.length > 0
            ? categoriesWithCounts.map(cat => <CategoryCard key={cat.id} category={cat} />)
            : categories.map(cat => <CategoryCard key={cat.id} category={cat} />)}
        </div>
      )}
    </div>
  );
}
