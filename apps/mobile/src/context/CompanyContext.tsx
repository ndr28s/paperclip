import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CompanyContextValue {
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (c: Company) => void;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await api.get<Company[]>("/api/companies");
      setCompanies(data);
      if (data.length > 0 && !activeCompany) {
        setActiveCompany(data[0]);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [user, activeCompany]);

  useEffect(() => {
    reload();
  }, [user]);

  return (
    <CompanyContext.Provider
      value={{ companies, activeCompany, setActiveCompany, isLoading, reload }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
