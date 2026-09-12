import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="flex items-center gap-3 bg-white rounded-xl shadow-float px-4 py-3 animate-slide-up border border-gray-100"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-error-500 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-secondary-500 flex-shrink-0" />}
          <p className="text-sm font-medium text-gray-800 flex-1">{toast.message}</p>
          <button onClick={() => dismissToast(toast.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
