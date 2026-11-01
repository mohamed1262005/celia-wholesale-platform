import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  House,
  Package,
  Printer,
  ReceiptText,
  Store,
} from 'lucide-react';

interface ConfirmationOrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  packaging: string | null;
  quantity: number;
  unit_price: number;
  total: number | null;
}

interface ConfirmationOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  payment_method: string;
  status: string;
  city: string | null;
  area: string | null;
  address: string | null;
  shipping_address: string | null;
  delivery_notes: string | null;
  order_notes: string | null;
  subtotal: number | null;
  total_amount: number | null;
  total_quantity: number | null;
  created_at: string;
  order_items: ConfirmationOrderItem[] | null;
}

export function ConfirmationPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const isArabic = lang === 'ar';
  const [order, setOrder] = useState<ConfirmationOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) {
      setLoadError(isArabic ? 'رقم الطلب غير متوفر.' : 'The order ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items:order_items(*)')
      .eq('id', id)
      .single();

    if (error) {
      setLoadError(isArabic
        ? 'تم تسجيل طلبك، لكن تعذر تحميل الفاتورة الآن. حاول تحديثها بعد لحظات أو راجع طلباتي.'
        : 'Your order was received, but its invoice could not be loaded. Please retry in a moment or check My Orders.');
      setLoading(false);
      return;
    }

    setOrder(data as unknown as ConfirmationOrder);
    setLoading(false);
  }, [id, isArabic]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return (
      <div role="status" className="min-h-[60vh] flex items-center justify-center text-gray-500">
        {t('loading')}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-3xl border border-amber-100 bg-white p-8 shadow-card">
          <ReceiptText className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-extrabold text-gray-900">
            {isArabic ? 'طلبك وصل، والفاتورة لم تظهر بعد' : 'Your order is in, but the invoice is not available yet'}
          </h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-gray-600">{loadError}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => void fetchOrder()}>
              {isArabic ? 'إعادة المحاولة' : 'Try again'}
            </Button>
            <Link to="/orders">
              <Button variant="outline" className="w-full">{isArabic ? 'طلباتي' : 'My Orders'}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = order.order_items ?? [];
  const calculatedSubtotal = items.reduce((sum, item) => {
    const itemTotal = Number(item.total ?? Number(item.unit_price || 0) * Number(item.quantity || 0));
    return sum + (Number.isFinite(itemTotal) ? itemTotal : 0);
  }, 0);
  const total = Number(order.total_amount ?? order.subtotal ?? calculatedSubtotal);
  const itemCount = Number(order.total_quantity ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const date = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(order.created_at));
  const paymentMethod = order.payment_method === 'cod'
    ? isArabic ? 'الدفع عند الاستلام' : 'Cash on delivery'
    : order.payment_method === 'vodafone_cash'
      ? 'Vodafone Cash'
      : order.payment_method === 'instapay'
        ? 'InstaPay'
        : order.payment_method === 'fawry'
          ? 'Fawry'
          : isArabic ? 'دفع إلكتروني' : 'Online payment';
  const address = order.shipping_address || [order.city, order.area, order.address].filter(Boolean).join(' - ');
  const orderStatus = order.status === 'new'
    ? isArabic ? 'تم استلام الطلب' : 'Order received'
    : order.status === 'processing'
      ? isArabic ? 'قيد التجهيز' : 'Being prepared'
      : order.status === 'confirmed'
        ? isArabic ? 'تم التأكيد' : 'Confirmed'
        : order.status === 'delivered'
          ? isArabic ? 'تم التوصيل' : 'Delivered'
          : order.status || (isArabic ? 'تم استلام الطلب' : 'Order received');

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <section className="no-print mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-primary-700 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white/80">
              {isArabic ? 'شكرًا لاختيارك منصتنا' : 'Thank you for choosing us'}
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              {isArabic ? 'طلبك اتسجل بنجاح!' : 'Your order is confirmed!'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/85">
              {isArabic
                ? 'نقدّر ثقتك في Celia Premium Sweets. جهّزنا لك ملخص طلبك وفاتورتك في الأسفل.'
                : 'We appreciate your trust in Celia Premium Sweets. Your order summary and invoice are below.'}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/20">
            <p className="text-[11px] font-semibold text-white/75">{isArabic ? 'رقم الطلب' : 'ORDER NUMBER'}</p>
            <p className="mt-1 font-mono text-lg font-extrabold" dir="ltr">{order.order_number}</p>
          </div>
        </div>
      </section>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock3 className="h-4 w-4 text-primary-600" />
          <span>{isArabic ? 'تاريخ الطلب:' : 'Order date:'} {date}</span>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {isArabic ? 'طباعة الفاتورة / حفظ PDF' : 'Print invoice / Save PDF'}
        </Button>
      </div>

      <section className="invoice-print overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card">
        <header className="flex flex-col justify-between gap-4 border-b-2 border-primary-100 bg-gradient-to-l from-primary-50 to-white p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900">Celia</p>
              <p className="text-xs font-bold tracking-widest text-primary-600">PREMIUM SWEETS</p>
              <p className="mt-1 text-[11px] text-gray-500" dir="ltr">01000359525 · mangomado011@gmail.com</p>
            </div>
          </div>
          <div className="sm:text-end">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900 sm:justify-end">
              <ReceiptText className="h-5 w-5 text-primary-600" />
              {isArabic ? 'فاتورة طلب' : 'Order invoice'}
            </h2>
            <p className="mt-1 font-mono text-sm font-bold text-primary-700" dir="ltr">{order.order_number}</p>
            <p className="text-xs text-gray-500">{date}</p>
          </div>
        </header>

        <div className="grid gap-3 border-b border-gray-100 p-5 sm:grid-cols-3 sm:px-7">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-bold text-gray-400">{isArabic ? 'بيانات العميل' : 'CUSTOMER'}</p>
            <p className="text-sm font-bold text-gray-900">{order.customer_name}</p>
            <p className="text-xs text-gray-600" dir="ltr">{order.customer_phone}</p>
            {order.customer_email && <p className="break-all text-xs text-gray-500">{order.customer_email}</p>}
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-bold text-gray-400">{isArabic ? 'عنوان التوصيل' : 'DELIVERY ADDRESS'}</p>
            <p className="text-sm leading-6 text-gray-700">{address || '—'}</p>
            {order.delivery_notes && <p className="mt-1 text-xs text-gray-500">{order.delivery_notes}</p>}
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[11px] font-bold text-gray-400">{isArabic ? 'الدفع وحالة الطلب' : 'PAYMENT & STATUS'}</p>
            <p className="text-sm font-semibold text-gray-800">{paymentMethod}</p>
            <p className="mt-1 text-xs text-gray-600">{orderStatus}</p>
            {order.order_notes && <p className="mt-1 break-words text-xs text-gray-500">{isArabic ? 'مرجع الدفع:' : 'Payment reference:'} {order.order_notes}</p>}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <h3 className="mb-3 text-sm font-extrabold text-gray-900">{isArabic ? 'تفاصيل المنتجات' : 'Order items'}</h3>
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-y border-gray-200 bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-3 text-start font-bold">{isArabic ? 'المنتج' : 'Product'}</th>
                    <th className="px-3 py-3 text-center font-bold">{isArabic ? 'الكمية' : 'Qty'}</th>
                    <th className="px-3 py-3 text-end font-bold">{isArabic ? 'سعر الوحدة' : 'Unit price'}</th>
                    <th className="px-3 py-3 text-end font-bold">{isArabic ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const quantity = Number(item.quantity || 0);
                    const unitPrice = Number(item.unit_price || 0);
                    const itemTotal = Number(item.total ?? unitPrice * quantity);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {item.product_image
                              ? <img src={item.product_image} alt="" className="print-invoice-image h-10 w-10 rounded-lg object-cover" />
                              : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-500"><Package className="h-5 w-5" /></span>}
                            <div>
                              <p className="font-semibold text-gray-900">{item.product_name}</p>
                              {item.packaging && <p className="text-xs text-gray-500">{item.packaging}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">{quantity}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-end">{unitPrice.toFixed(2)} {t('currency')}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-end font-bold">{itemTotal.toFixed(2)} {t('currency')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              {isArabic ? 'تم استلام الطلب. تفاصيل المنتجات غير متاحة حاليًا.' : 'Your order was received. Item details are not available right now.'}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between gap-5 text-sm text-gray-600">
                <span>{isArabic ? 'عدد القطع' : 'Total items'}</span>
                <span>{itemCount}</span>
              </div>
              <div className="flex justify-between gap-5 border-t-2 border-primary-200 pt-3 text-base font-extrabold text-gray-900">
                <span>{isArabic ? 'الإجمالي المستحق' : 'Amount due'}</span>
                <span className="text-primary-700">{Number.isFinite(total) ? total.toFixed(2) : '0.00'} {t('currency')}</span>
              </div>
            </div>
          </div>
        </div>
        <footer className="border-t border-gray-100 bg-primary-50/60 px-5 py-4 text-center text-sm font-semibold text-gray-700 sm:px-7">
          {isArabic
            ? 'شكرًا لاستخدامك منصة Celia وثقتك في Celia Premium Sweets. نسعد بخدمتك دائمًا.'
            : 'Thank you for using Celia and trusting Celia Premium Sweets. We are always happy to serve you.'}
        </footer>
      </section>

      <nav className="no-print mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/orders">
          <Button variant="outline" className="w-full">
            {isArabic ? 'متابعة طلباتي' : 'Track my orders'}
          </Button>
        </Link>
        <Link to="/">
          <Button className="w-full">
            <House className="h-4 w-4" />
            {isArabic ? 'مواصلة التسوق' : 'Continue shopping'}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </Link>
      </nav>
    </main>
  );
}

export default ConfirmationPage;
