// أدوات تحديد موقع العميل (مرة واحدة) + رابط الخريطة

export interface GeoPoint {
  lat: number;
  lng: number;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// بيطلب الموقع الحالي مرة واحدة فقط (مش تتبع مستمر)
export function getCurrentLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject({ code: 0, message: 'unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export function mapsUrl(p: GeoPoint): string {
  return `https://www.google.com/maps?q=${p.lat},${p.lng}`;
}

export function describeLocationError(err: any, ar: boolean): string {
  const code = err?.code;
  if (code === 1) {
    return ar
      ? 'تم رفض إذن الموقع. فعّله من إعدادات الجهاز أو المتصفح ثم حاول تاني'
      : 'Location permission denied. Enable it in your device/browser settings and try again';
  }
  if (code === 3) {
    return ar ? 'استغرق تحديد الموقع وقتًا طويلًا، حاول تاني' : 'Location request timed out, please try again';
  }
  if (code === 0) {
    return ar ? 'جهازك لا يدعم تحديد الموقع' : 'Your device does not support location';
  }
  return ar ? 'تعذر تحديد موقعك، تأكد من تشغيل الـ GPS' : 'Could not get your location, make sure GPS is on';
}

export function isValidPoint(lat: unknown, lng: unknown): boolean {
  const a = Number(lat);
  const b = Number(lng);
  return lat != null && lng != null && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
}