import { supabase } from '@/lib/supabase';
import { invalidateCatalog } from '@/lib/queryClient';

const databaseName = 'celia-offline-orders';
const storeName = 'pending-orders';
let syncInProgress = false;

export interface OfflineCheckoutDraft {
  idempotencyKey: string;
  customerId: string;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string;
  governorate: string;
  address: string;
  deliveryNotes: string;
  transactionRef: string;
  paymentMethod: 'cod' | 'vodafone_cash' | 'instapay' | 'fawry';
  language: 'ar' | 'en';
  saveAddress: boolean;
  location: { lat: number; lng: number } | null;
  lines: Array<{ productId: string; quantity: number }>;
  receipt: { blob: Blob; name: string; type: string } | null;
  createdAt: string;
  lastError?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'idempotencyKey' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open offline order storage'));
  });
}

async function readAllDrafts(): Promise<OfflineCheckoutDraft[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as OfflineCheckoutDraft[]);
    request.onerror = () => reject(request.error ?? new Error('Could not read offline orders'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

export async function saveOfflineOrder(draft: OfflineCheckoutDraft): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(draft);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Could not save the offline order'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error('Offline order storage was aborted'));
    };
  });
}

export async function findPendingOfflineOrder(customerId: string): Promise<OfflineCheckoutDraft | null> {
  const drafts = await readAllDrafts();
  return drafts
    .filter((draft) => draft.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

async function deleteOfflineOrder(idempotencyKey: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(idempotencyKey);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('Could not remove the synchronized order'));
    };
  });
}

async function updateDraftError(draft: OfflineCheckoutDraft, error: unknown): Promise<void> {
  await saveOfflineOrder({
    ...draft,
    lastError: error instanceof Error ? error.message : String(error),
  });
}

export async function submitOfflineCheckoutDraft(draft: OfflineCheckoutDraft): Promise<string> {
  let receiptUrl = '';
  if (draft.receipt) {
    const extension = draft.receipt.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const filePath = `receipts/${draft.customerId}-${draft.idempotencyKey}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('orders')
      .upload(filePath, draft.receipt.blob, {
        contentType: draft.receipt.type || 'application/octet-stream',
        upsert: true,
      });
    if (uploadError) throw uploadError;
    receiptUrl = supabase.storage.from('orders').getPublicUrl(filePath).data.publicUrl;
  }

  const addressText = draft.address.trim() || (draft.language === 'ar' ? 'حسب الموقع المحدد على الخريطة' : 'As pinned on the map');
  const locationNote = draft.location
    ? `[الموقع: https://maps.google.com/?q=${draft.location.lat},${draft.location.lng}]`
    : '';
  const paymentNote = draft.paymentMethod !== 'cod'
    ? `[طريقة الدفع: ${draft.paymentMethod} | المرجع: ${draft.transactionRef}${receiptUrl ? ` | رابط الإيصال: ${receiptUrl}` : ''}]`
    : '';
  const shippingAddress = `${draft.governorate} - ${addressText} ${paymentNote} ${locationNote} ${draft.deliveryNotes ? `[ملاحظات: ${draft.deliveryNotes}]` : ''}`.trim();

  const { data, error } = await supabase.rpc('place_order', {
    p_idempotency_key: draft.idempotencyKey,
    p_customer_name: draft.customerName.trim(),
    p_customer_phone: draft.customerPhone.trim(),
    p_customer_email: draft.customerEmail,
    p_payment_method: draft.paymentMethod,
    p_city: draft.governorate.trim(),
    p_address: addressText,
    p_shipping_address: shippingAddress,
    p_delivery_lat: draft.location?.lat ?? null,
    p_delivery_lng: draft.location?.lng ?? null,
    p_delivery_notes: draft.deliveryNotes.trim() || null,
    p_order_notes: draft.transactionRef.trim() || null,
    p_language: draft.language,
    p_items: draft.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  });
  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  const orderId = result && typeof result === 'object' && 'id' in result
    ? String((result as { id: string }).id)
    : '';
  if (!orderId) throw new Error('The server did not return the created order ID');
  await invalidateCatalog();

  if (draft.saveAddress) {
    try {
      await supabase.from('profiles').update({
        governorate: draft.governorate.trim(),
        address: draft.address.trim(),
        address_lat: draft.location?.lat ?? null,
        address_lng: draft.location?.lng ?? null,
      }).eq('id', draft.customerId);
    } catch {
      // Address updates are best-effort and must not block an order.
    }
  }

  return orderId;
}

export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('failed to fetch') || message.includes('network request failed') || message.includes('load failed');
}

export async function syncPendingOfflineOrders(customerId: string): Promise<number> {
  if (!navigator.onLine || syncInProgress) return 0;
  syncInProgress = true;
  let synchronized = 0;

  try {
    const drafts = (await readAllDrafts())
      .filter((draft) => draft.customerId === customerId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    for (const draft of drafts) {
      try {
        const orderId = await submitOfflineCheckoutDraft(draft);
        await deleteOfflineOrder(draft.idempotencyKey);
        synchronized += 1;
        window.dispatchEvent(new CustomEvent('celia:offline-order-synced', {
          detail: { idempotencyKey: draft.idempotencyKey, orderId },
        }));
      } catch (error) {
        await updateDraftError(draft, error);
        if (!isNetworkFailure(error)) throw error;
        break;
      }
    }
  } finally {
    syncInProgress = false;
  }

  return synchronized;
}
