import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paper } from '@/types';

export function usePapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const res = await api.papers();

      if (cancelled) return;

      if (res.error) {
        setError(res.error);
        setPapers([]);
      } else {
        setPapers(res.data ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { papers, loading, error };
}
