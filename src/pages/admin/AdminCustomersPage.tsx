import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Users, Search, ShieldCheck, ShoppingBag, DollarSign, Calendar } from 'lucide-react';

export function AdminCustomersPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomersAndOrders();
  }, []);

  const fetchCustomersAndOrders = async () => {
    setLoading(true);

    // 1. جلب العملاء من profiles أو customers
    let rawCustomers: any[] = [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const altRes = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (altRes.error) {
        showToast(altRes.error.message, 'error');
      } else {
        rawCustomers = altRes.data || [];
      }
    } else {
      rawCustomers = data || [];
    }

    // استبعاد الأدمن
    const filteredProfiles = rawCustomers.filter(c => 
      c.role !== 'admin' && 
      c.email !== 'admin' && 
      c.name !== 'admin' &&
      c.full_name !== 'admin'
    );

    // 2. جلب جميع الطلبات مع تفاصيلها لحساب إحصائيات وتاريخ كل عميل
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        customer_id,
        total_amount,
        created_at,
        status,
        order_items (
          id,
          product_name,
          quantity,
          price
        )
      `);

    const orders = ordersData || [];

    // 3. دمج بيانات العملاء مع تاريخ طلباتهم بدقة
    const enhancedCustomers = filteredProfiles.map(customer => {
      const customerOrders = orders.filter(o => 
        o.user_id === customer.id || o.customer_id === customer.id
      );

      const totalSpent = customerOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const ordersCount = customerOrders.length;

      // استخراج المنتجات اللي طلبها العميل سابقاً
      const orderedProducts: string[] = [];
      customerOrders.forEach(o => {
        if (o.order_items && Array.isArray(o.order_items)) {
          o.order_items.forEach((item: any) => {
            if (item.product_name && !orderedProducts.includes(item.product_name)) {
              orderedProducts.push(item.product_name);
            }
          });
        }
      });

      return {
        ...customer,
        ordersCount,
        totalSpent,
        orderedProducts,
        lastOrderDate: customerOrders.length > 0 ? customerOrders[0].created_at : null
      };
    });

    setCustomers(enhancedCustomers);
    setLoading(false);
  };

  const filteredCustomers = customers.filter((customer) => {
    const name = (customer.full_name || customer.name || '').toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const totalCustomers = customers.length;

  return (
    <div className="w-full px-8 py-8 pb-32 space-y-6" dir="rtl">
      {/* 1. Header with Gradient Background */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-white rounded-3xl border border-pink-100/80 shadow-sm p-8 transition-all duration-300 hover:scale-[1.01]">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
              <Users className="w-7 h-7" />
            </div>
            {lang === 'ar' ? 'إدارة العملاء' : 'Customers Management'}
          </h1>
          <p className="text-sm text-gray-600 mt-2">متابعة حسابات العملاء، تاريخ الطلبات، والمشتريات بكل حيوية</p>
        </div>
      </div>

      {/* 2. Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-purple-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div>
            <p className="text-xs font-bold text-gray-500">إجمالي العملاء</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalCustomers}</h3>
            <span className="text-xs text-purple-600 font-bold mt-1 inline-block">قاعدة البيانات النشطة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-emerald-100 shadow-card p-6 flex items-center justify-between transition-all duration-300 hover:scale-[1.02]">
          <div>
            <p className="text-xs font-bold text-gray-500">حالة النظام</p>
            <h3 className="text-xl font-extrabold text-gray-900 mt-1">متصل ومحمي</h3>
            <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">جاهز للاستخدام</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-3.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'ابحث عن عميل بالاسم أو البريد...' : 'Search customers by name or email...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-11 pl-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Customers Content / Empty State / Grid with History */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">{t('loading')}</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-card space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-extrabold text-gray-800">لا توجد عملاء مسجلين بعد</p>
            <p className="text-xs text-gray-400 mt-1">سيتم ظهور العملاء هنا بمجرد تسجيلهم في المتجر أو الطلب</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 flex flex-col justify-between space-y-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
            >
              {/* Customer Header info */}
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-extrabold text-lg flex-shrink-0">
                  {(customer.full_name || customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-gray-900 text-sm truncate">
                    {customer.full_name || customer.name || 'عميل بدون اسم'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{customer.email || 'بدون بريد إلكتروني'}</p>
                  {customer.phone && (
                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono" dir="ltr">{customer.phone}</p>
                  )}
                </div>
              </div>

              {/* Customer Stats & History */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">عدد الطلبات</span>
                    <span className="text-xs font-extrabold text-gray-900">{customer.ordersCount} طلب</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">إجمالي المشتريات</span>
                    <span className="text-xs font-extrabold text-emerald-600">{customer.totalSpent} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Products History Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 block">المنتجات التي طلبها سابقاً:</span>
                {customer.orderedProducts && customer.orderedProducts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {customer.orderedProducts.map((prodName: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-primary-50/60 text-primary-700 rounded-xl text-[10px] font-bold border border-primary-100/50">
                        {prodName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">لم يقم بأي طلبات بعد</p>
                )}
              </div>

              {/* Registration / Last order footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  تسجيل: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('ar-EG') : 'غير متوفر'}
                </span>
                {customer.ordersCount > 0 && (
                  <span className="text-purple-600 font-bold">عميل نشط</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCustomersPage;