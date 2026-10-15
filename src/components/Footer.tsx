import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Instagram, Facebook, Twitter, Phone, Mail, MapPin, Code2 } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* تصميم شبكي مدمج يحل مشكلة الطول على الهواتف والشاشات */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-xs">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <span className="text-sm font-extrabold text-white">Celia</span>
                <p className="text-[8px] text-primary-400 uppercase tracking-wide">Premium Sweets</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
              {t('heroSubtitle')}
            </p>
            <div className="flex gap-1.5 pt-1">
              <a 
                href="https://www.facebook.com/mohamed.mangoo" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors text-gray-300 hover:text-white"
                title="Facebook"
              >
                <Facebook className="w-3 h-3" />
              </a>
              <a href="#" className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors text-gray-300 hover:text-white" title="Instagram">
                <Instagram className="w-3 h-3" />
              </a>
              <a href="#" className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors text-gray-300 hover:text-white" title="Twitter">
                <Twitter className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-2 text-[11px] uppercase tracking-wider">{t('products')}</h4>
            <ul className="space-y-1 text-xs">
              <li><Link to="/products" className="hover:text-primary-400 transition-colors">{t('products')}</Link></li>
              <li><Link to="/categories" className="hover:text-primary-400 transition-colors">{t('categories')}</Link></li>
              <li><Link to="/cart" className="hover:text-primary-400 transition-colors">{t('cart')}</Link></li>
              <li><Link to="/orders" className="hover:text-primary-400 transition-colors">{t('myOrders')}</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-bold text-white mb-2 text-[11px] uppercase tracking-wider">{t('profile')}</h4>
            <ul className="space-y-1 text-xs">
              <li><Link to="/profile" className="hover:text-primary-400 transition-colors">{t('profile')}</Link></li>
              <li><Link to="/notifications" className="hover:text-primary-400 transition-colors">{t('notifications')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-bold text-white mb-2 text-[11px] uppercase tracking-wider">Contact</h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-primary-400 flex-shrink-0" />
                <a href="tel:01000359525" className="hover:text-primary-400 transition-colors dir-ltr">01000359525</a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-primary-400 flex-shrink-0" />
                <a href="mailto:mangomado011@gmail.com" className="hover:text-primary-400 transition-colors truncate">mangomado011@gmail.com</a>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary-400 flex-shrink-0" />
                <span>Cairo Egypt</span>
              </li>
            </ul>
          </div>
        </div>

        {/* حقوق النشر والزر الحي الاحترافي */}
        <div className="border-t border-gray-800/80 mt-4 pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
          <p>&copy; {new Date().getFullYear()} Celia. All rights reserved.</p>
          
          <a 
            href="https://mohamed1262005.github.io/My-AI-Portfolio/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-800/80 hover:bg-primary-600/20 border border-gray-700/60 hover:border-primary-500/50 text-[10px] text-gray-300 hover:text-white transition-all duration-300 shadow-2xs hover:scale-105 cursor-pointer"
          >
            <Code2 className="w-3 h-3 text-primary-400 group-hover:rotate-12 transition-transform" />
            <span>Designed & Developed by <strong className="text-primary-400 font-bold">Mohamed Sameh</strong></span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;