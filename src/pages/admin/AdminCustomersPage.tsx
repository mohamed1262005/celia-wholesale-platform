import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Users, Search, ShieldCheck } from 'lucide-react';

export function AdminCustomersPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const altRes = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (altRes.error) {
        showToast(altRes.error.message, 'error');
      } else {
        // استبعاد الأدمن بناءً على الـ role أو البريد أو اسم المستخدم
        const filtered = (altRes.data || []).filter(c => 
          c.role !== 'admin' && 
          c.email !== 'admin' && 
          c.name !== 'admin' &&
          c.full_name !== 'admin'
        );
        setCustomers(filtered);
      }
    } else {
      // استبعاد الأدمن من جدول profiles
      const filtered = (data || []).filter(c => 
        c.role !== 'admin' && 
        c.email !== 'admin' && 
        c.name !== 'admin' &&
        c.full_name !== 'admin'
      );
      setCustomers(filtered);
    }
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
    <div className="w-full px-8 py-8 pb-32 space-y-6">
      {/* 1. Header with Gradient Background */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-pink-50/70 via-purple-50/50 to-white rounded-3xl border border-pink-100/80 shadow-sm p-8 transition-all duration-300 hover:scale-[1.01]">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 flex items-center justify-center border border-primary-500/20">
              <Users className="w-7 h-7" />
            </div>
            {lang === 'ar' ? 'إدارة العملاء' : 'Customers Management'}
          </h1>
          <p className="text-sm text-gray-600 mt-2">متابعة حسابات العملاء، بيانات الاتصال، وتفاصيل الحسابات بكل حيوية</p>
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

      {/* 4. Customers Content / Empty State / Grid */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-extrabold text-lg">
                  {(customer.full_name || customer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">
                    {customer.full_name || customer.name || 'عميل بدون اسم'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{customer.email || 'بدون بريد إلكتروني'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCustomersPage;