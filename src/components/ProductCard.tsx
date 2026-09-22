import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { Product } from '@/types';
import { getPricingForQuantity, getAvailableStock, getStockStatus } from '@/lib/pricing';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { ShoppingBag, Eye, PackageX, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

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

  // حركة تلقائية للصور كل 3 ثواني
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

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
    showToast(lang === 'ar' ? 'تم الإضافة إلى السلة' : 'Added to cart', 'success');
  };

  return (
    <>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between transform hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="absolute inset-0 block w-full h-full">
            {images.length > 0 ? (
              images.map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt={name || 'Product'}
                  className={`absolute inset-0 w-full h-full object-contain p-2 bg-white transition-all duration-500 ease-in-out ${
                    currentImageIndex === idx ? 'opacity-100 scale-100 z-1' : 'opacity-0 scale-95 z-0 pointer-events-none'
                  }`}
                  loading="lazy"
                />
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <PackageX className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Stock badge */}
          <div className="absolute top-2 start-2 z-20">
            {stockStatus === 'out' ? (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-error-500 text-white shadow-sm">
                {t('outOfStock')}
              </span>
            ) : stockStatus === 'low' ? (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-warning-500 text-white shadow-sm">
                {t('lowStock')}
              </span>
            ) : null}
          </div>

          {/* زر العين */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickView(true); }}
            className="absolute top-2 end-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white shadow-md cursor-pointer z-20 hover:scale-110"
            title="معاينة سريعة"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* أسهم التنقل والعداد */}
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={prevImage}
                className="w-6 h-6 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white pointer-events-auto cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-black/60 text-white rounded-full">
                {currentImageIndex + 1} / {images.length}
              </span>

              <button
                onClick={nextImage}
                className="w-6 h-6 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white pointer-events-auto cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
          <div>
            <Link to={`/products/${product.id}`}>
              <h3 className="font-bold text-xs text-gray-900 line-clamp-1 hover:text-primary-600 transition-colors">{name}</h3>
            </Link>
            {product.packaging && (
              <p className="text-[10px] text-gray-400 mt-0.5">{product.packaging}</p>
            )}

            {/* Price */}
            <div className="mt-1.5 flex items-baseline justify-between">
              <div>
                <span className="text-sm font-extrabold text-primary-600">{price.toFixed(2)}</span>
                <span className="text-[10px] text-gray-400 ms-1">{t('currency')}</span>
              </div>
              {available > 0 && available <= 10 && (
                <span className="text-[10px] text-warning-600 font-medium">{t('onlyLeft', { count: available })}</span>
              )}
            </div>
          </div>

          {/* Quantity + Add to cart */}
          <div className="pt-2 border-t border-gray-50 space-y-1.5">
            {stockStatus !== 'out' ? (
              <>
                <div className="flex justify-center">
                  <QuantitySelector value={qty} onChange={setQty} max={available} min={1} size="sm" />
                </div>
                <button
                  onClick={handleAddToCart}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('addToCart')}</span>
                </button>
              </>
            ) : (
              <button disabled className="w-full py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed">
                {t('outOfStock')}
              </button>
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
    showToast(lang === 'ar' ? 'تم الإضافة إلى السلة' : 'Added to cart', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs" onClick={onClose}>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-scale-in" onClick={e => e.stopPropagation()}>
        
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 z-30 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer shadow-sm transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* قسم الصورة الواضحة وكبيرة */}
        <div className="md:w-1/2 aspect-square bg-gray-50 relative flex items-center justify-center overflow-hidden">
          {images.length > 0 ? (
            images.map((img: string, idx: number) => (
              <img
                key={idx}
                src={img}
                alt={name || 'Product'}
                className={`absolute inset-0 w-full h-full object-contain p-4 bg-white transition-opacity duration-300 ${
                  modalImageIndex === idx ? 'opacity-100 z-1' : 'opacity-0 z-0'
                }`}
              />
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <PackageX className="w-20 h-20" />
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-4 z-20">
              <button
                onClick={() => setModalImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="w-8 h-8 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-2.5 py-1 text-xs font-mono font-bold bg-black/60 text-white rounded-full">
                {modalImageIndex + 1} / {images.length}
              </span>
              <button
                onClick={() => setModalImageIndex((prev) => (prev + 1) % images.length)}
                className="w-8 h-8 rounded-full bg-white/95 text-gray-900 shadow-md flex items-center justify-center hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* قسم تفاصيل ووصف المنتج كاملاً مع إمكانية التمرير (Scroll) */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
          <div className="space-y-3">
            <h3 className="text-lg font-extrabold text-gray-900 pe-8">{name}</h3>
            {product.packaging && (
              <span className="inline-block px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full">
                {product.packaging}
              </span>
            )}
            
            {description && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 mb-1">:تفاصيل المنتج</h4>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-primary-600">{price.toFixed(2)}</span>
                <span className="text-xs text-gray-400 ms-1">{t('currency')}</span>
              </div>
              <span className="text-xs font-bold text-gray-700">{t('total')}: <span className="text-primary-600 font-mono text-sm">{total.toFixed(2)}</span></span>
            </div>

            {stockStatus !== 'out' ? (
              <div className="space-y-2.5">
                <div className="flex justify-center">
                  <QuantitySelector value={qty} onChange={setQty} max={available} size="sm" />
                </div>
                <button
                  onClick={handleAddToCart}
                  className="w-full py-2.5 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('addToCart')}</span>
                </button>
              </div>
            ) : (
              <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-xl cursor-not-allowed">
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