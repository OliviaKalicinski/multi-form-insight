import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_DOMAIN = "@letsfly.com.br";

function isValidDomain(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return email.toLowerCase().trim().endsWith(ALLOWED_DOMAIN.toLowerCase());
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user token to verify the caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user by validating the JWT from the header directly
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser(token);
    
    if (userError || !currentUser) {
      console.error("User verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if current user is admin
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("Admin check failed:", roleError, roleData);
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { action, userId, role } = await req.json();

    // Handle different actions
    switch (action) {
      case "list": {
        console.log("📋 Listing all users...");
        
        // Get all users from auth
        const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers();
        
        if (listError) {
          console.error("Error listing users:", listError);
          return new Response(
            JSON.stringify({ error: "Erro ao listar usuários" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get all roles
        const { data: roles, error: rolesError } = await adminClient
          .from("user_roles")
          .select("user_id, role, created_at");

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
        }

        // Map roles to users
        const roleMap = new Map(roles?.map(r => [r.user_id, { role: r.role, created_at: r.created_at }]) || []);

        const users = authUsers.users.map(user => ({
          id: user.id,
          email: user.email,
          role: roleMap.get(user.id)?.role || "viewer",
          created_at: user.created_at,
          isValidDomain: isValidDomain(user.email || ""),
          isCurrentUser: user.id === currentUser.id,
        }));

        console.log(`✅ Found ${users.length} users`);

        return new Response(
          JSON.stringify({ users }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent self-deletion
        if (userId === currentUser.id) {
          return new Response(
            JSON.stringify({ error: "Você não pode deletar sua própria conta" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`🗑️ Deleting user: ${userId}`);

        // Delete user from auth (cascade will delete role)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error("Error deleting user:", deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`✅ User ${userId} deleted`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update-role": {
        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: "userId e role são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (role !== "admin" && role !== "viewer") {
          return new Response(
            JSON.stringify({ error: "Role inválido. Use 'admin' ou 'viewer'" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Prevent changing own role (to prevent last admin from downgrading themselves)
        if (userId === currentUser.id) {
          return new Response(
            JSON.stringify({ error: "Você não pode alterar seu próprio role" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`🔄 Updating role for user ${userId} to ${role}`);

        // Update role
        const { error: updateError } = await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating role:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`✅ Role updated for user ${userId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida. Use 'list', 'delete' ou 'update-role'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
