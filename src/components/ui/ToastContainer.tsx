import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  // جلب أحدث إشعار واحد فقط لمنع أي تكدس أو تراكم نهائياً
  const latestToast = toasts[toasts.length - 1];

  return (
    <div className="fixed top-4 start-1/2 -translate-x-1/2 z-[99999] pointer-events-none px-4 w-full flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 bg-gray-900/95 text-white backdrop-blur-md rounded-xl shadow-2xl px-3 py-2 border border-white/10 animate-slide-down max-w-[260px] w-auto">
        {latestToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
        {latestToast.type === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
        {latestToast.type === 'info' && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
        
        <p className="text-xs font-semibold tracking-wide text-white truncate">
          {latestToast.message}
        </p>
        
        <button 
          onClick={() => dismissToast(latestToast.id)} 
          className="text-gray-400 hover:text-white transition-colors cursor-pointer flex-shrink-0 ms-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default ToastContainer;