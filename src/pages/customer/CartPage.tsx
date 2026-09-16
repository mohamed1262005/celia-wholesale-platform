import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { QuantitySelector } from '@/components/ui/QuantitySelector';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAvailableStock } from '@/lib/pricing';
import { Trash2, ShoppingBag, ArrowLeft, Package, Sparkles } from 'lucide-react';

export function CartPage() {
  const { t, lang } = useLanguage();
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 lg:py-16 w-full overflow-x-hidden">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-6">{t('cartTitle')}</h1>
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10 text-primary-500" />}
          title={t('emptyCart')}
          description={t('emptyCartDesc')}
          actionLabel={t('continueShopping')}
          actionTo="/products"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 lg:py-12 w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 truncate">{t('cartTitle')}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('itemsInCart', { count: totalItems })}</p>
        </div>
        <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary-50 text-primary-700 text-xs font-bold border border-primary-100 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <span>أسعار جملة تنافسية وتوصيل سريع</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const name = lang === 'ar' ? item.product.name_ar : item.product.name_en;
            const available = getAvailableStock(item.product);
            return (
              <div
                key={item.product.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-card p-4 sm:p-5 hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <Link to={`/products/${item.product.id}`} className="flex-shrink-0 w-full sm:w-auto flex justify-center">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 border border-gray-50">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-200">
                        <Package className="w-8 h-8 sm:w-10 sm:h-10" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/products/${item.product.id}`} className="font-extrabold text-sm sm:text-base text-gray-900 hover:text-primary-600 transition-colors line-clamp-1 block">
                        {name}
                      </Link>
                      {item.product.packaging && (
                        <p className="text-xs font-medium text-gray-400 mt-0.5 truncate">{item.product.packaging}</p>
                      )}
                      <p className="text-xs font-bold text-primary-600 mt-1.5 bg-primary-50/60 inline-block px-2.5 py-1 rounded-lg">
                        {item.applicablePrice.toFixed(2)} {t('currency')} / {t('perUnit')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-error-600 hover:bg-error-50 transition-colors flex-shrink-0 cursor-pointer"
                      title="حذف المنتج"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-50">
                    <div className="w-full sm:w-auto">
                      <p className="text-[11px] font-bold text-gray-400 mb-1">{t('quantity')}</p>
                      <QuantitySelector
                        value={item.quantity}
                        onChange={v => updateQuantity(item.product.id, v)}
                        max={available}
                        size="sm"
                      />
                      {item.quantity >= available && available > 0 && (
                        <p className="text-[11px] font-bold text-warning-600 mt-1">الكمية المتاحة كحد أقصى: {available}</p>
                      )}
                    </div>
                    <div className="text-start sm:text-end flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto">
                      <p className="text-[11px] font-bold text-gray-400">{t('total')}</p>
                      <p className="text-base sm:text-lg font-black text-primary-600">
                        {(item.applicablePrice * item.quantity).toFixed(2)} <span className="text-xs font-bold">{t('currency')}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors bg-primary-50 hover:bg-primary-100/80 px-4 sm:px-5 py-3 rounded-2xl"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{t('continueShopping')}</span>
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-4 sm:p-6 sticky top-24 space-y-4 sm:space-y-5">
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 border-b border-gray-100 pb-3">{t('orderSummary')}</h3>
            
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-gray-600 font-medium">
                <span>{t('totalItems')}</span>
                <span className="font-bold text-gray-900">{totalItems} {t('items')}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600 font-medium">
                <span>{t('subtotal')}</span>
                <span className="font-bold text-gray-900">{subtotal.toFixed(2)} {t('currency')}</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-sm sm:text-base text-gray-900">{t('total')}</span>
                  <span className="text-xl sm:text-2xl font-black text-primary-600">{subtotal.toFixed(2)} <span className="text-xs font-bold">{t('currency')}</span></span>
                </div>
              </div>
            </div>

            <Link to="/checkout" className="block w-full">
              <Button size="lg" className="w-full rounded-2xl font-extrabold shadow-lg shadow-primary-500/20 py-3.5 sm:py-4 text-sm">
                {t('proceedToCheckout')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;