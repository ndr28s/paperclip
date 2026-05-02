import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi, clearSessionCookie } from "../api/client";

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const session = await authApi.getSession();
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = async (email: string, password: string) => {
    await authApi.signIn(email, password);
    await loadSession();
  };

  const signUp = async (name: string, email: string, password: string) => {
    await authApi.signUp(name, email, password);
    await loadSession();
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
    } finally {
      await clearSessionCookie();
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await authApi.getProfile();
      setUser(profile);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
