import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export function Logo({ size = 'md', to = '/' }: { size?: 'sm' | 'md' | 'lg'; to?: string }) {
  const { t } = useLanguage();
  const sizes = {
    sm: { mark: 'w-8 h-8', text: 'text-base' },
    md: { mark: 'w-10 h-10', text: 'text-xl' },
    lg: { mark: 'w-12 h-12', text: 'text-2xl' },
  };
  const s = sizes[size];

  return (
    <Link to={to} className="inline-flex items-center gap-2.5 group">
      <div className={`${s.mark} rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
        <span className="text-white font-bold text-lg">C</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`${s.text} font-extrabold text-gray-900 tracking-tight`}>Celia</span>
        <span className="text-[10px] font-medium text-primary-500 tracking-wide uppercase">Premium Sweets</span>
      </div>
    </Link>
  );
}
