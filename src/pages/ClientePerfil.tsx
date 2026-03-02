import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { useContactLogs } from "@/hooks/useContactLogs";
import { useComplaints } from "@/hooks/useComplaints";
import { CustomerProfileHeader } from "@/components/crm/CustomerProfileHeader";
import { ContactLogList } from "@/components/crm/ContactLogList";
import { ContactLogForm } from "@/components/crm/ContactLogForm";
import { ComplaintList } from "@/components/crm/ComplaintList";
import { ComplaintForm } from "@/components/crm/ComplaintForm";
import { MergeCustomerModal } from "@/components/crm/MergeCustomerModal";
import { DuplicateBanner } from "@/components/crm/DuplicateBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, GitMerge } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function ClientePerfil() {
  const { cpfCnpj } = useParams<{ cpfCnpj: string }>();
  const navigate = useNavigate();
  const decoded = cpfCnpj ? decodeURIComponent(cpfCnpj) : undefined;

  const { customer, orders, isLoading, updateCustomer } = useCustomerProfile(decoded);
  const { logs, isLoading: logsLoading, addLog } = useContactLogs(customer?.id);
  const { complaints, isLoading: complaintsLoading, addComplaint, updateComplaint } = useComplaints(customer?.id);

  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [complaintFormOpen, setComplaintFormOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate('/clientes')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  const handleUpdate = (updates: Record<string, any>) => {
    updateCustomer.mutate(updates, {
      onSuccess: () => toast.success("Dados atualizados"),
      onError: () => toast.error("Erro ao atualizar"),
    });
  };

  const handleAddContact = (log: any) => {
    addLog.mutate(log, {
      onSuccess: () => toast.success("Contato registrado"),
      onError: () => toast.error("Erro ao registrar contato"),
    });
  };

  const handleAddComplaint = (c: any) => {
    addComplaint.mutate(c, {
      onSuccess: () => toast.success("Reclamação registrada"),
      onError: () => toast.error("Erro ao registrar reclamação"),
    });
  };

  const fmtVal = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Perfil do Cliente</h1>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}>
            <GitMerge className="h-4 w-4 mr-2" /> Mesclar
          </Button>
        </div>
      </div>

      <DuplicateBanner customerId={customer.id} cpfCnpj={decoded!} />

      <CustomerProfileHeader customer={customer} onUpdate={handleUpdate} />

      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos ({orders.length})</TabsTrigger>
          <TabsTrigger value="atendimentos">Atendimentos ({logs.length})</TabsTrigger>
          <TabsTrigger value="reclamacoes">Reclamações ({complaints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Canal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado.</TableCell>
                    </TableRow>
                  ) : orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell>{format(new Date(o.data_venda), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {o.tipo_movimento ?? 'venda'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={o.fonte_dados === 'nf' ? 'default' : 'outline'} className="text-[10px]">
                          {o.fonte_dados === 'nf' ? 'NF' : 'Ecommerce'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmtVal(o.total_faturado ?? (o.valor_total + (o.valor_frete ?? 0)))}</TableCell>
                      <TableCell className="font-mono text-xs">{o.numero_pedido ?? '—'}</TableCell>
                      <TableCell>{o.canal ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atendimentos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Histórico de Atendimentos</CardTitle>
              <Button size="sm" onClick={() => setContactFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Novo Contato
              </Button>
            </CardHeader>
            <CardContent>
              {logsLoading ? <Skeleton className="h-32" /> : <ContactLogList logs={logs} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reclamacoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Reclamações</CardTitle>
              <Button size="sm" onClick={() => setComplaintFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Reclamação
              </Button>
            </CardHeader>
            <CardContent>
              {complaintsLoading ? <Skeleton className="h-32" /> : (
                <ComplaintList
                  complaints={complaints}
                  onUpdateComplaint={(data) => {
                    updateComplaint.mutate(data, {
                      onSuccess: () => toast.success("Reclamação atualizada"),
                      onError: () => toast.error("Erro ao atualizar reclamação"),
                    });
                  }}
                  isUpdating={updateComplaint.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ContactLogForm
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
        onSubmit={handleAddContact}
        customerId={customer.id}
        defaultResponsavel={customer.responsavel ?? undefined}
        isLoading={addLog.isPending}
      />

      <ComplaintForm
        open={complaintFormOpen}
        onOpenChange={setComplaintFormOpen}
        onSubmit={handleAddComplaint}
        customerId={customer.id}
        cpfCnpj={decoded}
        defaultAtendente={customer.responsavel ?? undefined}
        isLoading={addComplaint.isPending}
      />

      <MergeCustomerModal
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        primaryCustomerId={customer.id}
        primaryCustomerName={customer.nome ?? ''}
      />
    </div>
  );
}
