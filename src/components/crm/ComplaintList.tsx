import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import type { Complaint } from "@/hooks/useComplaints";

const statusColors: Record<string, string> = {
  aberta: 'bg-red-500/15 text-red-700 border-red-500/30',
  em_andamento: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  resolvida: 'bg-green-500/15 text-green-700 border-green-500/30',
  fechada: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida', fechada: 'Fechada',
};

const gravidadeColors: Record<string, string> = {
  baixa: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  media: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  alta: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  critica: 'bg-red-500/15 text-red-700 border-red-500/30',
};

const gravidadeLabels: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
};

export function ComplaintList({ complaints }: { complaints: Complaint[] }) {
  if (complaints.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma reclamação registrada.</p>;
  }

  return (
    <div className="space-y-3">
      {complaints.map(c => (
        <div key={c.id} className="p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {c.gravidade && (
              <Badge variant="outline" className={gravidadeColors[c.gravidade] ?? ''}>
                {gravidadeLabels[c.gravidade] ?? c.gravidade}
              </Badge>
            )}
            <Badge variant="outline" className={statusColors[c.status] ?? ''}>
              {statusLabels[c.status] ?? c.status}
            </Badge>
            {c.tipo_reclamacao && (
              <Badge variant="secondary" className="text-[10px]">{c.tipo_reclamacao}</Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {c.data_contato ? format(new Date(c.data_contato), "dd/MM/yyyy", { locale: ptBR }) : '—'}
            </span>
          </div>
          <p className="text-sm line-clamp-2">{c.descricao}</p>
          {c.produto && <p className="text-xs text-muted-foreground mt-1">Produto: {c.produto}</p>}
          {c.atendente && <p className="text-xs text-muted-foreground">Atendente: {c.atendente}</p>}
        </div>
      ))}
    </div>
  );
}
