import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Instagram, Facebook, Twitter, Phone, Mail, MapPin, Code2 } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <span className="text-lg font-extrabold text-white">Celia</span>
                <p className="text-[10px] text-primary-400 uppercase tracking-wide">Premium Sweets</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t('heroSubtitle')}
            </p>
            <div className="flex gap-2 mt-4">
              <a 
                href="https://www.facebook.com/mohamed.mangoo" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors" title="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors" title="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wide">{t('products')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-primary-400 transition-colors">{t('products')}</Link></li>
              <li><Link to="/categories" className="hover:text-primary-400 transition-colors">{t('categories')}</Link></li>
              <li><Link to="/cart" className="hover:text-primary-400 transition-colors">{t('cart')}</Link></li>
              <li><Link to="/orders" className="hover:text-primary-400 transition-colors">{t('myOrders')}</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wide">{t('profile')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/profile" className="hover:text-primary-400 transition-colors">{t('profile')}</Link></li>
              <li><Link to="/notifications" className="hover:text-primary-400 transition-colors">{t('notifications')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wide">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="tel:01000359525" className="hover:text-primary-400 transition-colors dir-ltr">01000359525</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="mailto:mangomado011@gmail.com" className="hover:text-primary-400 transition-colors">mangomado011@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <span>Cairo Egypt</span>
              </li>
            </ul>
          </div>
        </div>

        {/* حقوق النشر والزر الحي الاحترافي */}
        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Celia Premium Sweets. All rights reserved.</p>
          
          {/* زر حي وتفاعلي لبروفايلك */}
          <a 
            href="https://mohamed1262005.github.io/My-AI-Portfolio/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-800/80 hover:bg-primary-600/20 border border-gray-700/60 hover:border-primary-500/50 text-xs text-gray-300 hover:text-white transition-all duration-300 shadow-sm hover:scale-105 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-primary-400 group-hover:rotate-12 transition-transform" />
            <span>Designed & Developed by <strong className="text-primary-400 font-bold">Mohamed Sameh</strong></span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;