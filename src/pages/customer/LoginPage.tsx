import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, Eye, EyeOff, Sparkles, ShoppingBag, Users, PackageCheck, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const { lang, setLang } = useLanguage();
  const auth: any = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(''); // يقبل بريد إلكتروني أو رقم هاتف
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loginEmail = identifier.trim();

      // لو المستخدم أدخل رقم هاتف وليس بريد إلكتروني، نقوم بالبحث عن الإيميل المرتبط برقم الهاتف من جدول profiles
      if (!loginEmail.includes('@')) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', loginEmail)
          .single();

        if (profileError || !profileData) {
          throw new Error(lang === 'ar' ? 'رقم الهاتف غير مسجل لدينا، يرجى التأكد أو استخدام البريد الإلكتروني' : 'Phone number not registered, please check or use email');
        }
        loginEmail = profileData.email;
      }

      const loginFunc = auth.signIn || auth.login || auth.signInWithEmail;
      if (loginFunc) {
        await loginFunc(loginEmail, password);
      } else {
        // بديل مباشر لو دالة الـ Auth مش متاحة بالشكل المتوقع
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });
        if (authError) throw authError;
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || (lang === 'ar' ? 'فشل تسجيل الدخول. تأكد من البيانات' : 'Login failed. Please check your credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-pink-950 relative overflow-hidden p-4 sm:p-6 lg:p-8">

      {/* خلفية تفاعلية متوهجة (Ambient Glows) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -start-32 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -end-32 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400/70 to-transparent" />
      </div>

      {/* زر تغيير اللغة أعلى اليسار */}
      <div className="absolute top-6 start-6 z-20">
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-teal-400/20 hover:border-teal-300/40 text-white hover:text-teal-100 text-xs font-semibold backdrop-blur-md border border-white/15 transition-all duration-300 cursor-pointer shadow-sm hover:scale-105"
        >
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center z-10">

        {/* نموذج تسجيل الدخول (اليسار) */}
        <div className="lg:col-span-6 bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 animate-fade-in">

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900">{lang === 'ar' ? 'أهلاً بك مجدداً' : 'Welcome Back'}</h2>
            <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'سجل دخولك للوصول إلى لوحة التحكم والطلبات' : 'Sign in to access dashboard and orders'}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {lang === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone Number'}
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center text-gray-400 transition-colors group-focus-within:text-primary-600">
                  {identifier.includes('@') ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                </span>
                <Input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder={lang === 'ar' ? 'admin@celia.com أو 01xxxxxxxxx' : 'admin@celia.com or phone'}
                  required
                  className="ps-10 text-sm py-2.5 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-100 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                <Link to="/forgot-password" className="text-[11px] font-semibold text-primary-600 hover:text-teal-600 transition-colors hover:underline">
                  {lang === 'ar' ? 'هل نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 start-0 ps-3.5 flex items-center text-gray-400 transition-colors group-focus-within:text-primary-600">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="ps-10 pe-10 text-sm py-2.5 rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-100 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* تذكرني */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-200 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-xs font-medium text-gray-600 cursor-pointer select-none">
                {lang === 'ar' ? 'تذكرني' : 'Remember me'}
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary-600 to-primary-700 hover:from-teal-500 hover:to-teal-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-teal-500/30 transition-all duration-500 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              {loading ? (lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...') : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            {lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
            <Link to="/register" className="text-primary-600 font-bold hover:text-teal-600 transition-colors hover:underline">
              {lang === 'ar' ? 'سجل الآن' : 'Sign up'}
            </Link>
          </div>
        </div>

        {/* قسم الهوية والترحيب الاحترافي (اليمين) */}
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

              <g transform="translate(200,150)">
                <rect x="-70" y="-20" width="140" height="40" rx="20" fill="#e8558f" />
                <rect x="-70" y="-20" width="140" height="40" rx="20" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
                <rect x="-55" y="-14" width="6" height="28" fill="#ffffff" opacity="0.4" />
                <rect x="-35" y="-14" width="6" height="28" fill="#ffffff" opacity="0.4" />
                <rect x="-15" y="-14" width="6" height="28" fill="#ffffff" opacity="0.4" />
                <rect x="5" y="-14" width="6" height="28" fill="#ffffff" opacity="0.4" />
                <rect x="25" y="-14" width="6" height="28" fill="#ffffff" opacity="0.4" />
                <rect x="45" y="-14" width="6" height="28" fill="#ffffff" opacity="0.4" />
              </g>

              <g transform="translate(430,120)">
                <circle r="42" fill="#2dd4bf" />
                <circle r="42" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
                <path d="M -42 0 A 42 42 0 0 1 0 -42" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.35" />
                <rect x="-3" y="42" width="6" height="70" rx="3" fill="#d1d5db" />
              </g>

              <g transform="translate(520,230)">
                <circle r="34" fill="#f472b6" />
                <circle r="34" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.5" />
                <rect x="-3" y="34" width="6" height="60" rx="3" fill="#e5e7eb" />
              </g>

              <g transform="translate(300,290)">
                <rect x="-60" y="-50" width="120" height="100" rx="10" fill="#0d9488" />
                <line x1="-60" y1="-25" x2="60" y2="-25" stroke="#0f766e" strokeWidth="3" />
                <line x1="-60" y1="0" x2="60" y2="0" stroke="#0f766e" strokeWidth="3" />
                <line x1="-60" y1="25" x2="60" y2="25" stroke="#0f766e" strokeWidth="3" />
                <line x1="-20" y1="-50" x2="-20" y2="50" stroke="#0f766e" strokeWidth="3" />
                <line x1="20" y1="-50" x2="20" y2="50" stroke="#0f766e" strokeWidth="3" />
              </g>

              <g transform="translate(140,320)">
                <ellipse cx="0" cy="-14" rx="34" ry="16" fill="#fbcfe8" />
                <ellipse cx="0" cy="14" rx="34" ry="16" fill="#fbcfe8" />
                <ellipse cx="0" cy="0" rx="38" ry="10" fill="#831843" />
              </g>

              <g transform="translate(430,350)">
                <ellipse cx="0" cy="-13" rx="30" ry="14" fill="#99f6e4" />
                <ellipse cx="0" cy="13" rx="30" ry="14" fill="#99f6e4" />
                <ellipse cx="0" cy="0" rx="34" ry="9" fill="#134e4a" />
              </g>

              <circle cx="560" cy="150" r="10" fill="#fde68a" />
              <circle cx="240" cy="90" r="8" fill="#fda4af" />
              <circle cx="380" cy="60" r="7" fill="#5eead4" />
              <circle cx="90" cy="240" r="9" fill="#f9a8d4" />
            </svg>

            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-800/80 to-pink-950/90" />
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-teal-300 to-transparent" />

            <div className="relative text-white space-y-6 p-8 lg:p-10">

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-md">
                  <span className="text-white font-extrabold text-xl">C</span>
                </div>
                <div>
                  <span className="text-xl font-extrabold tracking-wide">Celia</span>
                  <p className="text-[10px] text-primary-200 uppercase tracking-widest font-semibold">PREMIUM SWEETS</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-primary-100">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  {lang === 'ar' ? 'بوابة سيليا المركزية لجملة الحلويات' : 'Celia Central Wholesale Portal'}
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
                  {lang === 'ar' ? 'بوابتك الذكية لإدارة تجارة الجملة بكفاءة عالية' : 'Your Smart Gateway for Efficient Wholesale Management'}
                </h1>
                <p className="text-sm text-primary-100/80 leading-relaxed max-w-md">
                  {lang === 'ar' ? 'تحكم كامل في الأسعار، تتبع المخزون اللحظي، وإدارة الطلبات باحترافية مطلقة.' : 'Full price control, real-time inventory tracking, and professional order management.'}
                </p>
              </div>

              {/* لوحة الإحصائيات */}
              <div className="grid grid-cols-3 gap-3 pt-4">

                <div className="group bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center shadow-lg transition-all duration-300 hover:bg-yellow-400/20 hover:border-yellow-300/40 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-2 text-yellow-300 transition-all duration-300 group-hover:bg-yellow-300 group-hover:text-primary-900 group-hover:scale-110">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-white">+1000</p>
                  <p className="text-[11px] text-primary-200 font-medium mt-0.5 transition-colors group-hover:text-yellow-200">{lang === 'ar' ? 'طلب ناجح' : 'Successful Orders'}</p>
                </div>

                <div className="group bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center shadow-lg transition-all duration-300 hover:bg-pink-400/20 hover:border-pink-300/40 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-2 text-pink-300 transition-all duration-300 group-hover:bg-pink-300 group-hover:text-primary-900 group-hover:scale-110">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-white">+200</p>
                  <p className="text-[11px] text-primary-200 font-medium mt-0.5 transition-colors group-hover:text-pink-200">{lang === 'ar' ? 'عميل جملة' : 'Wholesale Clients'}</p>
                </div>

                <div className="group bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-center shadow-lg transition-all duration-300 hover:bg-cyan-400/20 hover:border-cyan-300/40 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-2 text-cyan-300 transition-all duration-300 group-hover:bg-cyan-300 group-hover:text-primary-900 group-hover:scale-110">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-white">+500</p>
                  <p className="text-[11px] text-primary-200 font-medium mt-0.5 transition-colors group-hover:text-cyan-200">{lang === 'ar' ? 'منتج مميز' : 'Featured Products'}</p>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="absolute bottom-4 inset-x-0 text-center text-[11px] text-white/40 font-medium z-10">
        &copy; {new Date().getFullYear()} Celia Premium Sweets. All rights reserved.
      </div>
    </div>
  );
}

export default LoginPage;