import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useProducts } from '@/hooks/useData';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton, CategoryCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Truck, ShieldCheck, TrendingUp, Sparkles, FolderPlus, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
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
    tagAr: '✨ منصة الجملة للطلب المتميز',
    tagEn: 'Wholesale Platform for Premium Orders ✨',
  },
  {
    id: 2,
    titleAr: 'عروض خاصة على الشوكولاتة والمقرمشات',
    titleEn: 'Special Offers on Chocolate & Snacks',
    subtitleAr: 'وفر أكثر مع أسعار الكميات وتشكيلة واسعة من أشهر البراندات العالمية والمحلية',
    subtitleEn: 'Save more with bulk pricing and a wide selection of top global and local brands',
    image: celiaImg,
    tagAr: 'خصومات الجملة الكبرى 🚀',
    tagEn: 'Major Wholesale Discounts 🚀',
  },
  {
    id: 3,
    titleAr: 'سرعة في التوصيل وضمان الجودة',
    titleEn: 'Fast Delivery & Quality Assured',
    subtitleAr: 'نصلك أينما كنت لتلبية احتياجات متجرك أو نشاطك التجاري بأفضل الأسعار',
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
    return 'https://images.unsplash.com/photo-1553456558-aff6328fae13?w=500&auto=format&fit=crop&q=60';
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden box-border pb-16">
      
      {/* Hero Slider */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-primary-50/80 via-white to-secondary-50/80 py-3 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md bg-white border border-pink-100 group">
            <div className="relative min-h-[380px] sm:min-h-[420px] flex items-center">
              {HERO_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 flex flex-col lg:grid lg:grid-cols-2 gap-4 items-center p-4 sm:p-10 transition-opacity duration-700 ease-in-out ${
                    currentSlide === index ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  {/* النصوص */}
                  <div className="text-center lg:text-start space-y-2.5 sm:space-y-4 z-10 w-full">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-[11px] font-semibold mx-auto lg:mx-0">
                      <Sparkles className="w-3 h-3" />
                      <span>{lang === 'ar' ? slide.tagAr : slide.tagEn}</span>
                    </div>
                    <h1 className="text-lg sm:text-2xl lg:text-4xl font-extrabold text-gray-900 leading-snug">
                      {lang === 'ar' ? slide.titleAr : slide.titleEn}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0 line-clamp-3">
                      {lang === 'ar' ? slide.subtitleAr : slide.subtitleEn}
                    </p>
                    
                    <div className="flex flex-row gap-2 justify-center lg:justify-start pt-1">
                      <Link to="/products" className="flex-1 sm:flex-none">
                        <Button size="sm" className="w-full sm:w-auto text-xs py-2">
                          {t('shopNow')}
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </Button>
                      </Link>
                      <Link to="/categories" className="flex-1 sm:flex-none">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs py-2">
                          {t('browseCatalog')}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* صورة البانر */}
                  <div className="w-full relative px-2 sm:px-0">
                    <div className="relative h-36 sm:h-56 lg:aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-inner bg-gray-50 flex items-center justify-center">
                      <img
                        src={slide.image}
                        alt="Hero Banner"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* أزرار التنقل الجانبية - مخفية على الموبايل وتظهر على الكمبيوتر عند الهوفر */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="absolute start-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              aria-label="Previous Slide"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="absolute end-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md hidden lg:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              aria-label="Next Slide"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>

            {/* نقاط التنقل في الأسفل */}
            <div className="absolute bottom-2.5 inset-x-0 z-20 flex justify-center gap-1.5">
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
          <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto pt-4">
            {[
              { icon: Truck, label: lang === 'ar' ? 'توصيل سريع' : 'Fast Delivery' },
              { icon: ShieldCheck, label: lang === 'ar' ? 'جودة مضمونة' : 'Quality Assured' },
              { icon: TrendingUp, label: lang === 'ar' ? 'أسعار جملة' : 'Wholesale Prices' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center bg-white p-2 rounded-xl border border-gray-100 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-gray-700">{item.label}</span>
              </div>
            ))}
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