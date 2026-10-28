import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { isNativePush, registerPush, saveDeviceToken } from '@/lib/push';

// مكوّن بدون واجهة: يسجّل الجهاز للإشعارات بعد تسجيل الدخول ويتعامل مع الضغط على الإشعار
export function PushManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const userIdRef = useRef<string | undefined>(undefined);
  userIdRef.current = user?.id;

  // تسجيل التوكن لما المستخدم يسجل دخول
  useEffect(() => {
    if (user?.id) registerPush(user.id);
  }, [user?.id]);

  // المستمعات (مرة واحدة)
  useEffect(() => {
    if (!isNativePush()) return;
    const handles: Array<Promise<{ remove: () => Promise<void> }>> = [];

    // الجهاز جدد التوكن
    handles.push(
      FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        if (userIdRef.current) saveDeviceToken(userIdRef.current, token);
      }),
    );

    // التطبيق مفتوح: أندرويد مش بيعرض إشعار لوحده، فبنعرض تنبيه داخل التطبيق
    handles.push(
      FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
        const text = [notification.title, notification.body].filter(Boolean).join(' — ');
        if (text) showToast(text, 'success');
      }),
    );

    // المستخدم ضغط على الإشعار
    handles.push(
      FirebaseMessaging.addListener('notificationActionPerformed', () => {
        navigate('/notifications');
      }),
    );

    return () => {
      handles.forEach((h) => h.then((x) => x.remove()).catch(() => {}));
    };
  }, [navigate, showToast]);

  return null;
}

export default PushManager;