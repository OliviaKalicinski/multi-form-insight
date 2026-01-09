import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

interface SignUpResult {
  success: boolean;
  error?: string;
}

interface SignInResult {
  success: boolean;
  error?: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth event:", event, session?.user?.email);
        setAuthState({
          user: session?.user ?? null,
          session: session,
          isLoading: false,
        });
      }
    );

    // THEN get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session: session,
        isLoading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error("❌ Signup error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Você já pode fazer login.",
        });
        return { success: true };
      }

      return { success: false, error: "Erro desconhecido ao criar conta" };
    } catch (error) {
      console.error("❌ Unexpected signup error:", error);
      return { success: false, error: "Erro inesperado ao criar conta" };
    }
  }, [toast]);

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Signin error:", error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        toast({
          title: "Login realizado!",
          description: `Bem-vindo, ${data.user.email}`,
        });
        return { success: true };
      }

      return { success: false, error: "Erro desconhecido ao fazer login" };
    } catch (error) {
      console.error("❌ Unexpected signin error:", error);
      return { success: false, error: "Erro inesperado ao fazer login" };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Signout error:", error);
        toast({
          title: "Erro ao sair",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      console.error("❌ Unexpected signout error:", error);
    }
  }, [toast]);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Password update error:", error);
      return { success: false, error: "Erro ao atualizar senha" };
    }
  }, [toast]);

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: !!authState.user,
    signUp,
    signIn,
    signOut,
    updatePassword,
  };
};
