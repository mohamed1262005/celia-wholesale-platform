import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { closeTopLayer } from '@/lib/backStack';

// الشاشات الرئيسية: الرجوع منها يسأل "هل تريد مغادرة التطبيق؟"
const ROOT_PATHS = ['/', '/login', '/admin'];

const normalize = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);

// مكوّن بدون واجهة (غير نافذة التأكيد): بيتحكم في زر/إيماءة الرجوع في الأندرويد
// 1) لو في نافذة مفتوحة → يقفلها
// 2) لو في صفحة سابقة → يرجع لها (نفس مسار المستخدم)
// 3) لو في الشاشة الرئيسية → يسأل قبل الخروج
export function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const confirmRef = useRef(confirmOpen);
  confirmRef.current = confirmOpen;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = CapApp.addListener('backButton', () => {
      // نافذة تأكيد الخروج مفتوحة → الرجوع يقفلها (يعني "البقاء")
      if (confirmRef.current) {
        setConfirmOpen(false);
        return;
      }

      // نافذة/طبقة مفتوحة → اقفلها
      if (closeTopLayer()) return;

      const path = normalize(pathRef.current);
      if (ROOT_PATHS.includes(path)) {
        setConfirmOpen(true);
        return;
      }

      // React Router بيخزّن ترتيب الصفحة في history.state.idx
      const idx = (window.history.state as { idx?: number } | null)?.idx;
      const canGoBack = typeof idx === 'number' ? idx > 0 : window.history.length > 1;

      if (canGoBack) navigate(-1);
      else navigate('/', { replace: true });
    });

    return () => {
      handle.then((h) => h.remove()).catch(() => {});
    };
  }, [navigate]);

  if (!Capacitor.isNativePlatform()) return null;

  const ar = lang === 'ar';

  return (
    <Modal
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      title={ar ? 'مغادرة التطبيق' : 'Exit app'}
      size="sm"
    >
      <p className="text-sm text-gray-600 mb-5">
        {ar ? 'هل تريد مغادرة التطبيق؟' : 'Do you want to leave the app?'}
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
          {ar ? 'البقاء' : 'Stay'}
        </Button>
        <Button variant="danger" onClick={() => CapApp.exitApp()}>
          {ar ? 'مغادرة' : 'Exit'}
        </Button>
      </div>
    </Modal>
  );
}

export default BackButtonHandler;