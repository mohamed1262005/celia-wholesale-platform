import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Category } from '@/types';
import { Package } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { lang, t } = useLanguage();
  const name = lang === 'ar' ? category.name_ar : category.name_en;

  return (
    <Link
      to={`/products?category=${category.id}`}
      className="group relative block bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 relative">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-300">
            <Package className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-3 text-center">
        <h3 className="font-bold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">{name}</h3>
        {category.product_count !== undefined && (
          <p className="text-xs text-gray-400 mt-0.5">
            {t('productsCount', { count: category.product_count })}
          </p>
        )}
      </div>
    </Link>
  );
}