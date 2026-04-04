"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AuthUser {
  id: string;
  privyId: string;
  email?: string;
  name?: string;
  role: "ADMIN" | "EMPLOYEE";
  unlinkAddress?: string;
  evmAddress?: string;
  ensName?: string;
  profileCompleted?: boolean;
  organization?: any;
}

export function useAuth() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  const verifyAndFetch = useCallback(async () => {
    if (!authenticated) {
      setAuthUser(null);
      setOnboarded(null);
      setLoading(false);
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await api.auth.verify(token);

      if (res.onboarded && res.user) {
        setAuthUser(res.user);
        setOnboarded(true);
      } else {
        setOnboarded(false);
      }
    } catch {
      setOnboarded(false);
    } finally {
      setLoading(false);
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (ready) {
      verifyAndFetch();
    }
  }, [ready, authenticated, verifyAndFetch]);

  const signOut = useCallback(async () => {
    await logout();
    setAuthUser(null);
    setOnboarded(null);
    router.push("/");
  }, [logout, router]);

  return {
    ready,
    authenticated,
    user: authUser,
    privyUser: user,
    loading: !ready || loading,
    onboarded,
    login,
    logout: signOut,
    getAccessToken,
    refresh: verifyAndFetch,
  };
}
