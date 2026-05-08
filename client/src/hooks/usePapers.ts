import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paper } from '@/types';

export function usePapers() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const res = await api.papers();

      if (cancelled) return;

      if (res.error) {
        setError(res.error);
        // Preserve last successful results so UI doesn't go blank on transient failures.
      } else {
        // API now returns { papers, total, page, limit }
        setPapers(res.data?.papers ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(() => {
    const interval = globalThis.setInterval(() => {
      setReloadTick((tick) => tick + 1);
    }, 15000);
    return () => {
      globalThis.clearInterval(interval);
    };
  }, []);

  const reload = () => setReloadTick((tick) => tick + 1);

  return { papers, loading, error, reload };
}
