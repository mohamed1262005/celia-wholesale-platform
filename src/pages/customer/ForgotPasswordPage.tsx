import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react';

/* ───────────── إعدادات التدفق ───────────── */
// لازم تساوي أو تزيد عن "Minimum interval between emails" في Supabase (الافتراضي 60 ثانية)
const RESEND_SECONDS = 60;
// مدة صلاحية الكود — اضبط "Email OTP Expiration" في Supabase على نفس القيمة (600 ثانية)
const OTP_VALID_MINUTES = 10;
const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;
const STORAGE_KEY = 'celia_reset_flow';

type Step = 'request' | 'verify' | 'reset' | 'done';
interface FlowState {
  email: string;
  sentAt: number;
}

/* ───────────── تخزين حالة التدفق (عشان الـ Refresh ما يصفّرش العداد) ───────────── */
function readFlow(): FlowState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.email === 'string' && typeof parsed?.sentAt === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
function writeFlow(flow: FlowState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  } catch {
    /* ignore */
  }
}
function clearFlow() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function ForgotPasswordPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const ar = lang === 'ar';

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState(''); // بريد أو رقم هاتف
  const [email, setEmail] = useState('');           // البريد الفعلي اللي اتبعت له الكود
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const busyRef = useRef(false);

  /* استرجاع التدفق لو المستخدم عمل Refresh وهو في خطوة إدخال الكود */
  useEffect(() => {
    const flow = readFlow();
    if (!flow) return;
    const age = Date.now() - flow.sentAt;
    if (age < OTP_VALID_MINUTES * 60 * 1000) {
      setEmail(flow.email);
      setStep('verify');
      setSecondsLeft(Math.max(0, Math.ceil((RESEND_SECONDS * 1000 - age) / 1000)));
    } else {
      clearFlow();
    }
  }, []);

  /* عداد تنازلي */
  const counting = secondsLeft > 0;
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [counting]);

  /* بيحوّل المدخل (بريد/هاتف) لبريد فعلي */
  const resolveEmail = async (value: string): Promise<string> => {
    const v = value.trim();
    if (v.includes('@')) return v.toLowerCase();

    const { data, error: lookupError } = await supabase
      .from('profiles')
      .select('email')
      .eq('phone', v)
      .maybeSingle();

    if (lookupError || !data?.email) {
      throw new Error(
        ar
          ? 'رقم الهاتف غير مسجل لدينا، يرجى التأكد أو استخدام البريد الإلكتروني'
          : 'Phone number not registered, please check or use your email'
      );
    }
    return String(data.email).toLowerCase();
  };

  /* إرسال الكود — بيتجاهل أي ضغطة أثناء فترة الانتظار أو أثناء الإرسال */
  const sendCode = async (targetEmail: string): Promise<boolean> => {
    if (busyRef.current || secondsLeft > 0) return false;
    busyRef.current = true;
    setLoading(true);
    setError('');

    try {
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(targetEmail);

      if (sendError) {
        const wait = /after (\d+) seconds?/i.exec(sendError.message);
        if (wait || sendError.status === 429) {
          const seconds = wait ? Number(wait[1]) : RESEND_SECONDS;
          setSecondsLeft(seconds);
          throw new Error(
            ar
              ? `برجاء الانتظار ${seconds} ثانية قبل طلب كود جديد`
              : `Please wait ${seconds} seconds before requesting a new code`
          );
        }
        if ((sendError as any).code === 'over_email_send_rate_limit') {
          throw new Error(
            ar
              ? 'تم تجاوز عدد الرسائل المسموح به حاليًا، حاول بعد قليل'
              : 'Email sending limit reached, please try again later'
          );
        }
        throw sendError;
      }

      writeFlow({ email: targetEmail, sentAt: Date.now() });
      setSecondsLeft(RESEND_SECONDS);
      return true;
    } catch (e: any) {
      setError(e?.message || (ar ? 'حدث خطأ، حاول مرة أخرى' : 'Something went wrong, please try again'));
      return false;
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  /* الخطوة 1: طلب الكود */
  const handleRequest = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!identifier.trim() || busyRef.current) return;

    setError('');
    setLoading(true);
    let target: string;
    try {
      target = await resolveEmail(identifier);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      return;
    }
    setLoading(false);

    const ok = await sendCode(target);
    if (ok) {
      setEmail(target);
      setCode('');
      setStep('verify');
      showToast(ar ? 'تم إرسال كود التحقق' : 'Verification code sent', 'success');
    }
  };

  /* إعادة الإرسال */
  const handleResend = async () => {
    const ok = await sendCode(email);
    if (ok) {
      setCode('');
      showToast(ar ? 'تم إرسال كود جديد' : 'New code sent', 'success');
    }
  };

  /* الخطوة 2: التحقق من الكود */
  const handleVerify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (code.length !== CODE_LENGTH || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });

    busyRef.current = false;
    setLoading(false);

    if (verifyError) {
      setError(ar ? 'الكود غير صحيح أو انتهت صلاحيته' : 'The code is invalid or has expired');
      return;
    }

    clearFlow();
    setPassword('');
    setConfirm('');
    setStep('reset');
  };

  /* الخطوة 3: كلمة مرور جديدة */
  const handleReset = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (busyRef.current) return;
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        ar
          ? `كلمة المرور لازم تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`
          : `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      );
      return;
    }
    if (password !== confirm) {
      setError(ar ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    busyRef.current = true;
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    busyRef.current = false;
    setLoading(false);

    if (updateError) {
      setError(
        /different/i.test(updateError.message)
          ? ar
            ? 'كلمة المرور الجديدة لازم تكون مختلفة عن القديمة'
            : 'The new password must be different from the old one'
          : updateError.message
      );
      return;
    }

    // نخرج من جلسة الاسترجاع ونخلي المستخدم يسجل دخول بالباسورد الجديد
    await supabase.auth.signOut();
    showToast(ar ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully', 'success');
    setStep('done');
  };

  const changeEmail = () => {
    clearFlow();
    setSecondsLeft(0);
    setCode('');
    setError('');
    setStep('request');
  };

  const stepIndex = step === 'request' ? 1 : step === 'verify' ? 2 : 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-8">
          <Logo to="/" size="md" />
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          {/* مؤشر الخطوات */}
          {step !== 'done' && (
            <div className="flex items-center justify-center gap-2 mb-5" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    n === stepIndex ? 'w-8 bg-primary-600' : n < stepIndex ? 'w-4 bg-primary-300' : 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl text-center">
              {error}
            </div>
          )}

          {/* ───── الخطوة 1: البريد أو الهاتف ───── */}
          {step === 'request' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                {ar
                  ? 'اكتب بريدك الإلكتروني أو رقم هاتفك وهنبعتلك كود تحقق على بريد حسابك'
                  : 'Enter your email or phone number and we will send a verification code to your account email'}
              </p>

              <form onSubmit={handleRequest} className="space-y-4">
                <Input
                  label={ar ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or phone number'}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  icon={identifier.trim() && !identifier.includes('@') ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  placeholder={ar ? 'you@example.com أو 01xxxxxxxxx' : 'you@example.com or 01xxxxxxxxx'}
                />
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {ar ? 'إرسال كود التحقق' : 'Send verification code'}
                </Button>
              </form>

              <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-primary-600 mt-6 font-medium">
                {ar ? 'العودة لتسجيل الدخول' : 'Back to login'}
              </Link>
            </>
          )}

          {/* ───── الخطوة 2: إدخال الكود ───── */}
          {step === 'verify' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{ar ? 'أدخل كود التحقق' : 'Enter the code'}</h1>
              <p className="text-sm text-gray-500 mb-1">
                {ar ? 'بعتنا كود من 6 أرقام إلى' : 'We sent a 6-digit code to'}
              </p>
              <p className="text-sm font-bold text-gray-900 mb-1 break-all" dir="ltr">
                {maskEmail(email)}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                {ar
                  ? `الكود صالح لمدة ${OTP_VALID_MINUTES} دقائق. راجع الـ Spam لو ماوصلش.`
                  : `The code is valid for ${OTP_VALID_MINUTES} minutes. Check your spam folder if it doesn't arrive.`}
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={CODE_LENGTH}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                  placeholder="••••••"
                  dir="ltr"
                  autoFocus
                  className="w-full text-center text-2xl font-mono font-bold tracking-[0.5em] py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                />
                <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length !== CODE_LENGTH}>
                  <ShieldCheck className="w-4 h-4" />
                  {ar ? 'تحقق من الكود' : 'Verify code'}
                </Button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={secondsLeft > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {secondsLeft > 0
                    ? ar
                      ? `إعادة الإرسال بعد ${secondsLeft} ثانية`
                      : `Resend in ${secondsLeft}s`
                    : ar
                    ? 'إعادة إرسال الكود'
                    : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={changeEmail}
                  className="text-xs text-gray-500 hover:text-primary-600 font-medium cursor-pointer"
                >
                  {ar ? 'تغيير البريد أو الهاتف' : 'Use a different email or phone'}
                </button>
              </div>
            </>
          )}

          {/* ───── الخطوة 3: كلمة مرور جديدة ───── */}
          {step === 'reset' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {ar ? 'كلمة مرور جديدة' : 'Set a new password'}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                {ar ? 'اختار كلمة مرور قوية لحسابك' : 'Choose a strong password for your account'}
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div className="relative">
                  <Input
                    label={ar ? 'كلمة المرور الجديدة' : 'New password'}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4" />}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-[34px] text-gray-400 hover:text-primary-600 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  label={ar ? 'تأكيد كلمة المرور' : 'Confirm password'}
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-400">
                  {ar
                    ? `${MIN_PASSWORD_LENGTH} أحرف على الأقل`
                    : `At least ${MIN_PASSWORD_LENGTH} characters`}
                </p>
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {ar ? 'حفظ كلمة المرور' : 'Save password'}
                </Button>
              </form>
            </>
          )}

          {/* ───── تم ───── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-50 mb-4">
                <CheckCircle className="w-8 h-8 text-success-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {ar ? 'تم تغيير كلمة المرور' : 'Password changed'}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                {ar ? 'تقدر دلوقتي تسجل دخول بكلمة المرور الجديدة' : 'You can now sign in with your new password'}
              </p>
              <Link to="/login">
                <Button className="w-full">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  {ar ? 'تسجيل الدخول' : 'Go to login'}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;