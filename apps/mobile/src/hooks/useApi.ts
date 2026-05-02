// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useCompany } from '../context/CompanyContext';

// ── Simple in-memory cache (TTL: 30s) ──────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data as T;
}
function setCached(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

export function useCompanyData<T>(path: string | null) {
  const { companyId } = useCompany();
  const cacheKey = companyId && path ? `/companies/${companyId}${path}` : null;

  // Serve cached data immediately so tab switches feel instant
  const [data, setData] = useState<T | null>(() => (cacheKey ? getCached<T>(cacheKey) : null));
  const [loading, setLoading] = useState(() => !cacheKey || !getCached(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (force = false) => {
    if (!companyId || !path || !cacheKey) { setLoading(false); return; }
    // If we have fresh cache and this isn't a forced reload, skip
    const cached = getCached<T>(cacheKey);
    if (cached && !force) { setData(cached); setLoading(false); return; }
    if (!cached) setLoading(true);
    try {
      const result = await api.get<T>(`/companies/${companyId}${path}`);
      if (!mountedRef.current) return;
      setCached(cacheKey, result);
      setData(result);
      setError(null);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e.message ?? 'Failed to load');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [companyId, path, cacheKey]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: () => load(true) };
}

export function useItemData<T>(path: string | null) {
  const cached = path ? getCached<T>(path) : null;
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (force = false) => {
    if (!path) { setLoading(false); return; }
    const c = getCached<T>(path);
    if (c && !force) { setData(c); setLoading(false); return; }
    if (!c) setLoading(true);
    try {
      const result = await api.get<T>(path);
      if (!mountedRef.current) return;
      setCached(path, result);
      setData(result);
      setError(null);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e.message ?? 'Failed to load');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: () => load(true) };
}
