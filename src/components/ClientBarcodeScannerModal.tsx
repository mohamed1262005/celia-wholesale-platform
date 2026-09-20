import React, { useEffect, useState, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { supabase } from '@/lib/supabase';
import { ScanLine, Package, ShoppingCart } from 'lucide-react';

interface ClientBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: any) => void; // إضافة المنتج للسلة مباشرة
}

export function ClientBarcodeScannerModal({ isOpen, onClose, onAddToCart }: ClientBarcodeScannerModalProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const qrScanner = new QrScanner(
      videoRef.current,
      async (result) => {
        const code = result?.data;
        if (!code) return;

        if (lastScannedRef.current === code) return;
        lastScannedRef.current = code;

        if (scannerRef.current) {
          scannerRef.current.stop();
        }

        await handleBarcodeScanned(code);
      },
      {
        maxScansPerSecond: 30,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    scannerRef.current = qrScanner;

    qrScanner.start().catch((err) => {
      console.error("خطأ في تشغيل الكاميرا:", err);
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleBarcodeScanned = async (code: string) => {
    setLoading(true);
    setStatusMessage(`جاري البحث عن المنتج برقم الباركود: ${code}...`);
    
    try {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', code)
        .single();

      if (!fetchError && product) {
        // العثور على المنتج، إضافته للسلة مباشرة وإغلاق الماسح
        onAddToCart(product);
        onClose();
      } else {
        alert('عذراً، هذا المنتَج غير مسجل في النظام برقم الباركود هذا.');
        // إعادة تفعيل الماسح للمحاولة مرة أخرى
        lastScannedRef.current = null;
        if (scannerRef.current) {
          scannerRef.current.start();
        }
      }
    } catch (err: any) {
      console.error('خطأ:', err.message);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary-600 animate-pulse" />
            <h3 className="text-base font-extrabold text-gray-900">مسح الباركود السريع 🛒</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 font-bold cursor-pointer transition-all">✕</button>
        </div>

        <div className="text-center text-xs text-gray-500 font-medium">
          وجه الكاميرا نحو باركود المنتج لإضافته إلى السلة فوراً ⚡
        </div>

        <div className="relative w-full overflow-hidden rounded-2xl border-2 border-gray-200 bg-black aspect-[4/3] flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover absolute inset-0"></video>
        </div>

        {loading && (
          <div className="text-center text-primary-600 font-bold text-xs animate-pulse">
            {statusMessage}
          </div>
        )}

        <div className="pt-2 border-t flex justify-between items-center">
          <span className="text-[11px] text-gray-400 font-medium">الماسح جاهز للعمل</span>
          <button 
            onClick={onClose}
            className="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-900 cursor-pointer transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientBarcodeScannerModal;