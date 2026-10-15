import React, { useEffect, useState, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { supabase } from '@/lib/supabase';
import { ScanLine, Package, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onSuccess }: BarcodeScannerModalProps) {
  const [mode, setMode] = useState<'sell' | 'add'>('sell');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [newProductCode, setNewProductCode] = useState<string | null>(null);
  const [newNameAr, setNewNameAr] = useState('');
  const [newStockQty, setNewStockQty] = useState('1');
  const [newPrice, setNewPrice] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const [quantityInput, setQuantityInput] = useState('1');

  const lastScannedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || newProductCode || pendingProduct || !videoRef.current) return;

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
  }, [isOpen, newProductCode, pendingProduct]);

  const handleBarcodeScanned = async (code: string) => {
    setLoading(true);
    setStatusMessage(`جاري التحقق من الكود: ${code}...`);
    
    try {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', code)
        .single();

      if (!fetchError && product) {
        setPendingProduct(product);
        setQuantityInput('1');
        setLoading(false);
        setStatusMessage('');
        return;
      }

      setStatusMessage('');
      setNewProductCode(code);
      setNewNameAr('');
      setNewImageUrl('');
      setNewStockQty('1');
      setNewPrice('');

    } catch (err: any) {
      console.error('خطأ:', err.message);
      setNewProductCode(code);
      setNewNameAr('');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        console.warn("خطأ الرفع لـ Storage، جاري استخدام رابط محلي:", uploadError.message);
        const localUrl = URL.createObjectURL(file);
        setNewImageUrl(localUrl);
        setUploadingImage(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setNewImageUrl(publicUrlData.publicUrl);
      }
    } catch (err: any) {
      alert('فشل رفع الصورة: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleConfirmStockOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingProduct) return;

    setLoading(true);
    const qtyToAdd = parseInt(quantityInput) || 1;
    const currentStock = Number(pendingProduct.stock_quantity ?? 0);

    try {
      if (mode === 'sell') {
        if (currentStock < qtyToAdd) {
          alert(`الكمية المطلوبة للبيع غير متوفرة! المتاح بالمخزن: ${currentStock}`);
          setLoading(false);
          return;
        }
        const newStock = currentStock - qtyToAdd;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', pendingProduct.id);
        onSuccess(`تم بيع (${qtyToAdd}) قطعة من: ${pendingProduct.name_ar || pendingProduct.name_en} 🛒`);
      } else {
        const newStock = currentStock + qtyToAdd;
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', pendingProduct.id);
        onSuccess(`تم توريد (${qtyToAdd}) قطعة لـ: ${pendingProduct.name_ar || pendingProduct.name_en} 📦`);
      }

      setPendingProduct(null);
      lastScannedRef.current = null;
    } catch (err: any) {
      alert('خطأ في التحديث: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManualProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductCode) return;
    setLoading(true);

    try {
      const { data: newProd, error: insertError } = await supabase
        .from('products')
        .insert({
          barcode: newProductCode,
          name_en: newNameAr,
          name_ar: newNameAr,
          image_url: newImageUrl.trim() ? newImageUrl.trim() : null,
          stock_quantity: parseInt(newStockQty) || 1,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (newProd) {
        await supabase.from('pricing_tiers').insert({
          product_id: newProd.id,
          min_quantity: 1,
          max_quantity: null,
          unit_price: parseFloat(newPrice) || 0,
          sort_order: 0
        });

        onSuccess(`تمت إضافة "${newNameAr}" بنجاح للمخزن! 🚀`);
        setNewProductCode(null);
        setNewImageUrl('');
        lastScannedRef.current = null;
      }
    } catch (err: any) {
      alert('خطأ في الحفظ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary-600 animate-pulse" />
            <h3 className="text-base font-extrabold text-gray-900">الماسح المباشر للمخزن ⚡</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 font-bold cursor-pointer transition-all">✕</button>
        </div>

        {newProductCode ? (
          <form onSubmit={handleSaveManualProduct} className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span>✨ كود جديد غير مسجل، أضف بياناته سريِعاً:</span>
                <p className="text-[11px] font-mono text-gray-600 mt-0.5 truncate max-w-[200px]">الباركود: {newProductCode}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">اسم المنتج *</label>
              <input 
                type="text" 
                value={newNameAr} 
                onChange={(e) => setNewNameAr(e.target.value)} 
                placeholder="اكتب اسم المنتج (مثال: شوكولاتة ديلايت)"
                autoFocus
                required
                className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">صورة المنتج (رفع من الجهاز)</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                  {newImageUrl ? (
                    <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition border border-gray-200">
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span>جاري رفع الصورة...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-primary-600" />
                      <span>اختر صورة المنتج</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الكمية الأولية *</label>
                <input 
                  type="number" 
                  min="1"
                  value={newStockQty} 
                  onChange={(e) => setNewStockQty(e.target.value)} 
                  required
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary-500 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">السعر (جنيه) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={newPrice} 
                  onChange={(e) => setNewPrice(e.target.value)} 
                  placeholder="0.00"
                  required
                  className="w-full p-2.5 border rounded-xl text-sm outline-none focus:border-primary-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setNewProductCode(null); lastScannedRef.current = null; }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">إلغاء</button>
              <button type="submit" disabled={loading || uploadingImage} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 cursor-pointer shadow-md">حفظ بالمخزن</button>
            </div>
          </form>
        ) : pendingProduct ? (
          <form onSubmit={handleConfirmStockOperation} className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3">
              {pendingProduct.image_url ? (
                <img src={pendingProduct.image_url} alt="" className="w-14 h-14 object-cover rounded-xl border border-purple-200" />
              ) : (
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center"><Package className="w-7 h-7 text-purple-600" /></div>
              )}
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{pendingProduct.name_ar || pendingProduct.name_en}</h4>
                <p className="text-xs text-gray-500 mt-0.5">المخزن الحالي: <span className="font-bold text-purple-700 font-mono text-sm">{pendingProduct.stock_quantity ?? 0}</span> قطعة</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {mode === 'sell' ? 'حدد الكمية المراد بيعها 🛒:' : 'حدد الكمية المراد توريدها 📦:'}
              </label>
              <input 
                type="number" 
                min="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                autoFocus
                required
                className="w-full p-3 border-2 border-primary-400 rounded-xl text-base outline-none font-mono font-bold text-center"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => { setPendingProduct(null); lastScannedRef.current = null; }} 
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className={`flex-1 py-3 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md ${mode === 'sell' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {mode === 'sell' ? 'تأكيد عملية البيع' : 'تأكيد عملية التوريد'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('sell')}
                className={`flex-1 py-2 rounded-xl font-bold transition text-xs cursor-pointer ${mode === 'sell' ? 'bg-red-600 text-white shadow-md shadow-red-500/20' : 'bg-gray-100 text-gray-700'}`}
              >
                🛒 وضع البيع (خصم كمية)
              </button>
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex-1 py-2 rounded-xl font-bold transition text-xs cursor-pointer ${mode === 'add' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-gray-100 text-gray-700'}`}
              >
                📦 وضع التوريد (زيادة كمية)
              </button>
            </div>

            <div className="text-center text-xs text-gray-500 font-medium">
              وجه الكاميرا نحو باركود المنتج لتبدأ القراءة الفورية 🎯
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl border-2 border-gray-200 bg-black aspect-[4/3] flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover absolute inset-0"></video>
            </div>

            {loading && (
              <div className="text-center text-primary-600 font-bold text-xs animate-pulse">
                {statusMessage || 'جاري المعالجة...'}
              </div>
            )}

            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-[11px] text-gray-400 font-medium">الماسح المباشر مفعل ⚡</span>
              <button 
                onClick={onClose}
                className="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-900 cursor-pointer transition-all"
              >
                إغلاق الماسح
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BarcodeScannerModal;