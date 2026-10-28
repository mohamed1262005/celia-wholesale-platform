// تسجيل جهاز الأندرويد لاستقبال Push (FCM) وحفظ التوكن في Supabase
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging, Importance } from '@capacitor-firebase/messaging';
import { supabase } from '@/lib/supabase';

export const CHANNEL_ID = 'celia_default';

export const isNativePush = () => Capacitor.isNativePlatform();

export async function saveDeviceToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Capacitor.getPlatform(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );
  if (error) console.warn('[push] save token failed:', error.message);
}

// بتطلب الإذن (أندرويد 13+) وتجيب التوكن وتحفظه للمستخدم الحالي
export async function registerPush(userId: string): Promise<void> {
  if (!isNativePush()) return;
  try {
    let status = (await FirebaseMessaging.checkPermissions()).receive;
    if (status === 'prompt' || status === 'prompt-with-rationale') {
      status = (await FirebaseMessaging.requestPermissions()).receive;
    }
    if (status !== 'granted') return;

    // قناة بأهمية عالية = صوت + ظهور فوق الشاشة
    await FirebaseMessaging.createChannel({
      id: CHANNEL_ID,
      name: 'إشعارات سيليا',
      description: 'العروض وتحديثات الطلبات',
      importance: Importance.High,
      vibration: true,
    });

    const { token } = await FirebaseMessaging.getToken();
    if (token) await saveDeviceToken(userId, token);
  } catch (e) {
    console.warn('[push] register failed:', e);
  }
}