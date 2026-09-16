import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useProducts } from '@/hooks/useData';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Input';
import { Search, SlidersHorizontal, X, PackageSearch, ScanLine } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/admin/BarcodeScannerModal';

export function ProductsPage() {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // حالة فتح وإغلاق ماسح الباركود الذكي

  // فلترة التصنيف بقت بالـ id (مضمون دايمًا)، مش بالـ slug اللي ممكن يكون فاسد في بيانات قديمة
  const categoryId = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const availability = (searchParams.get('availability') as 'all' | 'available') || 'all';
  const sort = (searchParams.get('sort') as 'newest' | 'price_low' | 'price_high' | 'name') || 'newest';

  const { categories, loading: catLoading } = useCategories();
  const { products, loading, error } = useProducts({
    categoryId: categoryId || undefined,
    search: search || undefined,
    availability,
    sort,
  });

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  };

  const hasActiveFilters = Boolean(categoryId || search || availability !== 'all');

  const activeCategory = categories.find(c => c.id === categoryId);
  const pageTitle = activeCategory
    ? (lang === 'ar' ? activeCategory.name_ar : activeCategory.name_en)
    : search
    ? t('searchResults', { query: search })
    : t('products');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{pageTitle}</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {t('resultsCount', { count: products.length })}
            </p>
          )}
        </div>

        {/* زر مسح الباركود الذكي (يظهر للأدمن فقط) */}
        {isAdmin && (
          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            <ScanLine className="w-5 h-5" />
            <span>مسح الباركود الذكي ⚡</span>
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters - desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-500" />
              {t('filters')}
            </h3>

            {/* Category filter */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('category')}</label>
              <div className="space-y-1">
                <button
                  onClick={() => updateParam('category', '')}
                  className={`block w-full text-start px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                    !categoryId ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('allCategories')}
                </button>
                {catLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-400">{t('loading')}</div>
                ) : (
                  categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => updateParam('category', cat.id)}
                      className={`block w-full text-start px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                        categoryId === cat.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lang === 'ar' ? cat.name_ar : cat.name_en}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Availability filter */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('availability')}</label>
              <div className="space-y-1">
                {[
                  { value: 'all', label: t('allAvailability') },
                  { value: 'available', label: t('availableOnly') },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateParam('availability', opt.value === 'all' ? '' : opt.value)}
                    className={`block w-full text-start px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                      (availability === opt.value || (opt.value === 'all' && availability === 'all'))
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 text-sm font-semibold text-error-600 hover:bg-error-50 rounded-lg transition-colors cursor-pointer"
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Search + sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute inset-y-0 start-0 ms-3 my-auto w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') updateParam('search', searchInput); }}
                placeholder={t('search')}
                className="w-full ps-9 pe-3 py-2.5 text-sm rounded-xl bg-white border border-gray-200 focus:border-primary-300 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={sort}
                onChange={e => updateParam('sort', e.target.value)}
                className="min-w-[140px]"
              >
                <option value="newest">{t('sortNewest')}</option>
                <option value="price_low">{t('sortPriceLow')}</option>
                <option value="price_high">{t('sortPriceHigh')}</option>
                <option value="name">{t('sortName')}</option>
              </Select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t('filters')}
              </button>
            </div>
          </div>

          {/* Mobile filters */}
          {showFilters && (
            <div className="lg:hidden mb-5 bg-white rounded-2xl border border-gray-100 shadow-card p-5 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">{t('filters')}</h3>
                <button onClick={() => setShowFilters(false)} className="cursor-pointer"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('category')}</label>
              <Select value={categoryId} onChange={e => updateParam('category', e.target.value)} className="mb-4">
                <option value="">{t('allCategories')}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{lang === 'ar' ? cat.name_ar : cat.name_en}</option>
                ))}
              </Select>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('availability')}</label>
              <Select value={availability === 'all' ? '' : availability} onChange={e => updateParam('availability', e.target.value)}>
                <option value="">{t('allAvailability')}</option>
                <option value="available">{t('availableOnly')}</option>
              </Select>
              {hasActiveFilters && (
                <button
                  onClick={() => { clearFilters(); setShowFilters(false); }}
                  className="w-full mt-4 px-3 py-2 text-sm font-semibold text-error-600 hover:bg-error-50 rounded-lg transition-colors cursor-pointer"
                >
                  {t('clearFilters')}
                </button>
              )}
            </div>
          )}

          {/* Products grid */}
          {error ? (
            <ErrorState message={error} onRetry={() => window.location.reload()} />
          ) : loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<PackageSearch className="w-10 h-10" />}
              title={t('noResults')}
              description={t('noResultsDesc')}
              actionLabel={t('clearFilters')}
              onAction={clearFilters}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* مكون الماسح الضوئي الذكي (يظهر للأدمن فقط عند تفعيل الفعالية) */}
      {isAdmin && (
        <BarcodeScannerModal 
          isOpen={isScannerOpen} 
          onClose={() => setIsScannerOpen(false)} 
          onSuccess={(msg) => {
            alert(msg);
            window.location.reload();
          }} 
        />
      )}
    </div>
  );
}

export default ProductsPage;