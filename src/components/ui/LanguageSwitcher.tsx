import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      title={lang === 'en' ? 'العربية' : 'English'}
    >
      <Globe className="w-4 h-4" />
      <span className="text-xs font-semibold">{lang === 'en' ? 'AR' : 'EN'}</span>
    </button>
  );
}
