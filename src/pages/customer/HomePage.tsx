import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useProducts } from '@/hooks/useData';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton, CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Truck, ShieldCheck, TrendingUp, Sparkles, FolderPlus, ShoppingCart, LayoutGrid } from 'lucide-react';
import celiaImg from '../../celia.jpeg';

export function HomePage() {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const { categories, loading: catLoading } = useCategories();
  const { products, loading: prodLoading } = useProducts({ sort: 'newest' });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const featuredProducts = products.slice(0, 8);
  const popularProducts = products.slice(4, 12);
  const topCategories = categories.slice(0, 8);

  const getCategoryDefaultImage = (name: string) => {
    if (!name) return 'https://images.unsplash.com/photo-1553456558-aff6328fae13?w=500&auto=format&fit=crop&q=60';
    if (name.includes('حلويات') || name.includes('شوكولاتة') || name.includes('Sweets') || name.includes('Chocolate')) {
      return 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('مقرمشات') || name.includes('تسالي') || name.includes('Snacks')) {
      return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60';
    }
    if (name.includes('مشروبات') || name.includes('طاقة') || name.includes('Energy') || name.includes('Drinks')) {
      return 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&auto=format&fit=crop&q=60';
    }
    return 'https://images.unsplash.com/photo-1553456558-aff6328fae13?w=500&auto=format&fit=crop&q=60';
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border pb-16">
      
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-white py-3 sm:py-5">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-pink-100 p-4 sm:p-6 shadow-xs flex flex-col gap-4">
            
            {/* 1. صورة البانر كاملة بدون قص */}
            <div className="w-full relative rounded-2xl overflow-hidden bg-pink-50/20 border border-pink-100 flex items-center justify-center p-1">
              <img
                src={celiaImg}
                alt="Celia Premium Sweets Banner"
                className="w-full h-auto max-h-[340px] object-contain rounded-xl"
              />
            </div>

            {/* المحتوى النصي والأزرار */}
            <div className="text-center space-y-3">
              
              {/* 2. شريط توضيحي */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-primary-600 text-xs font-bold mx-auto shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                <span>{lang === 'ar' ? 'منصة الجملة للطلب المتميز' : 'Wholesale Platform for Premium Orders'}</span>
              </div>

              {/* 3. عنوان رئيسي واضح */}
              <h1 className="text-xl sm:text-3xl font-black text-gray-900 leading-tight">
                {lang === 'ar' ? 'حلويات متميزة، طلبات الجملة بكل سهولة' : 'Premium Sweets, Wholesale Orders Made Easy'}
              </h1>

              {/* 4. وصف مختصر */}
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
                {lang === 'ar' ? 'اطلب الحلويات عالية الجودة بأسعار جملة تنافسية، مخزون فوري، وتوصيل سريع على مستوى مصر.' : 'Order top-quality sweets at competitive wholesale prices, instant stock, and fast delivery.'}
              </p>
              
              {/* 5 & 6. الأزرار الأساسية والثانوية */}
              <div className="flex flex-col gap-2.5 max-w-md mx-auto pt-2">
                <Link to="/products" className="w-full">
                  <Button size="default" className="w-full text-xs sm:text-sm py-3 shadow-md rounded-xl font-bold flex items-center justify-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>تسوق الآن</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </Link>
                <Link to="/categories" className="w-full">
                  <Button size="default" variant="outline" className="w-full text-xs sm:text-sm py-3 rounded-xl font-bold border-pink-200 text-gray-700 hover:bg-pink-50/50 flex items-center justify-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary-600" />
                    <span>تصفح الكتالوج</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* شريط الكروت الحية التفاعلية (بدون رسائل، حركات انسيابية احترافية) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-pink-50">
              
              {/* الكارت 1: توصيل سريع */}
              <div className="group relative flex flex-col items-center gap-1.5 text-center bg-pink-50/60 hover:bg-pink-100/80 p-3 rounded-2xl border border-pink-100/80 shadow-2xs cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg active:scale-95">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-gray-800">{lang === 'ar' ? 'توصيل سريع' : 'Fast Delivery'}</span>
              </div>

              {/* الكارت 2: جودة مضمونة */}
              <div className="group relative flex flex-col items-center gap-1.5 text-center bg-pink-50/60 hover:bg-pink-100/80 p-3 rounded-2xl border border-pink-100/80 shadow-2xs cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg active:scale-95">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-cyan-500 shadow-xs group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-gray-800">{lang === 'ar' ? 'جودة مضمونة' : 'Quality Assured'}</span>
              </div>

              {/* الكارت 3: أسعار جملة */}
              <div className="group relative flex flex-col items-center gap-1.5 text-center bg-pink-50/60 hover:bg-pink-100/80 p-3 rounded-2xl border border-pink-100/80 shadow-2xs cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg active:scale-95">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-xs group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-gray-800">{lang === 'ar' ? 'أسعار جملة' : 'Wholesale Prices'}</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 my-2 bg-gradient-to-r from-primary-50/30 to-pink-50/20 rounded-2xl border border-pink-100/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900">{t('featuredCategories')}</h2>
            <p className="text-[11px] text-gray-500">{t('shopByCategory')}</p>
          </div>
          <Link to="/categories" className="text-xs font-semibold text-primary-600 flex items-center gap-1">
            {t('viewAll')}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {catLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
          </div>
        ) : topCategories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-pink-100 p-6 text-center space-y-3">
            <FolderPlus className="w-8 h-8 text-primary-500 mx-auto" />
            <p className="text-xs font-bold text-gray-800">لا توجد تصنيفات مميزة مضافة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {topCategories.map((cat) => {
              const catName = cat.name_ar || cat.name || '';
              const bgImage = cat.image_url || getCategoryDefaultImage(catName);
              
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.id}`}
                  className="group relative h-32 sm:h-40 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-pink-100 bg-white flex flex-col justify-end p-2.5"
                >
                  <img
                    src={bgImage}
                    alt={catName}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 text-center">
                    <h3 className="text-white font-extrabold text-xs sm:text-sm drop-shadow-sm line-clamp-1">
                      {lang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name)}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900">{t('featuredProducts')}</h2>
            <p className="text-[11px] text-gray-500">{t('shopByCategory')}</p>
          </div>
          <Link to="/products" className="text-xs font-semibold text-primary-600 flex items-center gap-1">
            {t('viewAll')}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {prodLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 to-primary-700 p-5 sm:p-8 shadow-md text-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-start">
            <h3 className="text-base sm:text-xl font-extrabold">
              {lang === 'ar' ? 'كلما طلبت أكثر، وفرت أكثر' : 'Order More, Save More'}
            </h3>
            <p className="mt-1 text-primary-100 text-[11px] sm:text-xs">
              {lang === 'ar' ? 'أسعار متدرجة حسب الكمية — كلما زاد طلبك، انخفض سعر الوحدة' : 'Quantity-based pricing for wholesale'}
            </p>
          </div>
          <Link to="/products" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-5 py-2.5 bg-white text-primary-600 rounded-xl font-bold text-xs shadow hover:bg-gray-50 transition cursor-pointer">
              {t('shopNow')}
            </button>
          </Link>
        </div>
      </section>

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900">{t('popularProducts')}</h2>
            <Link to="/products" className="text-xs font-semibold text-primary-600 flex items-center gap-1">
              {t('viewAll')}
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {popularProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;