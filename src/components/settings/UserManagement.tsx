import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  Shield, 
  Eye, 
  MoreHorizontal,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  role: "admin" | "viewer";
  created_at: string;
  isValidDomain: boolean;
  isCurrentUser: boolean;
}

export function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "list" },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setActionLoading(userToDelete.id);
    setDeleteDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", userId: userToDelete.id },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Usuário removido",
        description: `${userToDelete.email} foi removido do sistema.`,
      });

      // Refresh the list
      await fetchUsers();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast({
        title: "Erro ao remover",
        description: err.message || "Não foi possível remover o usuário",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
      setUserToDelete(null);
    }
  };

  const handleUpdateRole = async (user: User, newRole: "admin" | "viewer") => {
    setActionLoading(user.id);

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "update-role", userId: user.id, role: newRole },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Permissão atualizada",
        description: `${user.email} agora é ${newRole === "admin" ? "Administrador" : "Visualizador"}.`,
      });

      // Refresh the list
      await fetchUsers();
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast({
        title: "Erro ao atualizar",
        description: err.message || "Não foi possível atualizar a permissão",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const invalidDomainUsers = users.filter(u => !u.isValidDomain);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gerenciar Usuários
              </CardTitle>
              <CardDescription>
                Visualize, edite permissões ou remova usuários do sistema
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {invalidDomainUsers.length > 0 && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                {invalidDomainUsers.length} usuário(s) com domínio inválido encontrado(s). 
                Considere removê-los para manter a segurança.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum usuário encontrado
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Domínio</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow 
                      key={user.id}
                      className={!user.isValidDomain ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="font-medium">
                        {user.email}
                        {user.isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Você
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? (
                            <><Shield className="h-3 w-3 mr-1" /> Admin</>
                          ) : (
                            <><Eye className="h-3 w-3 mr-1" /> Viewer</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {user.isValidDomain ? (
                          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                            Válido
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Inválido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.isCurrentUser ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role === "viewer" ? (
                                <DropdownMenuItem onClick={() => handleUpdateRole(user, "admin")}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Tornar Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateRole(user, "viewer")}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Tornar Viewer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário{" "}
              <strong>{userToDelete?.email}</strong> será permanentemente removido 
              e perderá todo o acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
