import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getCurrentLocation, describeLocationError, isValidPoint, type GeoPoint } from '@/lib/location';
import {
  findPendingOfflineOrder,
  isNetworkFailure,
  saveOfflineOrder,
  submitOfflineCheckoutDraft,
  type OfflineCheckoutDraft,
} from '@/lib/offlineOrders';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Banknote, ShoppingBag, Package, Smartphone, ShieldCheck, Upload, Image as ImageIcon, X, MapPin, LocateFixed, ExternalLink } from 'lucide-react';

export function CheckoutPage() {
  const { t, lang } = useLanguage();
  const { items, subtotal, totalItems, clearCart } = useCart();
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const ar = lang === 'ar';
  const [submitting, setSubmitting] = useState(false);
  const [queuedKey, setQueuedKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vodafone_cash' | 'instapay' | 'fawry'>('cod');

  // حالات خاصة برفع صورة الإيصال
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // العنوان المحفوظ من الطلبات السابقة (لو موجود) — بيتملّى تلقائيًا
  const saved = (profile as any) || {};

  const [form, setForm] = useState({
    name: profile?.full_name || '',
    phone: profile?.phone || '',
    governorate: saved.governorate || '',
    address: saved.address || '',
    deliveryNotes: '',
    transactionRef: '',
  });

  // الموقع الجغرافي (اختياري) + حفظ العنوان للطلبات القادمة
  const [geo, setGeo] = useState<GeoPoint | null>(
    isValidPoint(saved.address_lat, saved.address_lng)
      ? { lat: Number(saved.address_lat), lng: Number(saved.address_lng) }
      : null
  );
  const [locating, setLocating] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    void findPendingOfflineOrder(user.id)
      .then((draft) => setQueuedKey(draft?.idempotencyKey ?? null))
      .catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    const handleOrderSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ idempotencyKey: string; orderId: string }>).detail;
      if (!detail || (queuedKey && detail.idempotencyKey !== queuedKey)) return;
      setQueuedKey(null);
      navigate(`/confirmation/${detail.orderId}`);
      clearCart();
      void refreshProfile();
    };

    window.addEventListener('celia:offline-order-synced', handleOrderSynced);
    return () => window.removeEventListener('celia:offline-order-synced', handleOrderSynced);
  }, [queuedKey, navigate, clearCart, refreshProfile]);

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  if (!user) {
    navigate('/login?redirect=/checkout');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
      setErrors((previous) => ({ ...previous, receipt: '' }));
    }
  };

  const handleLocate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const point = await getCurrentLocation();
      setGeo(point);
      setErrors((previous) => ({ ...previous, address: '' }));
      showToast(ar ? 'تم تحديد موقعك بنجاح' : 'Location captured', 'success');
    } catch (error) {
      showToast(describeLocationError(error, ar), 'error');
    } finally {
      setLocating(false);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = t('fieldRequired');
    if (!form.phone.trim()) nextErrors.phone = t('fieldRequired');
    if (!form.governorate.trim()) nextErrors.governorate = t('fieldRequired');
    if (!form.address.trim() && !geo) nextErrors.address = t('fieldRequired');
    if (paymentMethod !== 'cod') {
      if (!form.transactionRef.trim()) nextErrors.transactionRef = t('fieldRequired');
      if (!receiptFile) nextErrors.receipt = lang === 'ar' ? 'يرجى إرفاق صورة إيصال التحويل' : 'Please attach receipt image';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !user || queuedKey) return;
    setSubmitting(true);

    try {
      const draft: OfflineCheckoutDraft = {
        idempotencyKey: crypto.randomUUID(),
        customerId: user.id,
        customerEmail: user.email || null,
        customerName: form.name,
        customerPhone: form.phone,
        governorate: form.governorate,
        address: form.address,
        deliveryNotes: form.deliveryNotes,
        transactionRef: form.transactionRef,
        paymentMethod,
        language: lang,
        saveAddress,
        location: geo,
        lines: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        receipt: receiptFile ? { blob: receiptFile, name: receiptFile.name, type: receiptFile.type } : null,
        createdAt: new Date().toISOString(),
      };

      if (!navigator.onLine) {
        await saveOfflineOrder(draft);
        setQueuedKey(draft.idempotencyKey);
        showToast(ar ? 'تم حفظ الطلب وسيتم إرساله عند عودة الاتصال' : 'Order saved and will sync when connection returns', 'info');
        return;
      }

      try {
        const orderId = await submitOfflineCheckoutDraft(draft);
        await refreshProfile();
        clearCart();
        navigate(`/confirmation/${orderId}`);
      } catch (error) {
        if (!isNetworkFailure(error)) throw error;
        await saveOfflineOrder(draft);
        setQueuedKey(draft.idempotencyKey);
        showToast(ar ? 'تعذر الاتصال؛ تم حفظ الطلب للمزامنة لاحقًا' : 'Connection lost; order saved for later sync', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || t('error'), 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-6">{t('checkout')}</h1>

      {queuedKey && (
        <div role="status" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {ar ? 'طلبك محفوظ على هذا الجهاز وسيتم إرساله تلقائيًا عند عودة الاتصال.' : 'Your order is saved on this device and will sync automatically when you reconnect.'}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery information */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
            <h3 className="font-bold text-gray-900 mb-4">{t('deliveryInformation')}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label={t('fullName')}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                error={errors.name}
              />
              <Input
                label={t('phone')}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                error={errors.phone}
              />
              <div className="sm:col-span-2">
                <Input
                  label={lang === 'ar' ? 'المحافظة' : 'Governorate'}
                  value={form.governorate}
                  onChange={e => setForm({ ...form, governorate: e.target.value })}
                  error={errors.governorate}
                  placeholder={lang === 'ar' ? 'مثال: القاهرة، الجيزة، الإسكندرية...' : 'e.g. Cairo, Giza...'}
                />
              </div>

              {/* تحديد الموقع (اختياري) */}
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 p-3 space-y-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      {ar ? 'حدد موقعك على الخريطة (اختياري)' : 'Pin your location (optional)'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ar
                        ? 'اضغط مرة واحدة بدل ما تكتب العنوان بالتفصيل، وهنحفظه لطلباتك القادمة.'
                        : 'Tap once instead of typing the full address. We will save it for your next orders.'}
                    </p>
                  </div>

                  {geo && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {ar ? 'تم تحديد الموقع' : 'Location set'}
                      </span>
                      <a
                        href={mapsUrl(geo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold hover:text-primary-600"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {ar ? 'عرض على الخريطة' : 'View on map'}
                      </a>
                      <button
                        type="button"
                        onClick={() => setGeo(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        {ar ? 'إزالة' : 'Remove'}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-primary-200 text-primary-700 text-xs font-bold hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <LocateFixed className="w-4 h-4" />
                    {locating
                      ? ar ? 'جاري تحديد موقعك...' : 'Locating...'
                      : geo
                      ? ar ? 'تحديث موقعي الحالي' : 'Update my location'
                      : ar ? 'استخدم موقعي الحالي' : 'Use my current location'}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label={geo ? `${t('address')} ${ar ? '(اختياري)' : '(optional)'}` : t('address')}
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  error={errors.address}
                  placeholder={lang === 'ar' ? 'المدينة، الحي، اسم الشارع، رقم العمارة والشقة' : 'City, district, street name, building & apartment no.'}
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label={t('deliveryNotes')}
                  value={form.deliveryNotes}
                  onChange={e => setForm({ ...form, deliveryNotes: e.target.value })}
                  rows={2}
                />
              </div>

              {/* حفظ العنوان للطلبات القادمة */}
              <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={e => setSaveAddress(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-200 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-600">
                  {ar ? 'احفظ هذا العنوان لطلباتي القادمة' : 'Save this address for my next orders'}
                </span>
              </label>
            </div>
          </div>

          {/* Payment methods */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 space-y-4">
            <h3 className="font-bold text-gray-900 mb-2">{t('paymentMethod')}</h3>

            {/* Cash on delivery */}
            <div
              onClick={() => setPaymentMethod('cod')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-50/50' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white flex-shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{t('cashOnDelivery')}</p>
                <p className="text-xs text-gray-500">{lang === 'ar' ? 'ادفع نقداً عند استلام طلبك' : 'Pay with cash upon delivery'}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {/* InstaPay */}
            <div
              onClick={() => setPaymentMethod('instapay')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'instapay' ? 'border-primary-600 bg-primary-50/50' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                IP
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">إنستاباي (InstaPay)</p>
                <p className="text-xs text-gray-500">حول المبلغ على الرقم: <span className="font-bold text-purple-700">01000359525</span></p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'instapay' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'instapay' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {/* Vodafone Cash */}
            <div
              onClick={() => setPaymentMethod('vodafone_cash')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === 'vodafone_cash' ? 'border-primary-600 bg-primary-50/50' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white flex-shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">فودافون كاش (Vodafone Cash)</p>
                <p className="text-xs text-gray-500">حول المبلغ على المحفظة: <span className="font-bold text-red-600">01000359525</span></p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'vodafone_cash' ? 'border-primary-600 bg-primary-600' : 'border-gray-300'}`}>
                {paymentMethod === 'vodafone_cash' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>

            {/* Electronic payment fields (Transaction Reference & Receipt Upload) */}
            {paymentMethod !== 'cod' && (
              <div className="pt-3 space-y-4 animate-fade-in border-t border-gray-100 mt-4">
                <Input
                  label={lang === 'ar' ? 'رقم عملية التحويل / كود الإيصال' : 'Transaction Reference / Receipt ID'}
                  value={form.transactionRef}
                  onChange={e => setForm({ ...form, transactionRef: e.target.value })}
                  error={errors.transactionRef}
                  placeholder={lang === 'ar' ? 'اكتب رقم التحويل أو مرجع العملية هنا' : 'Enter transaction ID'}
                />

                {/* رفع صورة الإيصال */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {lang === 'ar' ? 'صورة إيصال التحويل (إجباري للدفع الإلكتروني)' : 'Transfer Receipt Image (Required)'}
                  </label>

                  {!receiptPreview ? (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary-500 rounded-xl p-6 bg-gray-50/50 hover:bg-primary-50/30 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-2">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-gray-700">
                        {lang === 'ar' ? 'اضغط هنا لرفع صورة الإيصال أو اسحبها هنا' : 'Click to upload receipt image'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, JPEG (Max 5MB)</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative inline-block rounded-xl overflow-hidden border border-gray-200 bg-gray-50 p-2">
                      <img
                        src={receiptPreview}
                        alt="Receipt Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="absolute top-3 end-3 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                        title="حذف الصورة"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {errors.receipt && (
                    <p className="text-xs text-red-600 mt-1">{errors.receipt}</p>
                  )}
                </div>

                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  {lang === 'ar' ? 'سيتم مراجعة التحويل وتأكيد طلبك فوراً بعد التحقق من الإيصال.' : 'Transfer will be verified shortly.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">{t('orderSummary')}</h3>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {items.map(item => {
                const name = lang === 'ar' ? item.product.name_ar : item.product.name_en;
                return (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 flex-shrink-0">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-200" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 line-clamp-1">{name}</p>
                      <p className="text-xs text-gray-400">{item.quantity} × {item.applicablePrice.toFixed(2)} {t('currency')}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 whitespace-nowrap">
                      {(item.applicablePrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('totalItems')}</span>
                <span className="font-semibold text-gray-900">{totalItems}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-gray-900">{t('total')}</span>
                <span className="text-xl font-extrabold text-primary-600">{subtotal.toFixed(2)} {t('currency')}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full mt-5"
              onClick={handleSubmit}
              loading={submitting}
              disabled={Boolean(queuedKey)}
            >
              {submitting ? t('placingOrder') : t('placeOrder')}
            </Button>

            <Link to="/cart" className="block text-center text-sm text-gray-500 hover:text-primary-600 mt-3 font-medium">
              {t('back')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;