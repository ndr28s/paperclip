import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './client';
import type { RawMeetingSession, RawMeetingMessage } from './types';

function useApiData<T>(
  url: string | null,
  deps: unknown[] = [],
  pollInterval?: number,
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    api.get<T>(url)
      .then(d => { setData(d); setError(null); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    doFetch();
    if (pollInterval && url) {
      timerRef.current = setInterval(doFetch, pollInterval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [doFetch, pollInterval, url]);

  return { data, loading, error, refetch: doFetch };
}

export function useCompanyId(): string | null {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ id: string; status?: string }[]>('/companies')
      .then(companies => {
        if (companies?.length) {
          const active = companies.find(c => c.status === 'active') ?? companies[0];
          setCompanyId(active.id);
        }
      })
      .catch(() => {/* offline / no auth — meetings screen will show error state */});
  }, []);
  return companyId;
}

export function useActiveSession(companyId: string | null) {
  return useApiData<RawMeetingSession | null>(
    companyId ? `/companies/${companyId}/meeting-sessions/active` : null,
    [companyId],
    5000,  // poll every 5s
  );
}

export function useMeetingMessages(companyId: string | null, sessionId: string | null) {
  return useApiData<RawMeetingMessage[]>(
    companyId && sessionId ? `/companies/${companyId}/meeting-sessions/${sessionId}/messages` : null,
    [companyId, sessionId],
    3000,  // poll every 3s when session active
  );
}

export type { RawMeetingSession, RawMeetingMessage };
