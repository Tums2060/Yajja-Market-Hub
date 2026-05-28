import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem("yajja_token")
  );
  

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("yajja_token", newToken);
    } else {
      localStorage.removeItem("yajja_token");
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
    queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
  };

  // Configure api client
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("yajja_token"));
  }, []);

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false
    }
  });

  const activeUser = token ? user : null;

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        isLoading: isUserLoading,
        token,
        setToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
