import { useEffect } from 'react';

// قفل scroll الصفحة الخلفية أثناء فتح نافذة (Modal / Lightbox / قائمة)
// - بيثبّت الـ body بـ position: fixed ويحفظ مكان الـ scroll ويرجعه عند الإغلاق (يشتغل على iOS وأندرويد)
// - بيدعم أكتر من نافذة مفتوحة في نفس الوقت (عدّاد)
// - بيعوّض عرض الـ scrollbar على الديسكتوب عشان الصفحة ما تهتزش

let lockCount = 0;
let savedScrollY = 0;
let previous: Record<string, string> = {};

const KEYS = ['position', 'top', 'left', 'right', 'width', 'overflow', 'paddingRight'] as const;

function lockBody() {
  lockCount += 1;
  if (lockCount > 1) return;

  const body = document.body;
  const html = document.documentElement;
  savedScrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  previous = {};
  KEYS.forEach((k) => {
    previous[k] = body.style[k];
  });

  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
}

function unlockBody() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  const body = document.body;
  KEYS.forEach((k) => {
    body.style[k] = previous[k] ?? '';
  });
  window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
}

export function useLockBodyScroll(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    lockBody();
    return unlockBody;
  }, [active]);
}

export default useLockBodyScroll;