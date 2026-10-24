import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSummary, LoginRequest, CompanySetupRequest, SetupStatusResponse } from "@hcm-lite/shared";
import { api } from "@/services/api";

interface CompanySummary {
  id: string;
  name: string;
  timezone: string;
}

interface AuthContextType {
  user: UserSummary | null;
  company: CompanySummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setupStatus: SetupStatusResponse | null;
  isCheckingSetup: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  initializeSetup: (data: CompanySetupRequest) => Promise<void>;
  checkSetupStatus: () => Promise<SetupStatusResponse | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("hcm_auth_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState<boolean>(true);

  const checkSetupStatus = async (): Promise<SetupStatusResponse | null> => {
    setIsCheckingSetup(true);
    try {
      const status = await api.getSetupStatus();
      setSetupStatus(status);
      return status;
    } catch (err) {
      // If backend is not yet accessible or network error
      return null;
    } finally {
      setIsCheckingSetup(false);
    }
  };

  useEffect(() => {
    async function initSession() {
      await checkSetupStatus();

      const storedToken = localStorage.getItem("hcm_auth_token");
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile.user);
          setCompany(profile.company);
        } catch (err: any) {
          // Token expired, invalid or account deactivated
          localStorage.removeItem("hcm_auth_token");
          localStorage.removeItem("hcm_auth_user");
          localStorage.removeItem("hcm_auth_company");
          setToken(null);
          setUser(null);
          setCompany(null);
        }
      }
      setIsLoading(false);
    }

    initSession();
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const session = await api.login(credentials);
      setUser(session.user);
      setCompany(session.company);
      setToken(session.token);
      localStorage.setItem("hcm_auth_token", session.token);
      localStorage.setItem("hcm_auth_user", JSON.stringify(session.user));
      localStorage.setItem("hcm_auth_company", JSON.stringify(session.company));
      await checkSetupStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setCompany(null);
    setToken(null);
    localStorage.removeItem("hcm_auth_token");
    localStorage.removeItem("hcm_auth_user");
    localStorage.removeItem("hcm_auth_company");
  };

  const initializeSetup = async (data: CompanySetupRequest) => {
    setIsLoading(true);
    try {
      const session = await api.initializeSetup(data);
      setUser(session.user);
      setCompany(session.company);
      setToken(session.token);
      localStorage.setItem("hcm_auth_token", session.token);
      localStorage.setItem("hcm_auth_user", JSON.stringify(session.user));
      localStorage.setItem("hcm_auth_company", JSON.stringify(session.company));
      setSetupStatus({
        setupCompleted: true,
        company: {
          id: session.company.id,
          name: session.company.name,
          timezone: session.company.timezone,
          officeStartTime: data.officeStartTime,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        setupStatus,
        isCheckingSetup,
        login,
        logout,
        initializeSetup,
        checkSetupStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
