import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MOCK_PAPERS } from '@/constants';
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
        setPapers(MOCK_PAPERS);
      } else {
        const nextPapers = res.data && res.data.length > 0 ? res.data : MOCK_PAPERS;
        setPapers(nextPapers);
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
