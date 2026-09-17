import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/types';
import { getPricingForQuantity, getAvailableStock, getStockStatus } from '@/lib/pricing';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { ShoppingBag, Eye, PackageX } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

// يرجع مصفوفة الصور: يفضّل image_urls (متعدد) لو موجود، وإلا يرجع للصورة الواحدة القديمة image_url
function getProductImages(product: Product): string[] {
  const multiple = (product as any).image_urls;
  if (Array.isArray(multiple) && multiple.length > 0) {
    return multiple.filter(Boolean);
  }
  return product.image_url ? [product.image_url] : [];
}

export function ProductCard({ product }: ProductCardProps) {
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [showQuickView, setShowQuickView] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const images = getProductImages(product);

  const name = lang === 'ar' ? ((product as any).name_ar || product.name) : ((product as any).name_en || product.name);
  
  const description = (product as any).description || (product as any).description_ar || (product as any).description_en;

  const available = getAvailableStock(product);
  const stockStatus = getStockStatus(product);
  
  const calculatedPrice = getPricingForQuantity(product, qty);
  const price = calculatedPrice > 0 ? calculatedPrice : Number(product.price || 0);
  const total = price * qty;

  const handleAddToCart = () => {
    if (available === 0) return;
    if (qty > available) {
      showToast(t('onlyLeft', { count: available }), 'error');
      return;
    }
    addToCart(product, qty);
    showToast(t('addToCart') + ' — ' + name, 'success');
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage(index);
  };

  return (
    <>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col">
        {/* Image */}
        <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 block">
          {images.length > 0 ? (
            <img
              src={images[activeImage] || images[0]}
              alt={name || 'Product'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-200">
              <PackageX className="w-16 h-16" />
            </div>
          )}

          {/* Stock badge */}
          <div className="absolute top-2 sm:top-2.5 start-2 sm:start-2.5">
            {stockStatus === 'out' ? (
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-error-500 text-white shadow-sm">
                {t('outOfStock')}
              </span>
            ) : stockStatus === 'low' ? (
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-warning-500 text-white shadow-sm">
                {t('lowStock')}
              </span>
            ) : (
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-success-500 text-white shadow-sm">
                {t('inStock')}
              </span>
            )}
          </div>

          {/* Quick view button */}
          <button
            onClick={(e) => { e.preventDefault(); setShowQuickView(true); }}
            className="absolute top-2 sm:top-2.5 end-2 sm:end-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Image carousel dots — تظهر فقط لو فيه أكتر من صورة واحدة */}
          {images.length > 1 && (
            <div className="absolute bottom-2 sm:bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleDotClick(e, idx)}
                  className={`rounded-full transition-all cursor-pointer ${
                    idx === activeImage
                      ? 'w-4 h-1.5 bg-white shadow-sm'
                      : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`Image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          <Link to={`/products/${product.id}`}>
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1 hover:text-primary-600 transition-colors">{name}</h3>
          </Link>
          {description && (
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1 line-clamp-2 flex-1">{description}</p>
          )}
          {product.packaging && (
            <p className="text-[11px] sm:text-xs text-gray-400 mt-1.5">{product.packaging}</p>
          )}

          {/* Price */}
          <div className="mt-3 flex items-baseline justify-between flex-wrap gap-1">
            <div>
              <span className="text-base sm:text-lg font-extrabold text-primary-600">{price.toFixed(2)}</span>
              <span className="text-[11px] sm:text-xs text-gray-400 ms-1">{t('currency')}</span>
            </div>
            {available > 0 && available <= 10 && (
              <span className="text-[10px] sm:text-xs text-warning-600 font-medium">{t('onlyLeft', { count: available })}</span>
            )}
          </div>

          {/* Quantity + Add to cart */}
          {stockStatus !== 'out' ? (
            <div className="mt-3 flex items-center gap-1.5 sm:gap-2">
              <QuantitySelector value={qty} onChange={setQty} max={available} min={1} size="sm" />
              <button
                onClick={handleAddToCart}
                className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-primary-600 text-white text-[11px] sm:text-xs font-semibold rounded-xl hover:bg-primary-700 transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t('addToCart')}</span>
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <button
                disabled
                className="w-full py-2 bg-gray-100 text-gray-400 text-[11px] sm:text-xs font-semibold rounded-xl cursor-not-allowed"
              >
                {t('outOfStock')}
              </button>
            </div>
          )}

          {/* Total preview */}
          {stockStatus !== 'out' && qty > 1 && (
            <p className="mt-2 text-[11px] sm:text-xs text-gray-500 text-center">
              {t('total')}: <span className="font-bold text-gray-700">{total.toFixed(2)} {t('currency')}</span>
            </p>
          )}
        </div>
      </div>

      {/* Quick view modal */}
      {showQuickView && (
        <QuickViewModal product={product} onClose={() => setShowQuickView(false)} />
      )}
    </>
  );
}

function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const images = getProductImages(product);

  const name = lang === 'ar' ? ((product as any).name_ar || product.name ) : ((product as any).name_en || product.name);
  const description = (product as any).description || (product as any).description_ar || (product as any).description_en;

  const available = getAvailableStock(product);
  const stockStatus = getStockStatus(product);
  
  const calculatedPrice = getPricingForQuantity(product, qty);
  const price = calculatedPrice > 0 ? calculatedPrice : Number(product.price || 0);
  const total = price * qty;

  const handleAddToCart = () => {
    if (available === 0) return;
    if (qty > available) {
      showToast(t('onlyLeft', { count: available }), 'error');
      return;
    }
    addToCart(product, qty);
    showToast(t('addToCart') + ' — ' + name, 'success');
    onClose();
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage(index);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-float w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto flex flex-col md:flex-row animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="md:w-1/2 aspect-square bg-gradient-to-br from-primary-50 to-secondary-50 overflow-hidden relative">
          {images.length > 0 ? (
            <img src={images[activeImage] || images[0]} alt={name || 'Product'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-200">
              <PackageX className="w-20 h-20" />
            </div>
          )}

          {/* Image carousel dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 z-10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleDotClick(e, idx)}
                  className={`rounded-full transition-all cursor-pointer ${
                    idx === activeImage
                      ? 'w-4 h-1.5 bg-white shadow-sm'
                      : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`Image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="md:w-1/2 p-4 sm:p-6 flex flex-col">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">{name}</h3>
          {product.packaging && <p className="text-xs sm:text-sm text-gray-400 mt-1">{product.packaging}</p>}
          
          {/* قسم الوصف: كلمة الوصف في السطر وتحتها التفاصيل */}
          {description && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-700 mb-1">الوصف:</h4>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          )}

          {product.pricing_tiers && product.pricing_tiers.length > 0 && (
            <div className="mt-4 rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">{t('pricingTiers')}</p>
              <div className="space-y-1">
                {[...product.pricing_tiers].sort((a, b) => a.min_quantity - b.min_quantity).map(tier => (
                  <div key={tier.id} className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      {tier.min_quantity}{tier.max_quantity ? `–${tier.max_quantity}` : '+'} {t('units')}
                    </span>
                    <span className="font-semibold text-primary-600">{Number(tier.unit_price).toFixed(2)} {t('currency')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto pt-4">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-1">
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-primary-600">{price.toFixed(2)}</span>
                <span className="text-xs sm:text-sm text-gray-400 ms-1">{t('currency')} {t('perUnit')}</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900">{total.toFixed(2)} {t('currency')}</span>
            </div>
            {stockStatus !== 'out' ? (
              <div className="flex items-center gap-2">
                <QuantitySelector value={qty} onChange={setQty} max={available} size="sm" />
                <button
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-primary-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t('addToCart')}
                </button>
              </div>
            ) : (
              <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 text-xs sm:text-sm font-semibold rounded-xl cursor-not-allowed">
                {t('outOfStock')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}