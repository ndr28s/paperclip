import React, { createContext, useContext, useEffect, useState } from "react";
import { getBaseUrl } from "../api/client";

interface SessionUser {
  id: string;
  name: string;
  email: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({ user: null, loading: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getBaseUrl()}/auth/get-session`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data?.user?.id) {
          setUser({ id: data.user.id, name: data.user.name, email: data.user.email });
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
