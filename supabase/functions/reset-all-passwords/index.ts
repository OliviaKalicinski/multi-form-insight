import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEW_PASSWORD = "123456";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: currentUser }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !currentUser) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem resetar senhas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List all users
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) {
      console.error("List users failed:", listError);
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const users = usersData?.users ?? [];
    let updated = 0;
    const failures: { email?: string; error: string }[] = [];

    for (const u of users) {
      const { error: updErr } = await adminClient.auth.admin.updateUserById(u.id, {
        password: NEW_PASSWORD,
      });
      if (updErr) {
        failures.push({ email: u.email, error: updErr.message });
      } else {
        updated++;
      }
    }

    console.log(`✅ Reset passwords: ${updated}/${users.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: users.length,
        updated,
        failures,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
