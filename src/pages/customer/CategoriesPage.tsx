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
    let isMounted = true;
    if (!categories || categories.length === 0) return;

    async function fetchCounts() {
      try {
        // طلب واحد بيرجع كل الـ counts مع بعض بدل ما نعمل query لكل category
        const { data, error } = await supabase.rpc('get_category_product_counts');

        if (error) throw error;

        const countMap = new Map<string, number>(
          (data || []).map((row: { category_id: string; product_count: number }) => [
            row.category_id,
            row.product_count,
          ])
        );

        if (isMounted) {
          setCategoriesWithCounts(
            categories.map((cat) => ({
              ...cat,
              product_count: countMap.get(cat.id) || 0,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching category counts:', err);
        // في حالة فشل الـ RPC، على الأقل نعرض التصنيفات من غير counts بدل ما الصفحة تفضل فاضية
        if (isMounted) {
          setCategoriesWithCounts(categories.map((cat) => ({ ...cat, product_count: 0 })));
        }
      }
    }

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [categories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{t('categories')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('shopByCategory')}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categoriesWithCounts.length > 0
            ? categoriesWithCounts.map((cat) => <CategoryCard key={cat.id} category={cat} />)
            : categories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
        </div>
      )}
    </div>
  );
}