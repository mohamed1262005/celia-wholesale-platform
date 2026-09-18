import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/types';
import { getPricingForQuantity, getAvailableStock, getStockStatus } from '@/lib/pricing';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { ShoppingBag, Eye, PackageX, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

// دالة آمنة لجلب مصفوفة الصور من قاعدة البيانات (سواء كانت image_urls أو images أو image_url)
function getProductImages(product: Product): string[] {
  const p = product as any;
  if (Array.isArray(p.images) && p.images.length > 0) {
    return p.images.filter(Boolean);
  }
  if (Array.isArray(p.image_urls) && p.image_urls.length > 0) {
    return p.image_urls.filter(Boolean);
  }
  return p.image_url ? [p.image_url] : [];
}

export function ProductCard({ product }: ProductCardProps) {
  const { lang, t } = useLanguage();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [showQuickView, setShowQuickView] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const name = lang === 'ar' ? ((product as any).name_ar || product.name) : ((product as any).name_en || product.name);
  const description = (product as any).description || (product as any).description_ar || (product as any).description_en;

  const images = getProductImages(product);

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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
    // إشعار قصير واحد بس — الـ ToastContainer بيعرض آخر إشعار فقط فمش هيتكدس
    showToast(lang === 'ar' ? 'تم الإضافة إلى السلة' : 'Added to cart', 'success');
  };

  return (
    <>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 block">
          <Link to={`/products/${product.id}`} className="absolute inset-0 block w-full h-full">
            {images.length > 0 ? (
              images.map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt={name || 'Product'}
                  className={`absolute inset-0 w-full h-full object-contain bg-white transition-opacity duration-300 ${
                    currentImageIndex === idx ? 'opacity-100 z-1' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                  loading="lazy"
                />
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-200">
                <PackageX className="w-12 h-12 sm:w-16 sm:h-16" />
              </div>
            )}
          </Link>

          {/* Stock badge */}
          <div className="absolute top-2 start-2 z-20">
            {stockStatus === 'out' ? (
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-error-500 text-white shadow-sm">
                {t('outOfStock')}
              </span>
            ) : stockStatus === 'low' ? (
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-warning-500 text-white shadow-sm">
                {t('lowStock')}
              </span>
            ) : null}
          </div>

          {/* Quick view button */}
          <button
            onClick={(e) => { e.preventDefault(); setShowQuickView(true); }}
            className="absolute top-2 end-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm cursor-pointer z-20"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* أسهم التنقل والعداد لا تظهر إلا إذا كان هناك أكثر من صورة حقيقية */}
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3 z-20 pointer-events-none">
              <button
                onClick={prevImage}
                className="w-7 h-7 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all pointer-events-auto cursor-pointer flex-shrink-0"
                aria-label="Previous Image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-black/60 text-white rounded-full backdrop-blur-xs pointer-events-none flex-shrink-0">
                {currentImageIndex + 1} / {images.length}
              </span>

              <button
                onClick={nextImage}
                className="w-7 h-7 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all pointer-events-auto cursor-pointer flex-shrink-0"
                aria-label="Next Image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 sm:p-4 flex flex-col flex-1 justify-between">
          <div>
            <Link to={`/products/${product.id}`}>
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1 hover:text-primary-600 transition-colors">{name}</h3>
            </Link>
            {description && (
              <p className="text-[11px] sm:text-xs text-gray-500 mt-1 line-clamp-1">{description}</p>
            )}
            {product.packaging && (
              <p className="text-[10px] text-gray-400 mt-1">{product.packaging}</p>
            )}

            {/* Price */}
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-sm sm:text-lg font-extrabold text-primary-600">{price.toFixed(2)}</span>
                <span className="text-[10px] sm:text-xs text-gray-400 ms-1">{t('currency')}</span>
              </div>
              {available > 0 && available <= 10 && (
                <span className="text-[10px] text-warning-600 font-medium">{t('onlyLeft', { count: available })}</span>
              )}
            </div>
          </div>

          {/* Quantity + Add to cart */}
          <div className="mt-3 pt-2 border-t border-gray-50">
            {stockStatus !== 'out' ? (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <QuantitySelector value={qty} onChange={setQty} max={available} min={1} size="sm" />
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('addToCart')}</span>
                </button>
              </div>
            ) : (
              <button disabled className="w-full py-2 bg-gray-100 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed">
                {t('outOfStock')}
              </button>
            )}

            {stockStatus !== 'out' && qty > 1 && (
              <p className="mt-1.5 text-[10px] text-gray-500 text-center font-medium">
                {t('total')}: <span className="font-bold text-primary-700">{total.toFixed(2)} {t('currency')}</span>
              </p>
            )}
          </div>
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
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const name = lang === 'ar' ? ((product as any).name_ar || product.name) : ((product as any).name_en || product.name);
  const description = (product as any).description || (product as any).description_ar || (product as any).description_en;

  const images = getProductImages(product);

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
    // إشعار قصير واحد بس — الـ ToastContainer بيعرض آخر إشعار فقط فمش هيتكدس
    showToast(lang === 'ar' ? 'تم الإضافة إلى السلة' : 'Added to cart', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col md:flex-row animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="md:w-1/2 aspect-square bg-gradient-to-br from-primary-50 to-secondary-50 overflow-hidden relative">
          {images.length > 0 ? (
            images.map((img: string, idx: number) => (
              <img
                key={idx}
                src={img}
                alt={name || 'Product'}
                className={`absolute inset-0 w-full h-full object-contain bg-white transition-opacity duration-300 ${
                  modalImageIndex === idx ? 'opacity-100 z-1' : 'opacity-0 z-0'
                }`}
              />
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-200">
              <PackageX className="w-20 h-20" />
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3 z-20">
              <button
                onClick={() => setModalImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="w-8 h-8 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-black/60 text-white rounded-full">
                {modalImageIndex + 1} / {images.length}
              </span>
              <button
                onClick={() => setModalImageIndex((prev) => (prev + 1) % images.length)}
                className="w-8 h-8 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="md:w-1/2 p-6 flex flex-col overflow-y-auto">
          <h3 className="text-lg font-bold text-gray-900">{name}</h3>
          {product.packaging && <p className="text-sm text-gray-400 mt-1">{product.packaging}</p>}
          
          {description && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-700 mb-1">:الوصف</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          )}

          <div className="mt-auto pt-4">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-2xl font-extrabold text-primary-600">{price.toFixed(2)}</span>
                <span className="text-sm text-gray-400 ms-1">{t('currency')} {t('perUnit')}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{total.toFixed(2)} {t('currency')}</span>
            </div>
            {stockStatus !== 'out' ? (
              <div className="flex items-center gap-2">
                <QuantitySelector value={qty} onChange={setQty} max={available} size="sm" />
                <button
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {t('addToCart')}
                </button>
              </div>
            ) : (
              <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed">
                {t('outOfStock')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;