import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const GRAPH_API_EXPLORER = "https://developers.facebook.com/tools/explorer";
const WARN_DAYS = 10; // avisa quando faltam <= 10 dias

export const MetaTokenAlert = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "meta_token_expiry")
        .single();

      if (!data?.setting_value?.expires_at) return;

      const expiry = parseISO(data.setting_value.expires_at);
      const days = differenceInDays(expiry, new Date());
      setDaysLeft(days);
      setExpiresAt(format(expiry, "dd/MM/yyyy", { locale: ptBR }));
    };
    fetch();
  }, []);

  // Só mostra se faltam <= WARN_DAYS dias ou já expirou
  if (daysLeft === null || daysLeft > WARN_DAYS || dismissed) return null;

  const expired = daysLeft <= 0;

  return (
    <Alert
      className={
        expired
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }
    >
      <AlertTriangle className={`h-4 w-4 ${expired ? "text-red-500" : "text-amber-500"}`} />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          {expired ? (
            <>
              <strong>Token Meta expirado.</strong> O sync de Ads e Instagram parou de funcionar.
            </>
          ) : (
            <>
              <strong>Token Meta vence em {daysLeft} dia{daysLeft !== 1 ? "s" : ""}</strong>
              {expiresAt && <> ({expiresAt})</>}. Renove antes que o sync pare.
            </>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className={`gap-1.5 text-xs h-7 ${
              expired
                ? "border-red-400 text-red-700 hover:bg-red-100"
                : "border-amber-400 text-amber-700 hover:bg-amber-100"
            }`}
            onClick={() => window.open(GRAPH_API_EXPLORER, "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
            Renovar token
          </Button>
          {!expired && (
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-500 hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
