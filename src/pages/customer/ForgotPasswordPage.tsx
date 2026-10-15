import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Mail, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      showToast(t('error'), 'error');
    } else {
      setSent(true);
      showToast(t('resetLinkSent'), 'success');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-8">
          <Logo to="/" size="md" />
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-50 mb-4">
                <Mail className="w-8 h-8 text-success-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">{t('resetLinkSent')}</h1>
              <p className="text-sm text-gray-500 mb-6">{t('resetPasswordDesc')}</p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  {t('backToLogin')}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{t('forgotPassword')}</h1>
              <p className="text-sm text-gray-500 mb-6">{t('resetPasswordDesc')}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t('email')}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                  placeholder="you@example.com"
                />
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {t('sendResetLink')}
                </Button>
              </form>

              <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-primary-600 mt-6 font-medium">
                {t('backToLogin')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
