import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, BookOpen, Layers, Truck } from 'lucide-react';

export function RegisterPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = t('nameRequired') || 'الاسم مطلوب';
    
    // البريد الإلكتروني أصبح اختيارياً، ولكن لو كُتب يجب أن يكون صالحاً
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = t('emailInvalid') || 'البريد الإلكتروني غير صالح';
    }

    // رقم الهاتف أصبح هو الأساسي والمطلوب
    if (!form.phone.trim()) {
      e.phone = 'رقم الهاتف مطلوب لتسجيل الحساب';
    }

    if (form.password.length < 6) e.password = t('passwordMinLength') || 'كلمة المرور يجب ألا تقل عن 6 أحرف';
    if (form.password !== form.confirm) e.confirm = t('passwordMismatch') || 'كلمات المرور غير متطابقة';
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      // لو العميل لم يدخل بريد إلكتروني، نقوم بتوليد بريد وهمي فريد ومبني على رقم الهاتف لنظام Supabase
      const userEmail = form.email.trim() 
        ? form.email.trim() 
        : `phone_${form.phone.trim().replace(/\s+/g, '')}@celia-store.com`;

      // 1. إنشاء الحساب في نظام المصادقة
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userEmail,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            phone: form.phone.trim(),
          },
        },
      });

      if (signUpError) {
        showToast(signUpError.message, 'error');
        setLoading(false);
        return;
      }

      // 2. إدخال بيانات الملف الشخصي في جدول profiles
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: form.full_name,
            email: userEmail,
            phone: form.phone.trim(),
            role: 'customer'
          });

        if (profileError) {
          console.error('Error saving profile:', profileError.message);
        }
      }

      showToast(t('registerSuccess') || 'تم إنشاء الحساب بنجاح', 'success');
      navigate('/');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء التسجيل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    { icon: BookOpen, label: t('browseCatalog'), color: 'yellow' },
    { icon: Layers, label: t('pricingTiers'), color: 'pink' },
    { icon: Truck, label: t('cashOnDelivery'), color: 'cyan' },
  ];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-pink-950 relative overflow-hidden p-4 sm:p-6 lg:p-8">

      {/* خلفية تفاعلية متوهجة */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -start-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -end-32 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400/70 to-transparent" />
      </div>

      <div className="absolute top-6 start-6 z-20 lg:hidden">
        <Link to="/"><Logo size="md" /></Link>
      </div>
      <div className="absolute top-6 end-6 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center z-10">

        {/* قسم الهوية والترحيب (اليمين) */}
        <div className="lg:col-span-6 hidden lg:block">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 680 480"
              preserveAspectRatio="xMidYMid slice"
            >
              <rect x="0" y="0" width="680" height="480" fill="#7a1042" />
              <circle cx="560" cy="90" r="180" fill="#8f1450" opacity="0.6" />
              <circle cx="90" cy="420" r="150" fill="#5c0c34" opacity="0.6" />
              <circle cx="150" cy="140" r="46" fill="#ffffff" opacity="0.08" />
              <circle cx="600" cy="360" r="60" fill="#ffffff" opacity="0.06" />
            </svg>

            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-800/80 to-pink-950/90" />
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-teal-300 to-transparent" />

            <div className="relative text-white space-y-6 p-8 lg:p-10">
              <Logo to="/" size="lg" />
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-primary-100">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  {t('createAccount')}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
                  {t('createAccount')}
                </h1>
                <p className="text-sm text-primary-100/80 leading-relaxed max-w-md">
                  {t('registerSubtitle')}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                {perks.map((perk, i) => {
                  const Icon = perk.icon;
                  const hoverBg = perk.color === 'yellow' ? 'hover:bg-yellow-400/20 hover:border-yellow-300/40' : perk.color === 'pink' ? 'hover:bg-pink-400/20 hover:border-pink-300/40' : 'hover:bg-cyan-400/20 hover:border-cyan-300/40';
                  const iconColor = perk.color === 'yellow' ? 'text-yellow-300' : perk.color === 'pink' ? 'text-pink-300' : 'text-cyan-300';
                  const iconHoverBg = perk.color === 'yellow' ? 'group-hover:bg-yellow-300' : perk.color === 'pink' ? 'group-hover:bg-pink-300' : 'group-hover:bg-cyan-300';
                  const textHover = perk.color === 'yellow' ? 'group-hover:text-yellow-200' : perk.color === 'pink' ? 'group-hover:text-pink-200' : 'group-hover:text-cyan-200';
                  return (
                    <div
                      key={i}
                      className={`group bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center shadow-lg transition-all duration-300 ${hoverBg} hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
                    >
                      <div className={`w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-2 ${iconColor} transition-all duration-300 ${iconHoverBg} group-hover:text-primary-900 group-hover:scale-110`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className={`text-[11px] text-primary-200 font-medium leading-snug transition-colors ${textHover}`}>{perk.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* نموذج التسجيل (اليسار) */}
        <div className="lg:col-span-6 bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 animate-fade-in">
          <div className="lg:hidden mb-4" />
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{t('createAccount')}</h1>
            <p className="text-sm text-gray-500">{t('registerSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <Input
                label={t('fullName') || 'الاسم الكامل'}
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                error={errors.full_name}
                icon={<User className="w-4 h-4" />}
                className="rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-100 transition-all duration-200"
              />
            </div>

            {/* البريد الإلكتروني (أصبح اختيارياً) */}
            <div className="relative group">
              <Input
                label="البريد الإلكتروني (اختياري)"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                error={errors.email}
                icon={<Mail className="w-4 h-4" />}
                placeholder="name@example.com"
                className="rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-100 transition-all duration-200"
              />
            </div>

            {/* رقم الهاتف (أصبح أساسياً) */}
            <div className="relative group">
              <Input
                label="رقم الهاتف (مطلوب للتسجيل)"
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                error={errors.phone}
                icon={<Phone className="w-4 h-4" />}
                placeholder="010xxxxxxxxx"
                className="rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-100 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">{t('password') || 'كلمة المرور'}</label>
              <div className="relative group">
                <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center text-gray-400 transition-colors group-focus-within:text-primary-600">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full ps-10 pe-10 py-2.5 text-sm rounded-xl border bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 border-gray-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-error-600">{errors.password}</p>}
            </div>

            <div className="relative group">
              <Input
                label={t('confirmPassword') || 'تأكيد كلمة المرور'}
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                error={errors.confirm}
                icon={<Lock className="w-4 h-4" />}
                className="rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-100 transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-teal-500 hover:to-teal-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-teal-500/30 transition-all duration-500 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {t('register') || 'إنشاء حساب'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            {t('alreadyHaveAccount') || 'لديك حساب بالفعل؟'}{' '}
            <Link to="/login" className="font-bold text-primary-600 hover:text-teal-600 transition-colors hover:underline">
              {t('signInHere') || 'سجل الدخول هنا'}
            </Link>
          </p>
        </div>

      </div>

      <div className="absolute bottom-4 inset-x-0 text-center text-[11px] text-white/40 font-medium z-10">
        &copy; {new Date().getFullYear()} Celia Premium Sweets. All rights reserved.
      </div>
    </div>
  );
}

export default RegisterPage;