import { useLanguage } from '@/contexts/LanguageContext';
import type { OrderStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';

const statusConfig: Record<string, { variant: 'info' | 'warning' | 'success' | 'error' | 'neutral'; key: string }> = {
  new: { variant: 'info', key: 'new' },
  processing: { variant: 'warning', key: 'processing' },
  confirmed: { variant: 'success', key: 'confirmed' },
  delivered: { variant: 'success', key: 'delivered' },
  cancelled: { variant: 'error', key: 'cancelled' },
};

export function StatusBadge({ status }: { status?: string }) {
  const { t } = useLanguage();
  
  // حماية تامية: لو الـ status مش موجودة أو غير معروفة، نعتبرها 'new' مؤقتاً
  const safeStatus = (status && statusConfig[status]) ? status : 'new';
  const config = statusConfig[safeStatus];

  return (
    <Badge variant={config.variant} dot>
      {t(config.key as any) || safeStatus}
    </Badge>
  );
}

export default StatusBadge;