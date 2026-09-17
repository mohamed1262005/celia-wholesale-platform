import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProduct, useProducts } from '@/hooks/useData';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { getPricingForQuantity, getAvailableStock, getStockStatus, formatPrice } from '@/lib/pricing';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingBag, Package, Check, Truck, ShieldCheck } from 'lucide-react';
import type { Product } from '@/types';

// يرجع مصفوفة الصور: يفضّل image_urls (متعدد) لو موجود، وإلا يرجع للصورة الواحدة القديمة image_url
function getProductImages(product: Product): string[] {
  const multiple = (product as any).image_urls;
  if (Array.isArray(multiple) && multiple.length > 0) {
    return multiple.filter(Boolean);
  }
  return product.image_url ? [product.image_url] : [];
}

export function ProductDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { product, loading, error } = useProduct(id);
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { products: related, loading: relLoading } = useProducts(
    product?.category_id ? undefined : undefined
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="aspect-square skeleton rounded-3xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4 rounded-xl" />
            <div className="skeleton h-4 w-1/2 rounded-xl" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title={t('noResults')}
          description={t('noResultsDesc')}
          actionLabel={t('products')}
          actionTo="/products"
        />
      </div>
    );
  }

  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const description = lang === 'ar' ? product.description_ar : product.description_en;
  const available = getAvailableStock(product);
  const stockStatus = getStockStatus(product);
  const price = getPricingForQuantity(product, qty);
  const total = price * qty;
  const tiers = [...(product.pricing_tiers || [])].sort((a, b) => a.min_quantity - b.min_quantity);
  const images = getProductImages(product);

  const relatedProducts = related
    .filter(p => p.id !== product.id && p.category_id === product.category_id)
    .slice(0, 4);

  const handleAddToCart = () => {
    if (available === 0) return;
    if (qty > available) {
      showToast(t('onlyLeft', { count: available }), 'error');
      return;
    }
    addToCart(product, qty);
    showToast(t('addToCart') + ' — ' + name, 'success');
  };

  const handleBuyNow = () => {
    if (available === 0) return;
    if (qty > available) {
      showToast(t('onlyLeft', { count: available }), 'error');
      return;
    }
    addToCart(product, qty);
    navigate('/cart');
  };

  const handlePrevImage = () => {
    setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">{t('home')}</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-primary-600">{t('products')}</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link to={`/products?category=${product.category.id}`} className="hover:text-primary-600">
              {lang === 'ar' ? product.category.name_ar : product.category.name_en}
            </Link>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative">
          <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 shadow-card relative">
            {images.length > 0 ? (
              <img src={images[activeImage] || images[0]} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-200">
                <Package className="w-24 h-24" />
              </div>
            )}

            {/* أسهم التنقل بين الصور — تظهر فقط لو فيه أكتر من صورة واحدة */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute start-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-all cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronRight className="w-5 h-5 rtl:hidden" />
                  <ChevronLeft className="w-5 h-5 hidden rtl:block" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute end-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-700 hover:bg-white transition-all cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronLeft className="w-5 h-5 rtl:hidden" />
                  <ChevronRight className="w-5 h-5 hidden rtl:block" />
                </button>

                {/* نقط أسفل الصورة */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`rounded-full transition-all cursor-pointer ${
                        idx === activeImage
                          ? 'w-5 h-2 bg-white shadow-sm'
                          : 'w-2 h-2 bg-white/60 hover:bg-white/80'
                      }`}
                      aria-label={`Image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Stock badge */}
            <div className="absolute top-4 start-4">
              {stockStatus === 'out' ? (
                <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-error-500 text-white shadow-sm">
                  {t('outOfStock')}
                </span>
              ) : stockStatus === 'low' ? (
                <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-warning-500 text-white shadow-sm">
                  {t('lowStock')} — {t('onlyLeft', { count: available })}
                </span>
              ) : (
                <span className="px-3 py-1.5 text-sm font-semibold rounded-full bg-success-500 text-white shadow-sm">
                  {t('inStock')} — {available} {t('units')}
                </span>
              )}
            </div>
          </div>

          {/* صور مصغّرة (thumbnails) أسفل الصورة الرئيسية — تظهر فقط لو فيه أكتر من صورة واحدة */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === activeImage ? 'border-primary-500' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {product.category && (
            <Link
              to={`/products?category=${product.category.id}`}
              className="inline-block text-sm font-semibold text-primary-600 hover:text-primary-700 mb-2"
            >
              {lang === 'ar' ? product.category.name_ar : product.category.name_en}
            </Link>
          )}
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{name}</h1>
          {product.packaging && (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              {product.packaging}
            </p>
          )}

          {description && (
            <p className="text-sm text-gray-600 mt-4 leading-relaxed">{description}</p>
          )}

          {/* Pricing tiers */}
          {tiers.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5">
                <h3 className="text-sm font-bold text-gray-900">{t('pricingTiers')}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {tiers.map(tier => {
                  const isActive = qty >= tier.min_quantity && (tier.max_quantity === null || qty <= tier.max_quantity);
                  return (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between px-4 py-3 transition-colors ${isActive ? 'bg-primary-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {isActive && <Check className="w-4 h-4 text-primary-600" />}
                        <span className={`text-sm ${isActive ? 'font-bold text-primary-700' : 'text-gray-600'}`}>
                          {tier.min_quantity}{tier.max_quantity ? `–${tier.max_quantity}` : '+'} {t('units')}
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
                        {Number(tier.unit_price).toFixed(2)} {t('currency')} {t('perUnit')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price + Quantity */}
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500">{t('unitPrice')}</p>
                <p className="text-2xl font-extrabold text-primary-600">
                  {price.toFixed(2)} <span className="text-sm text-gray-400">{t('currency')}</span>
                </p>
              </div>
              <div className="text-end">
                <p className="text-xs text-gray-500">{t('totalPrice')}</p>
                <p className="text-2xl font-extrabold text-gray-900">
                  {total.toFixed(2)} <span className="text-sm text-gray-400">{t('currency')}</span>
                </p>
              </div>
            </div>

            {stockStatus !== 'out' && (
              <div className="flex items-center gap-3">
                <QuantitySelector value={qty} onChange={setQty} max={available} size="md" />
                <Button onClick={handleAddToCart} variant="outline" className="flex-1">
                  <ShoppingBag className="w-4 h-4" />
                  {t('addToCart')}
                </Button>
              </div>
            )}

            {stockStatus !== 'out' && (
              <Button onClick={handleBuyNow} size="lg" className="w-full mt-3">
                {t('shopNow')}
              </Button>
            )}

            {stockStatus === 'out' && (
              <div className="py-3 bg-gray-50 rounded-xl text-center text-sm font-semibold text-gray-400">
                {t('outOfStock')}
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
              <Truck className="w-5 h-5 text-secondary-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600">{lang === 'ar' ? 'توصيل سريع' : 'Fast Delivery'}</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-secondary-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600">{lang === 'ar' ? 'جودة مضمونة' : 'Quality Assured'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 lg:mt-16">
          <h2 className="text-xl lg:text-2xl font-extrabold text-gray-900 mb-5">{t('relatedProducts')}</h2>
          {relLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}