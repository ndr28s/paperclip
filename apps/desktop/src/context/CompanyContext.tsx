import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

export interface Company {
  id: string;
  name: string;
  mark?: string;
  markBg?: string;
  plan?: string;
  brandColor?: string | null;
  budgetMonthlyCents?: number;
  spentMonthlyCents?: number;
  status?: string;
}

interface CompanyContextValue {
  company: Company | null;
  companies: Company[];
  companyId: string | null;
  loading: boolean;
  fetched: boolean;
  switchCompany: (company: Company) => void;
  reload: () => void;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  companies: [],
  companyId: null,
  loading: true,
  fetched: false,
  switchCompany: () => {},
  reload: () => {},
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function load(attempt = 0) {
      api.get<Company[]>("/companies")
        .then(list => {
          if (cancelled) return;
          if (list && list.length > 0) {
            setCompanies(list);
            const active = list.find(c => c.status === "active") || list[0];
            setCompany(active);
          }
          setLoading(false);
          setFetched(true);
        })
        .catch(err => {
          if (cancelled) return;
          console.warn(`Failed to load companies (attempt ${attempt + 1}):`, err);
          if (attempt < 10) {
            const delay = Math.min(500 * Math.pow(1.5, attempt), 5000);
            retryTimer = setTimeout(() => load(attempt + 1), delay);
          } else {
            setLoading(false);
          }
        });
    }

    load();
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
  }, [reloadKey]);

  const switchCompany = (c: Company) => setCompany(c);
  const reload = () => {
    setFetched(false);
    setLoading(true);
    setReloadKey(k => k + 1);
  };

  return (
    <CompanyContext.Provider value={{
      company,
      companies,
      companyId: company?.id ?? null,
      loading,
      fetched,
      switchCompany,
      reload,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
