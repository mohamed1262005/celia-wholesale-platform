import { useEffect } from 'react';

// قفل scroll الصفحة الخلفية أثناء فتح نافذة (Modal / Lightbox / قائمة)
// الطبقة 1: تثبيت الـ body بـ position: fixed وحفظ مكان الـ scroll ورجوعه عند الإغلاق
// الطبقة 2: منع حركة اللمس (touchmove) خارج المناطق القابلة للتمرير، ومنع "تمرير الحركة" للخلفية
//           لما المحتوى داخل النافذة يوصل أول أو آخر نقطة (بتشتغل على iOS وأندرويد وكل الـ WebViews)
// - بيدعم أكتر من نافذة مفتوحة في نفس الوقت (عدّاد)
// - بيعوّض عرض الـ scrollbar على الديسكتوب عشان الصفحة ما تهتزش

let lockCount = 0;
let savedScrollY = 0;
let previous: Record<string, string> = {};
let touchStartY = 0;

const KEYS = ['position', 'top', 'left', 'right', 'width', 'overflow', 'paddingRight'] as const;

function isScrollable(el: HTMLElement, axis: 'x' | 'y'): boolean {
  const style = window.getComputedStyle(el);
  if (axis === 'y') {
    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
  }
  return (style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
}

function findScroller(target: EventTarget | null, axis: 'x' | 'y'): HTMLElement | null {
  let el = target instanceof HTMLElement ? target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (isScrollable(el, axis)) return el;
    el = el.parentElement;
  }
  return null;
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? 0;
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 1 || !e.cancelable) return;

  // تمرير أفقي داخل عنصر مخصص له (مثل سلايدر) نسيبه
  if (findScroller(e.target, 'x')) return;

  const scroller = findScroller(e.target, 'y');
  if (!scroller) {
    // مفيش منطقة تمرير تحت الصباع: نمنع حركة الصفحة
    e.preventDefault();
    return;
  }

  // منع تمرير الحركة للخلفية عند أول أو آخر المحتوى
  const dy = (e.touches[0]?.clientY ?? 0) - touchStartY; // موجب = الصباع نازل (المحتوى بيرجع لفوق)
  const atTop = scroller.scrollTop <= 0;
  const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
  if ((atTop && dy > 0) || (atBottom && dy < 0)) e.preventDefault();
}

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

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
}

function unlockBody() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  document.removeEventListener('touchstart', onTouchStart);
  document.removeEventListener('touchmove', onTouchMove);

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