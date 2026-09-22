import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useProducts } from '@/hooks/useData';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton, CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Truck, ShieldCheck, Package, TrendingUp, Sparkles, FolderPlus, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import celiaImg from '../../celia.png';
import secondImg from '../../images.jpeg';
import orderImg from '../../order.jpeg';
const HERO_SLIDES = [
  {
    id: 1,
    titleAr: 'حلويات متميزة، طلبات الجملة بكل سهولة',
    titleEn: 'Premium Sweets, Wholesale Orders Made Easy',
    subtitleAr: 'اطلب الحلويات عالية الجودة بأسعار جملة تنافسية، أسعار حسب الكمية، مخزون فوري، وتوصيل سريع',
    subtitleEn: 'Order top-quality sweets at competitive wholesale prices, instant stock, and fast delivery',
    image: secondImg,
    tagAr: '✨منصة الجملة للطلب المتميز ',
    tagEn: 'Wholesale Platform for Premium Orders ✨',
  },
  {
    id: 2,
    titleAr: 'عروض خاصة على الشوكولاتةوالمقرمشات',
    titleEn: 'Special Offers on Chocolate & Snacks',
    subtitleAr: 'وفر أكثر مع أسعار الكميات وتشكيلة واسعة من أشهر البراندات العالمية والمحلية',
    subtitleEn: 'Save more with bulk pricing and a wide selection of top global and local brands',
     image: celiaImg,
    tagAr: 'خصومات الجملةالكبرى 🚀',
    tagEn: 'Major Wholesale Discounts 🚀',
  },
  {
    id: 3,
    titleAr: 'سرعة في التوصيل وضمان الجودة',
    titleEn: 'Fast Delivery & Quality Assured',
    subtitleAr: 'نصلك أينما كنت لتربية احتياجات متجرك أو نشاطك التجاري بأفضل الأسعار',
    subtitleEn: 'Delivering wherever you are to meet your store or business needs at best prices',
    image: orderImg, 
    tagAr: 'خدمة موثوقة ومضمونة 🛡️',
    tagEn: 'Trusted & Reliable Service 🛡️',
  },
];

export function HomePage() {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const { categories, loading: catLoading } = useCategories();
  const { products, loading: prodLoading } = useProducts({ sort: 'newest' });

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
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
    if (name.includes('عامة') || name.includes('General') || name.includes('أصناف')) {
      return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60';
    }
    return 'https://images.unsplash.com/photo-1553456558-aff6328fae13?w=500&auto=format&fit=crop&q=60';
  };

  return (
    <div className="relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -start-32 w-72 h-72 sm:w-96 sm:h-96 bg-primary-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-2/3 -end-32 w-72 h-72 sm:w-96 sm:h-96 bg-pink-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      </div>

      {/* Hero Slider المتحرك والمتجاوب تماماً مع الموبايل */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50/80 via-white to-secondary-50/80">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 start-10 sm:start-20 w-56 h-56 sm:w-72 sm:h-72 bg-primary-200 rounded-full blur-3xl" />
          <div className="absolute bottom-10 end-10 sm:end-20 w-72 h-72 sm:w-96 sm:h-96 bg-secondary-200 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10 lg:py-16">
          <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white border border-pink-100">
            <div className="relative min-h-[420px] sm:min-h-[420px] lg:min-h-[460px] flex items-center">
              {HERO_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 flex flex-col-reverse lg:grid lg:grid-cols-2 gap-4 sm:gap-8 items-center p-4 sm:p-10 lg:p-14 transition-opacity duration-700 ease-in-out ${
                    currentSlide === index ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* النصوص */}
                  <div className="text-center lg:text-start space-y-3 sm:space-y-6 z-10 w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-[11px] sm:text-xs font-semibold mx-auto lg:mx-0">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {lang === 'ar' ? slide.tagAr : slide.tagEn}
                    </div>
                    <h1 className="text-xl sm:text-3xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                      {lang === 'ar' ? slide.titleAr : slide.titleEn}
                    </h1>
                    <p className="text-xs sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                      {lang === 'ar' ? slide.subtitleAr : slide.subtitleEn}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start pt-1">
                      <Link to="/products" className="w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto group">
                          {t('shopNow')}
                          <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                      <Link to="/categories" className="w-full sm:w-auto">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto">
                          {t('browseCatalog')}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* صورة البانر (تظهر الآن بوضوح تام على الموبايل والكمبيوتر) */}
                  <div className="w-full lg:block relative">
                    <div className="relative h-40 sm:h-64 lg:aspect-square rounded-2xl sm:rounded-3xl overflow-hidden shadow-md">
                      <img
                        src={slide.image}
                        alt="Hero Banner"
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* أزرار التنقل يمين ويسار */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="absolute start-2 top-[35%] sm:top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition-all cursor-pointer"
              aria-label="Previous Slide"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="absolute end-2 top-[35%] sm:top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md flex items-center justify-center transition-all cursor-pointer"
              aria-label="Next Slide"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>

            {/* نقاط التنقل */}
            <div className="absolute bottom-2 inset-x-0 z-20 flex justify-center gap-1.5">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentSlide === idx ? 'w-5 bg-primary-600' : 'w-1.5 bg-gray-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto pt-6">
            {[
              { icon: Truck, label: lang === 'ar' ? 'توصيل سريع' : 'Fast Delivery' },
              { icon: ShieldCheck, label: lang === 'ar' ? 'جودة مضمونة' : 'Quality Assured' },
              { icon: TrendingUp, label: lang === 'ar' ? 'أسعار جملة' : 'Wholesale Prices' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-gray-700">{item.label}</span>
              </div>
            ))}
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