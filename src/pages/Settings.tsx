import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserManagement } from "@/components/settings/UserManagement";
import { isValidDomain, getDomainValidationError } from "@/utils/domainValidation";
import { 
  Settings as SettingsIcon, 
  Key, 
  UserPlus, 
  Shield, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Users,
  Instagram
} from "lucide-react";

export default function Settings() {
  const { user, updatePassword } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { instagramGoals, updateInstagramGoals, isSaving: instagramSaving } = useAppSettings();
  const { toast } = useToast();

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Invite user state
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Instagram settings state
  const [baselineSeguidores, setBaselineSeguidores] = useState(instagramGoals.baselineSeguidores);
  const [metaSeguidoresMes, setMetaSeguidoresMes] = useState(instagramGoals.metaSeguidoresMes);
  const [dataBaseline, setDataBaseline] = useState(instagramGoals.dataBaseline);
  const [instagramSuccess, setInstagramSuccess] = useState(false);

  useEffect(() => {
    setBaselineSeguidores(instagramGoals.baselineSeguidores);
    setMetaSeguidoresMes(instagramGoals.metaSeguidoresMes);
    setDataBaseline(instagramGoals.dataBaseline);
  }, [instagramGoals]);

  const handleInstagramSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setInstagramSuccess(false);
    
    const result = await updateInstagramGoals({
      baselineSeguidores,
      metaSeguidoresMes,
      dataBaseline,
    });
    
    if (result.success) {
      setInstagramSuccess(true);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setPasswordLoading(true);

    const result = await updatePassword(newPassword);
    
    setPasswordLoading(false);

    if (result.success) {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      setPasswordError(result.error || "Erro ao atualizar senha");
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);

    if (!inviteEmail || !invitePassword) {
      setInviteError("Preencha todos os campos");
      return;
    }

    // Validate domain
    if (!isValidDomain(inviteEmail)) {
      setInviteError(getDomainValidationError());
      return;
    }

    if (invitePassword.length < 6) {
      setInviteError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setInviteLoading(true);

    try {
      // Create user using Supabase admin API via edge function
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, password: invitePassword },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setInviteSuccess(true);
      setInviteEmail("");
      setInvitePassword("");
      
      toast({
        title: "Usuário convidado!",
        description: `${inviteEmail} foi convidado como viewer.`,
      });
    } catch (error: any) {
      console.error("❌ Invite error:", error);
      setInviteError(error.message || "Erro ao convidar usuário");
    } finally {
      setInviteLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="container mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie sua conta e permissões
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Informações da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {isAdmin ? "Administrador" : "Visualizador"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isAdmin 
              ? "Você tem acesso total ao sistema, incluindo upload de dados e convite de novos usuários."
              : "Você pode visualizar todos os dashboards, mas não pode fazer upload de dados ou convidar novos usuários."
            }
          </p>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha de acesso
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="space-y-4">
            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            {passwordSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription>Senha alterada com sucesso!</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={passwordLoading}
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                disabled={passwordLoading}
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Instagram Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Configurações do Instagram
          </CardTitle>
          <CardDescription>
            Configure o total de seguidores e metas mensais
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleInstagramSave}>
          <CardContent className="space-y-4">
            {instagramSuccess && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <AlertDescription>Configurações salvas com sucesso!</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="baseline-seguidores">Total de Seguidores Atual</Label>
              <Input
                id="baseline-seguidores"
                type="number"
                placeholder="7025"
                value={baselineSeguidores}
                onChange={(e) => setBaselineSeguidores(Number(e.target.value))}
                required
                disabled={instagramSaving}
              />
              <p className="text-xs text-muted-foreground">
                Este é o total atual de seguidores do seu perfil
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data-baseline">Data de Referência</Label>
              <Input
                id="data-baseline"
                type="date"
                value={dataBaseline}
                onChange={(e) => setDataBaseline(e.target.value)}
                required
                disabled={instagramSaving}
              />
              <p className="text-xs text-muted-foreground">
                Data em que você verificou o total de seguidores
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="meta-seguidores">Meta de Novos Seguidores/Mês</Label>
              <Input
                id="meta-seguidores"
                type="number"
                placeholder="500"
                value={metaSeguidoresMes}
                onChange={(e) => setMetaSeguidoresMes(Number(e.target.value))}
                required
                disabled={instagramSaving}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={instagramSaving}>
              {instagramSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configurações"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* User Management (Admin only) */}
      {isAdmin && <UserManagement />}

      {/* Invite User (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Convidar Usuário
            </CardTitle>
            <CardDescription>
              Convide novos visualizadores para acessar o dashboard (apenas @letsfly.com.br)
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleInviteUser}>
            <CardContent className="space-y-4">
              {inviteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{inviteError}</AlertDescription>
                </Alert>
              )}
              {inviteSuccess && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertDescription>Usuário convidado com sucesso!</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email do Novo Usuário</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="novo@letsfly.com.br"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-password">Senha Temporária</Label>
                <Input
                  id="invite-password"
                  type="text"
                  placeholder="senha123"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  required
                  disabled={inviteLoading}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Compartilhe esta senha com o usuário. Ele poderá alterá-la depois.
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    O novo usuário será criado como <strong>Visualizador</strong>
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Convidando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convidar Usuário
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}