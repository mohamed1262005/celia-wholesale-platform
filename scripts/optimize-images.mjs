// scripts/optimize-images.mjs
// بيضغط صور المنتجات/التصنيفات القديمة لـ WebP (أقصى 1000px) ويحدّث الروابط في الداتا بيز.
// الصور الأصلية بتفضل في Storage زي ما هي (مش بتتمسح) عشان تقدر ترجع في أي وقت.
//
// الاستخدام:
//   node scripts/optimize-images.mjs                       ← تجربة فقط (من غير أي تعديل)
//   node scripts/optimize-images.mjs --apply               ← ضغط + تحديث الروابط
//   node scripts/optimize-images.mjs --apply --fix-cache   ← كمان يظبط كاش سنة للصور الصغيرة الباقية

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');
const FIX_CACHE = process.argv.includes('--fix-cache');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('لازم تحدد SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY الأول');
  process.exit(1);
}

const BUCKET = 'products';
const MAX_DIM = 1000;
const QUALITY = 80;
const YEAR = '31536000';
const FOLDERS = ['', 'products', 'categories'];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const storage = supabase.storage.from(BUCKET);

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
const publicUrl = (path) => storage.getPublicUrl(path).data.publicUrl;

async function pool(items, size, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await fn(item);
      }
    })
  );
}

async function listFolder(folder) {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await storage.list(folder, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    out.push(...data.filter((f) => f.id)); // الفولدرات ملهاش id
    if (data.length < 100) break;
    offset += data.length;
  }
  return out.map((f) => ({
    path: folder ? `${folder}/${f.name}` : f.name,
    name: f.name,
    folder,
    size: Number(f.metadata?.size || 0),
    cache: String(f.metadata?.cacheControl || ''),
  }));
}

const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
const isHeavy = (f) => {
  const ext = extOf(f.name);
  if (f.name.endsWith('-opt.webp')) return false; // اتضغطت قبل كده
  return ext === 'webp' ? f.size > 300_000 : f.size > 100_000;
};

async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function main() {
  console.log('جاري قراءة الصور من Storage...');
  const files = [];
  for (const folder of FOLDERS) files.push(...(await listFolder(folder)));

  const heavy = files.filter(isHeavy);
  const heavyPaths = new Set(heavy.map((f) => f.path));
  const rest = files.filter((f) => !heavyPaths.has(f.path) && !f.cache.includes(YEAR));
  const heavyTotal = heavy.reduce((s, f) => s + f.size, 0);

  console.log(`\nإجمالي الملفات: ${files.length}`);
  console.log(`صور تقيلة محتاجة ضغط: ${heavy.length} (حجمها ${mb(heavyTotal)})`);
  console.log(`صور صغيرة محتاجة كاش سنة فقط: ${rest.length}`);
  heavy
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .forEach((f) => console.log(`  ${mb(f.size).padStart(9)}  ${f.path}`));

  if (!APPLY) {
    console.log('\nدي تجربة فقط ولم يتم تعديل أي حاجة. أضف --apply للتنفيذ.');
    return;
  }

  // 1) نسخة احتياطية من الروابط الحالية في الداتا بيز
  const products = await fetchAll('products', 'id, image_url, image_urls');
  const categories = await fetchAll('categories', '*');
  const backupFile = `image-urls-backup-${Date.now()}.json`;
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        products,
        categories: categories.map((c) => ({ id: c.id, image: c.image, image_url: c.image_url })),
      },
      null,
      2
    )
  );
  console.log(`\nتم حفظ نسخة احتياطية: ${backupFile}`);

  // 2) ضغط ورفع النسخ الجديدة (الأصول مش بتتلمس)
  const urlMap = new Map();
  let savedBytes = 0;
  let failed = 0;

  await pool(heavy, 3, async (f) => {
    try {
      const { data: blob, error: dlErr } = await storage.download(f.path);
      if (dlErr) throw dlErr;
      const input = Buffer.from(await blob.arrayBuffer());

      const output = await sharp(input)
        .rotate()
        .resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      // لو الناتج مش أصغر بشكل واضح، نسيب الصورة زي ما هي
      if (output.length >= input.length * 0.9) {
        console.log(`تخطي (مفيش فرق): ${f.path}`);
        return;
      }

      const base = f.name.replace(/\.[^/.]+$/, '');
      const newPath = `${f.folder ? f.folder + '/' : ''}${base}-opt.webp`;

      const { error: upErr } = await storage.upload(newPath, output, {
        contentType: 'image/webp',
        cacheControl: YEAR,
        upsert: false,
      });
      if (upErr && !/exist/i.test(upErr.message)) throw upErr;

      urlMap.set(publicUrl(f.path), publicUrl(newPath));
      savedBytes += input.length - output.length;
      console.log(`ok  ${mb(input.length)} → ${mb(output.length)}  ${f.path}`);
    } catch (e) {
      failed++;
      console.error(`فشل: ${f.path} — ${e.message || e}`);
    }
  });

  console.log(`\nتم ضغط ${urlMap.size} صورة، وفّرنا ${mb(savedBytes)} (فشل: ${failed})`);

  // 3) تحديث الروابط في الجداول
  const swap = (u) => (u && urlMap.get(u)) || u;
  let updatedProducts = 0;
  let updatedCategories = 0;

  for (const p of products) {
    const patch = {};
    const newMain = swap(p.image_url);
    if (newMain !== p.image_url) patch.image_url = newMain;
    if (Array.isArray(p.image_urls)) {
      const newList = p.image_urls.map(swap);
      if (newList.some((u, i) => u !== p.image_urls[i])) patch.image_urls = newList;
    }
    if (Object.keys(patch).length) {
      const { error } = await supabase.from('products').update(patch).eq('id', p.id);
      if (error) console.error(`فشل تحديث منتج ${p.id}: ${error.message}`);
      else updatedProducts++;
    }
  }

  for (const c of categories) {
    const patch = {};
    for (const col of ['image', 'image_url']) {
      if (col in c && swap(c[col]) !== c[col]) patch[col] = swap(c[col]);
    }
    if (Object.keys(patch).length) {
      const { error } = await supabase.from('categories').update(patch).eq('id', c.id);
      if (error) console.error(`فشل تحديث تصنيف ${c.id}: ${error.message}`);
      else updatedCategories++;
    }
  }

  console.log(`تم تحديث ${updatedProducts} منتج و ${updatedCategories} تصنيف`);

  // 4) (اختياري) كاش سنة للصور الصغيرة الباقية
  if (FIX_CACHE) {
    let done = 0;
    await pool(rest, 4, async (f) => {
      try {
        const { data: blob, error: dlErr } = await storage.download(f.path);
        if (dlErr) throw dlErr;
        const { error } = await storage.update(f.path, blob, {
          cacheControl: YEAR,
          upsert: true,
        });
        if (error) throw error;
        done++;
      } catch (e) {
        console.error(`فشل كاش: ${f.path} — ${e.message || e}`);
      }
    });
    console.log(`تم ضبط الكاش لـ ${done} صورة`);
  }

  console.log('\nخلصنا. الصور الأصلية القديمة لسه موجودة في Storage ولم تُحذف.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});