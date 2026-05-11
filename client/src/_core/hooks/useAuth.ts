import { trpc } from "@/lib/trpc";
import { firebaseLogin, firebaseLogout, firebaseRegister, isFirebaseEnabled, waitForFirebaseUser, type FirebaseSessionUser } from "@/lib/firebase";
import { getZeroCardCurrentUser } from "@/lib/zeroCard";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const utils = trpc.useUtils();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseSessionUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(isFirebaseEnabled);
  const [zeroCardUser, setZeroCardUser] = useState(() =>
    isFirebaseEnabled ? null : getZeroCardCurrentUser()
  );

  useEffect(() => {
    if (!isFirebaseEnabled) return;

    waitForFirebaseUser().then((user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
    });
  }, []);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !isFirebaseEnabled,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Update local state immediately with response data
      if (data.user) {
        setZeroCardUser(data.user);
        // Invalidate the me query to sync cache
        utils.auth.me.invalidate();
      }
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      // Update local state immediately with response data
      if (data.user) {
        setZeroCardUser(data.user);
        // Invalidate the me query to sync cache
        utils.auth.me.invalidate();
      }
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const login = useCallback(
    async (username: string, password: string) => {
      if (isFirebaseEnabled) {
        const user = await firebaseLogin(username, password);
        setFirebaseUser(user);
        setFirebaseLoading(false);
        return {
          success: true,
          username,
        };
      }

      const result = await loginMutation.mutateAsync({ username, password });
      // Store user in local state
      if (result.user) {
        setZeroCardUser(result.user);
      }
      return result;
    },
    [loginMutation]
  );

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      if (isFirebaseEnabled) {
        const user = await firebaseRegister(username, password, email);
        setFirebaseUser(user);
        setFirebaseLoading(false);
        return {
          success: true,
          username,
        };
      }

      const result = await registerMutation.mutateAsync({ username, password, email });
      // Store user in local state
      if (result.user) {
        setZeroCardUser(result.user);
      }
      return result;
    },
    [registerMutation]
  );

  const logout = useCallback(async () => {
    if (isFirebaseEnabled) {
      await firebaseLogout();
      setFirebaseUser(null);
      return;
    }

    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      setZeroCardUser(null);
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    if (isFirebaseEnabled) {
      const user = firebaseUser
        ? {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.username || "Player",
            email: firebaseUser.email,
            role: "user",
          }
        : null;

      return {
        user,
        loading: firebaseLoading,
        error: null,
        isAuthenticated: Boolean(user),
      };
    }

    const user = meQuery.data ?? zeroCardUser ?? null;

    if (typeof window !== "undefined") {
      window.localStorage.setItem("user-info", JSON.stringify(user));
    }

    return {
      user,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
    firebaseLoading,
    firebaseUser,
    zeroCardUser,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (isFirebaseEnabled ? firebaseLoading : meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    firebaseLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    login,
    register,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
