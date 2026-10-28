import React, { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // بنتتبع الـ timeout الحالي عشان نلغيه لو ظهر توست جديد قبل ما القديم يختفي لوحده
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    // نلغي أي مؤقت قديم عشان ميمسحش الإشعار الجديد بالغلط بعدين
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const id = crypto.randomUUID();
    // بنستبدل القائمة بالكامل بعنصر واحد بس — القديم بيختفي فورًا والجديد ياخد مكانه في نفس اللحظة
    setToasts([{ id, message, type }]);

    timeoutRef.current = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timeoutRef.current = null;
    }, 3500);
  }, []);

  // ملحوظة: عرض الإشعارات بيتم بالكامل من <ToastContainer /> الموجود في App.tsx
  // (كنا قبل كده بنرسمها هنا كمان، وده اللي كان بيظهر الرسالة الخضرا المكررة)
  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}