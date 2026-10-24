import { supabase } from '@/lib/supabase';

const BUCKET = 'products';
const ONE_YEAR = '31536000'; // ثانية — المتصفح مش هيطلب الصورة تاني لمدة سنة

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة الصورة'));
    };
    img.src = url;
  });
}

// ضغط وتحويل لـ WebP — لو فشل لأي سبب بنرفع الصورة الأصلية
export async function compressToWebp(file: File, maxDim = 1000, quality = 0.8): Promise<File> {
  try {
    const img = await loadImage(file);
    let { width, height } = img;

    if (width > height && width > maxDim) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else if (height >= width && height > maxDim) {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

// ضغط + رفع بكاش سنة + اسم فريد (عشان الكاش الطويل آمن) — بيرجع الرابط العام
export async function uploadCachedImage(
  file: File,
  folder: 'products' | 'categories',
  maxDim = 1000
): Promise<string> {
  const compressed = await compressToWebp(file, maxDim);
  const ext = compressed.type === 'image/webp' ? 'webp' : (compressed.name.split('.').pop() || 'jpg');
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filePath, compressed, {
    cacheControl: ONE_YEAR,
    contentType: compressed.type || undefined,
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}