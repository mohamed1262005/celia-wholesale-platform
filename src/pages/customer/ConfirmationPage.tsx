import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Package, MapPin, Phone, ArrowRight } from 'lucide-react';

export function ConfirmationPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items:order_items(*)')
      .eq('id', id)
      .single();

    if (error) {
      showToast(error.message, 'error');
      navigate('/');
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 font-medium">{t('loading')}</div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 sm:p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            {lang === 'ar' ? 'تم استلام طلبك بنجاح!' : 'Order Placed Successfully!'}
          </h1>
          <p className="text-sm text-gray-500">
            {lang === 'ar' ? 'رقم الطلب الخاص بك هو:' : 'Your order number is:'} <span className="font-bold text-primary-600">{order.order_number}</span>
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 text-right space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">
            {lang === 'ar' ? 'تفاصيل التوصيل' : 'Delivery Details'}
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary-600" /> {order.customer_name} - {order.customer_phone}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-600" /> {order.shipping_address}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link to="/orders" className="flex-1">
            <Button variant="outline" className="w-full">
              {lang === 'ar' ? 'متابعة طلباتي' : 'View My Orders'}
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button className="w-full flex items-center justify-center gap-2">
              {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPage;