import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useProducts } from '@/hooks/useData';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton, CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Truck, ShieldCheck, Package, TrendingUp, Sparkles, FolderPlus, LayoutDashboard } from 'lucide-react';

export function HomePage() {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const { categories, loading: catLoading } = useCategories();
  const { products, loading: prodLoading } = useProducts({ sort: 'newest' });

  // إجبار الصفحة الرئيسية على البدء من أعلى عند فتحها
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const featuredProducts = products.slice(0, 8);
  const popularProducts = products.slice(4, 12);
  const topCategories = categories.slice(0, 8);

  // دالة الصور المحدثة بروابط حقيقية ومضمونة 100% لمشروبات الطاقة والأصناف العامة
  const getCategoryDefaultImage = (name: string) => {
    if (!name) return 'https://images.unsplash.com/photo-1553456558-aff6328fae13?w=500&auto=format&fit=crop&q=60';
    
    // حلويات وشوكولاتة
    if (name.includes('حلويات') || name.includes('شوكولاتة') || name.includes('Sweets') || name.includes('Chocolate')) {
      return 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=500&auto=format&fit=crop&q=60';
    }
    // مقرمشات وتسالي
    if (name.includes('مقرمشات') || name.includes('تسالي') || name.includes('Snacks')) {
      return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60';
    }
    // مشروبات طاقة (صورة علب طاقة حقيقية من الإنترنت)
    if (name.includes('مشروبات') || name.includes('طاقة') || name.includes('Energy') || name.includes('Drinks')) {
      return 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&auto=format&fit=crop&q=60';
    }
    // أصناف عامة (صورة متجر أو سلع عامة من الإنترنت)
    if (name.includes('عامة') || name.includes('General') || name.includes('أصناف')) {
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60';
    }
    
    return 'https://images.unsplash.com/photo-1553456558-aff6328fae13?w=500&auto=format&fit=crop&q=60';
  };

  return (
    <div className="relative overflow-x-hidden">
      {/* خلفية عامة متحركة بتدرجات وردية ناعمة */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -start-32 w-72 h-72 sm:w-96 sm:h-96 bg-primary-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-2/3 -end-32 w-72 h-72 sm:w-96 sm:h-96 bg-pink-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50/80 via-white to-secondary-50/80">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 start-10 sm:start-20 w-56 h-56 sm:w-72 sm:h-72 bg-primary-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 end-10 sm:end-20 w-72 h-72 sm:w-96 sm:h-96 bg-secondary-200 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:text-start space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold animate-fade-in mx-auto lg:mx-0">
                <Sparkles className="w-3.5 h-3.5" />
                {t('brandTagline')}
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                {t('heroTitle')}
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t('heroSubtitle')}
              </p>
              
              {/* Buttons Group */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                <Link to="/products" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto group">
                    {t('shopNow')}
                    <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/categories" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    {t('browseCatalog')}
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto lg:mx-0 pt-4 border-t border-gray-100/80">
                {[
                  { icon: Truck, label: lang === 'ar' ? 'توصيل سريع' : 'Fast Delivery' },
                  { icon: ShieldCheck, label: lang === 'ar' ? 'جودة مضمونة' : 'Quality Assured' },
                  { icon: TrendingUp, label: lang === 'ar' ? 'أسعار جملة' : 'Wholesale Prices' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center lg:items-start gap-1.5 text-center lg:text-start">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary-500 border border-gray-100 flex-shrink-0">
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="hidden lg:block relative">
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-float">
                <img
                  src="https://images.pexels.com/photos/37857736/pexels-photo-37857736.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Celia Premium Sweets"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-4 start-4 bg-white rounded-2xl shadow-float p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary-50 flex items-center justify-center text-secondary-600">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{products.length}+</p>
                  <p className="text-xs text-gray-500">{t('products')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 my-4 sm:my-6 bg-gradient-to-r from-primary-50/40 via-pink-50/20 to-primary-50/40 rounded-2xl sm:rounded-3xl border border-pink-100/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">{t('featuredCategories')}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('shopByCategory')}</p>
          </div>
          <Link to="/categories" className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0">
            {t('viewAll')}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        {catLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
          </div>
        ) : topCategories.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-pink-100 shadow-card p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto animate-bounce">
              <FolderPlus className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900">لا توجد تصنيفات مميزة مضافة حالياً</h3>
              <p className="text-xs text-gray-500 mt-1">ابدأ بإضافة تصنيفات جديدة لترتيب منتجاتك وعرضها للعملاء بكل احترافية</p>
            </div>
            {isAdmin && (
              <div className="pt-2">
                <Link to="/admin">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl sm:rounded-2xl text-xs font-bold shadow-md transition-all cursor-pointer">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>إدارة ووصف التصنيفات (لوحة التحكم)</span>
                  </button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {topCategories.map((cat) => {
              const catName = cat.name_ar || cat.name || '';
              const bgImage = cat.image_url || getCategoryDefaultImage(catName);
              
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.id}`}
                  className="group relative h-36 sm:h-44 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-pink-100/60 bg-white flex flex-col justify-end p-3 sm:p-4"
                >
                  <img
                    src={bgImage}
                    alt={catName}
                    className="absolute inset-0 w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="relative z-10 text-center">
                    <h3 className="text-white font-extrabold text-xs sm:text-base drop-shadow-md line-clamp-1">
                      {lang === 'ar' ? (cat.name_ar || cat.name) : (cat.name_en || cat.name)}
                    </h3>
                    <span className="text-[10px] text-pink-200 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:inline-block mt-0.5">
                      تصفح المنتجات ✨
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">{t('featuredProducts')}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('shopByCategory')}</p>
          </div>
          <Link to="/products" className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0">
            {t('viewAll')}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>

        {prodLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary-500 to-primary-700 p-6 sm:p-8 lg:p-12 shadow-xl">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 end-0 w-64 h-64 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-start">
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">
                {lang === 'ar' ? 'كلما طلبت أكثر، وفرت أكثر' : 'Order More, Save More'}
              </h3>
              <p className="mt-2 text-primary-100 text-xs sm:text-sm lg:text-base max-w-lg leading-relaxed">
                {lang === 'ar'
                  ? 'أسعار متدرجة حسب الكمية — كلما زاد طلبك، انخفض سعر الوحدة'
                  : 'Quantity-based pricing — the more you order, the lower your unit price'}
              </p>
            </div>
            <Link to="/products" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-primary-600 hover:bg-gray-50 rounded-xl sm:rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer">
                <span>{t('shopNow')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">{t('popularProducts')}</h2>
            <Link to="/products" className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 flex-shrink-0">
              {t('viewAll')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {popularProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export default HomePage;