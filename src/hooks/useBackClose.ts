import { useEffect, useRef } from 'react';
import { pushBackLayer } from '@/lib/backStack';

// بيسجّل النافذة كطبقة: زر الرجوع في الأندرويد يقفلها بدل ما يطلع من الصفحة
export function useBackClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return pushBackLayer(() => closeRef.current());
  }, [open]);
}

export default useBackClose;