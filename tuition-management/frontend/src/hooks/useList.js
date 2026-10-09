import { useCallback, useEffect, useState } from 'react';

/**
 * Small data-fetching helper for list pages.
 * `fetcher` must be a stable reference (e.g. imported API method) so it does
 * not trigger an infinite loop.
 */
export function useList(fetcher, initialParams = {}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(params);
      setData(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetcher, params]);

  useEffect(() => {
    load();
  }, [load]);

  const updateParams = useCallback((patch) => {
    setParams((prev) => ({ ...prev, ...patch, ...(patch.page ? {} : { page: 1 }) }));
  }, []);

  return { data, meta, loading, error, params, setParams, updateParams, reload: load };
}

export default useList;
