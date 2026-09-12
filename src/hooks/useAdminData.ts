import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdminData<T>(
  table: string,
  select: string,
  orderColumn: string
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: result, error } = await supabase
      .from(table)
      .select(select)
      .order(orderColumn, { ascending: false });
    if (error) {
      setError(error.message);
      setData([]);
    } else {
      setData(result as T[]);
    }
    setLoading(false);
  }, [table, select, orderColumn]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}
