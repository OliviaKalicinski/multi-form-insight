import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "viewer";

interface UserRoleState {
  role: AppRole | null;
  isLoading: boolean;
  error: string | null;
}

export const useUserRole = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [roleState, setRoleState] = useState<UserRoleState>({
    role: null,
    isLoading: true,
    error: null,
  });

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRoleState({ role: null, isLoading: false, error: null });
      return;
    }

    try {
      setRoleState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("❌ Error fetching role:", error);
        setRoleState({
          role: null,
          isLoading: false,
          error: error.message,
        });
        return;
      }

      console.log("🔑 User role:", data?.role);
      setRoleState({
        role: data?.role as AppRole || null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("❌ Unexpected error fetching role:", err);
      setRoleState({
        role: null,
        isLoading: false,
        error: "Erro ao buscar permissões",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchRole();
    }
  }, [isAuthLoading, fetchRole]);

  const isAdmin = roleState.role === "admin";
  const isViewer = roleState.role === "viewer";

  return {
    role: roleState.role,
    isLoading: roleState.isLoading || isAuthLoading,
    error: roleState.error,
    isAdmin,
    isViewer,
    refetch: fetchRole,
  };
};
