import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, MessageCircle, Mail, Headset, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContactLog } from "@/hooks/useContactLogs";

const tipoIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  sac: Headset,
  outro: HelpCircle,
};

const tipoLabels: Record<string, string> = {
  ligacao: 'Ligação', whatsapp: 'WhatsApp', email: 'E-mail', sac: 'SAC', outro: 'Outro',
};

export function ContactLogList({ logs }: { logs: ContactLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhum contato registrado.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map(log => {
        const Icon = tipoIcons[log.tipo ?? 'outro'] ?? HelpCircle;
        return (
          <div key={log.id} className="flex gap-3 p-3 rounded-lg border bg-card">
            <div className="mt-0.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">
                  {tipoLabels[log.tipo ?? 'outro'] ?? log.tipo}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.data_contato), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
                {log.responsavel && (
                  <span className="text-xs text-muted-foreground">• {log.responsavel}</span>
                )}
              </div>
              <p className="text-sm">{log.resumo}</p>
              {log.resultado && (
                <p className="text-xs text-muted-foreground mt-1">Resultado: {log.resultado}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
