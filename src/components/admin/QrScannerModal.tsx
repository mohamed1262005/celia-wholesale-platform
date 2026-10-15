import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Camera, Upload, ScanLine, CheckCircle2, AlertCircle, Package, Link2, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  onAddNew: (scannedData: string) => void;
}

type ScanState = 'idle' | 'scanning' | 'decoding' | 'found' | 'notfound' | 'error';

export function QrScannerModal({ open, onClose, onProductFound, onAddNew }: QrScannerModalProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [state, setState] = useState<ScanState>('idle');
  const [scannedData, setScannedData] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setState('idle');
      setScannedData('');
      setFoundProduct(null);
    }
    return () => stopCamera();
  }, [open, stopCamera]);

  const lookupProduct = useCallback(async (data: string): Promise<Product | null> => {
    const trimmed = data.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const tryFields: { column: string; value: string }[] = [];

    if (uuidRegex.test(trimmed)) {
      tryFields.push({ column: 'id', value: trimmed });
    }
    tryFields.push(
      { column: 'name_en', value: trimmed },
      { column: 'name_ar', value: trimmed },
    );

    for (const { column, value } of tryFields) {
      const { data: rows } = await supabase
        .from('products')
        .select('*, category:categories(*), pricing_tiers:pricing_tiers(*)')
        .eq(column, value)
        .limit(1);
      if (rows && rows.length > 0) {
        return rows[0] as Product;
      }
    }
    return null;
  }, []);

  const handleDecoded = useCallback(async (data: string) => {
    setScannedData(data);
    setState('decoding');
    stopCamera();
    const product = await lookupProduct(data);
    if (product) {
      setFoundProduct(product);
      setState('found');
      showToast(t('qrProductFound'), 'success');
    } else {
      setFoundProduct(null);
      setState('notfound');
    }
  }, [lookupProduct, stopCamera, showToast, t]);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      handleDecoded(code.data);
      return;
    }
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [handleDecoded]);

  const startCamera = useCallback(async () => {
    setState('scanning');
    setFoundProduct(null);
    setScannedData('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      animationRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setState('error');
      showToast(t('cameraError'), 'error');
    }
  }, [scanFrame, showToast, t]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState('decoding');
    setFoundProduct(null);
    setScannedData('');
    try {
      const img = await loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no ctx');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const code = jsQR(imageData.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (code && code.data) {
        handleDecoded(code.data);
      } else {
        setState('idle');
        showToast(t('noQrFound'), 'error');
      }
    } catch {
      setState('error');
      showToast(t('noQrFound'), 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleDecoded, showToast, t]);

  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const reset = () => {
    stopCamera();
    setState('idle');
    setScannedData('');
    setFoundProduct(null);
    if (mode === 'camera') {
      startCamera();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('qrScan')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{t('qrScanDesc')}</p>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => { stopCamera(); setMode('camera'); setState('idle'); setFoundProduct(null); setScannedData(''); }}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'camera' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Camera className="w-4 h-4" />
            {t('scanWithCamera')}
          </button>
          <button
            onClick={() => { stopCamera(); setMode('upload'); setState('idle'); setFoundProduct(null); setScannedData(''); }}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'upload' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Upload className="w-4 h-4" />
            {t('uploadQrImage')}
          </button>
        </div>

        {/* Camera mode */}
        {mode === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-square">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-8 border-2 border-white/70 rounded-2xl" />
                  <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white/50 animate-pulse" />
                </div>
              )}
              {!cameraActive && state !== 'scanning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                  <Camera className="w-12 h-12 mb-3" />
                  <p className="text-sm">{t('startCamera')}</p>
                </div>
              )}
              {state === 'scanning' && !cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-white/80">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>
            {!cameraActive ? (
              <Button onClick={startCamera} className="w-full">
                <Camera className="w-4 h-4" />
                {t('startCamera')}
              </Button>
            ) : (
              <Button variant="outline" onClick={stopCamera} className="w-full">
                {t('stopCamera')}
              </Button>
            )}
          </div>
        )}

        {/* Upload mode */}
        {mode === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary-300 transition-colors py-12 flex flex-col items-center gap-3 text-gray-400 hover:text-primary-500"
            >
              {state === 'decoding' ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <Upload className="w-10 h-10" />
              )}
              <span className="text-sm font-semibold">{t('uploadQrImage')}</span>
            </button>
          </div>
        )}

        {/* Decoding state */}
        {state === 'decoding' && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('qrLookingUp')}
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <AlertCircle className="w-10 h-10 text-error-400" />
            <p className="text-sm text-gray-500">{t('cameraError')}</p>
            <Button variant="outline" size="sm" onClick={reset}>{t('retry')}</Button>
          </div>
        )}

        {/* Found state */}
        {state === 'found' && foundProduct && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">{t('qrProductFound')}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {foundProduct.image_url ? (
                  <img src={foundProduct.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-primary-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{foundProduct.name_en}</p>
                <p className="text-xs text-gray-400 truncate">{foundProduct.packaging || foundProduct.name_ar}</p>
                <p className="text-xs text-gray-400 truncate font-mono mt-0.5">{scannedData.slice(0, 40)}{scannedData.length > 40 ? '…' : ''}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">{t('retry')}</Button>
              <Button onClick={() => onProductFound(foundProduct)} className="flex-1">
                {t('qrViewProduct')}
              </Button>
            </div>
          </div>
        )}

        {/* Not found state */}
        {state === 'notfound' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warning-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold">{t('qrProductNotFound')}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 mb-1 font-semibold">{t('qrDecodedData')}</p>
              <p className="text-sm text-gray-700 font-mono break-all">{scannedData}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">{t('retry')}</Button>
              <Button onClick={() => onAddNew(scannedData)} className="flex-1">
                <Link2 className="w-4 h-4" />
                {t('qrAddToInventory')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
