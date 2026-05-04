import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * R37 — Hook que retorna true se o usuário logado é o owner do dashboard.
 *
 * Owner é definido por email. Pra adicionar outro owner no futuro, basta
 * incluir o email no array OWNER_EMAILS — e atualizar a expressão das
 * policies RLS em `public.financial_monthly` correspondentemente.
 */
const OWNER_EMAILS = ["multedob@gmail.com"];

export function useIsOwner(): { isOwner: boolean; loading: boolean; email: string | null } {
  const [state, setState] = useState<{ isOwner: boolean; loading: boolean; email: string | null }>({
    isOwner: false,
    loading: true,
    email: null,
  });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const email = data.user?.email ?? null;
      setState({
        isOwner: email !== null && OWNER_EMAILS.includes(email),
        loading: false,
        email,
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setState({
        isOwner: email !== null && OWNER_EMAILS.includes(email),
        loading: false,
        email,
      });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
