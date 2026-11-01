import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface PageBackButtonProps {
  className?: string;
}

export function PageBackButton({ className = '' }: PageBackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const isHome = location.pathname === '/';

  const goBack = () => {
    if (isHome) {
      navigate('/products');
      return;
    }

    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }

    if (location.pathname.startsWith('/admin')) {
      navigate(location.pathname === '/admin' ? '/' : '/admin', { replace: true });
    } else if (location.pathname === '/register' || location.pathname === '/forgot-password') {
      navigate('/login', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={isHome
        ? (lang === 'ar' ? 'تصفح المنتجات' : 'Browse products')
        : (lang === 'ar' ? 'العودة للصفحة السابقة' : 'Go back')}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary-200 bg-white px-3.5 py-2 text-sm font-bold text-primary-700 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      <span>{isHome
        ? (lang === 'ar' ? 'تصفح المنتجات' : 'Browse products')
        : (lang === 'ar' ? 'رجوع' : 'Back')}</span>
    </button>
  );
}
