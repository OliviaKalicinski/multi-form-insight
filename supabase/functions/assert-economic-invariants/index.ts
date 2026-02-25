import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-assert-key",
};

interface ScenarioResult {
  passed: boolean;
  details: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const assertKey = req.headers.get("x-assert-key");
  const expectedKey = Deno.env.get("ASSERT_KEY");
  if (!assertKey || assertKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ts = Date.now();
  const PREFIX = `TEST-BLIND-${ts}`;
  const results: Record<string, ScenarioResult> = {};
  let allPassed = true;

  // Helper: build a minimal valid sales_data record
  const makeRecord = (overrides: Record<string, unknown>) => ({
    data_venda: "2020-01-01T00:00:00Z",
    valor_total: 0,
    produtos: [{ nome: "test", quantidade: 1 }],
    ...overrides,
  });

  // Helper: count records matching filter
  const countWhere = async (filters: Record<string, string>) => {
    let q = supabase.from("sales_data").select("*", { count: "exact", head: true });
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    const { count, error } = await q;
    if (error) throw new Error(`countWhere error: ${error.message}`);
    return count ?? 0;
  };

  // Helper: get single record
  const getOne = async (filters: Record<string, string>) => {
    let q = supabase.from("sales_data").select("*");
    for (const [k, v] of Object.entries(filters)) {
      q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw new Error(`getOne error: ${error.message}`);
    return data;
  };

  try {
    // ── Preventive cleanup ──
    await supabase
      .from("sales_data")
      .delete()
      .or(`numero_pedido.like.TEST-BLIND-%,numero_nota.like.TEST-BLIND-%`);

    // ════════════════════════════════════════════
    // CENÁRIO 1: Ecommerce → NF (trigger deleta ecommerce)
    // ════════════════════════════════════════════
    try {
      const pedido1 = `${PREFIX}-C1`;

      // Insert ecommerce
      const { error: e1 } = await supabase.from("sales_data").insert(
        makeRecord({
          numero_pedido: pedido1,
          fonte_dados: "ecommerce",
          valor_total: 50,
        })
      );
      if (e1) throw new Error(`Insert ecommerce failed: ${e1.message}`);

      // Verify ecommerce exists
      const preCount = await countWhere({ numero_pedido: pedido1, fonte_dados: "ecommerce" });
      if (preCount !== 1) throw new Error(`Pre-check: expected 1 ecommerce, got ${preCount}`);

      // Insert NF with same numero_pedido
      const { error: e2 } = await supabase.from("sales_data").insert(
        makeRecord({
          numero_pedido: pedido1,
          numero_nota: `${PREFIX}-N1`,
          serie: "T",
          fonte_dados: "nf",
          valor_total: 100,
        })
      );
      if (e2) throw new Error(`Insert NF failed: ${e2.message}`);

      // Verify: total COUNT = 1, fonte_dados = nf, ecommerce COUNT = 0
      const totalCount = await countWhere({ numero_pedido: pedido1 });
      const nfCount = await countWhere({ numero_pedido: pedido1, fonte_dados: "nf" });
      const ecomCount = await countWhere({ numero_pedido: pedido1, fonte_dados: "ecommerce" });

      if (totalCount !== 1 || nfCount !== 1 || ecomCount !== 0) {
        throw new Error(
          `Post-check failed: total=${totalCount}, nf=${nfCount}, ecom=${ecomCount}`
        );
      }

      results.cenario_1_ecommerce_depois_nf = {
        passed: true,
        details: "Trigger deletou ecommerce ao inserir NF. COUNT=1, fonte=nf, ecom=0.",
      };
    } catch (err) {
      allPassed = false;
      results.cenario_1_ecommerce_depois_nf = {
        passed: false,
        details: `FALHA: ${(err as Error).message}`,
      };
    }

    // ════════════════════════════════════════════
    // CENÁRIO 2: NF → Ecommerce (bloqueio)
    // ════════════════════════════════════════════
    try {
      const pedido2 = `${PREFIX}-C2`;

      // Insert NF first
      const { error: e1 } = await supabase.from("sales_data").insert(
        makeRecord({
          numero_pedido: pedido2,
          numero_nota: `${PREFIX}-N2`,
          serie: "T",
          fonte_dados: "nf",
          valor_total: 100,
        })
      );
      if (e1) throw new Error(`Insert NF failed: ${e1.message}`);

      // Try insert ecommerce (should fail via trigger)
      const { error: e2 } = await supabase.from("sales_data").insert(
        makeRecord({
          numero_pedido: pedido2,
          fonte_dados: "ecommerce",
          valor_total: 50,
        })
      );

      if (!e2) {
        throw new Error("Ecommerce insert succeeded but should have been blocked by trigger");
      }

      // Verify state: NF still exists, ecommerce = 0
      const totalCount = await countWhere({ numero_pedido: pedido2 });
      const nfCount = await countWhere({ numero_pedido: pedido2, fonte_dados: "nf" });
      const ecomCount = await countWhere({ numero_pedido: pedido2, fonte_dados: "ecommerce" });

      if (totalCount !== 1 || nfCount !== 1 || ecomCount !== 0) {
        throw new Error(
          `State after block invalid: total=${totalCount}, nf=${nfCount}, ecom=${ecomCount}`
        );
      }

      results.cenario_2_nf_bloqueia_ecommerce = {
        passed: true,
        details: `Trigger bloqueou ecommerce. Erro: "${e2.message}". Estado intacto: total=1, nf=1, ecom=0.`,
      };
    } catch (err) {
      allPassed = false;
      results.cenario_2_nf_bloqueia_ecommerce = {
        passed: false,
        details: `FALHA: ${(err as Error).message}`,
      };
    }

    // ════════════════════════════════════════════
    // CENÁRIO 3: Duplicata NF (idempotência via upsert)
    // ════════════════════════════════════════════
    try {
      const nota3 = `${PREFIX}-N3`;

      // Insert NF with valor 100
      const { error: e1 } = await supabase.from("sales_data").upsert(
        makeRecord({
          numero_pedido: `${PREFIX}-C3`,
          numero_nota: nota3,
          serie: "T",
          fonte_dados: "nf",
          valor_total: 100,
        }),
        { onConflict: "numero_nota,serie", ignoreDuplicates: false }
      );
      if (e1) throw new Error(`First NF insert failed: ${e1.message}`);

      // Upsert same nota with valor 200
      const { error: e2 } = await supabase.from("sales_data").upsert(
        makeRecord({
          numero_pedido: `${PREFIX}-C3`,
          numero_nota: nota3,
          serie: "T",
          fonte_dados: "nf",
          valor_total: 200,
        }),
        { onConflict: "numero_nota,serie", ignoreDuplicates: false }
      );
      if (e2) throw new Error(`Upsert NF failed: ${e2.message}`);

      // Verify COUNT = 1, valor_total = 200
      const rows = await getOne({ numero_nota: nota3, serie: "T" });
      if (!rows || rows.length !== 1) {
        throw new Error(`Expected 1 row, got ${rows?.length ?? 0}`);
      }
      if (Number(rows[0].valor_total) !== 200) {
        throw new Error(`Expected valor_total=200, got ${rows[0].valor_total}`);
      }

      results.cenario_3_duplicata_nf = {
        passed: true,
        details: "Upsert NF atualizou sem duplicar. COUNT=1, valor_total=200.",
      };
    } catch (err) {
      allPassed = false;
      results.cenario_3_duplicata_nf = {
        passed: false,
        details: `FALHA: ${(err as Error).message}`,
      };
    }

    // ════════════════════════════════════════════
    // CENÁRIO 4: Ecommerce isolado (idempotência via upsert)
    // ════════════════════════════════════════════
    try {
      const pedido4 = `${PREFIX}-C4`;

      // Insert ecommerce with valor 50
      const { error: e1 } = await supabase.from("sales_data").upsert(
        makeRecord({
          numero_pedido: pedido4,
          fonte_dados: "ecommerce",
          valor_total: 50,
        }),
        { onConflict: "numero_pedido,fonte_dados", ignoreDuplicates: false }
      );
      if (e1) throw new Error(`First ecommerce insert failed: ${e1.message}`);

      // Upsert same pedido with valor 75
      const { error: e2 } = await supabase.from("sales_data").upsert(
        makeRecord({
          numero_pedido: pedido4,
          fonte_dados: "ecommerce",
          valor_total: 75,
        }),
        { onConflict: "numero_pedido,fonte_dados", ignoreDuplicates: false }
      );
      if (e2) throw new Error(`Upsert ecommerce failed: ${e2.message}`);

      // Verify COUNT = 1, valor_total = 75, fonte_dados = ecommerce
      const rows = await getOne({ numero_pedido: pedido4 });
      if (!rows || rows.length !== 1) {
        throw new Error(`Expected 1 row, got ${rows?.length ?? 0}`);
      }
      if (Number(rows[0].valor_total) !== 75) {
        throw new Error(`Expected valor_total=75, got ${rows[0].valor_total}`);
      }
      if (rows[0].fonte_dados !== "ecommerce") {
        throw new Error(`Expected fonte_dados=ecommerce, got ${rows[0].fonte_dados}`);
      }

      results.cenario_4_ecommerce_isolado = {
        passed: true,
        details: "Upsert ecommerce atualizou sem duplicar. COUNT=1, valor_total=75, fonte=ecommerce.",
      };
    } catch (err) {
      allPassed = false;
      results.cenario_4_ecommerce_isolado = {
        passed: false,
        details: `FALHA: ${(err as Error).message}`,
      };
    }

    // ── Final cleanup ──
    await supabase
      .from("sales_data")
      .delete()
      .or(`numero_pedido.like.TEST-BLIND-%,numero_nota.like.TEST-BLIND-%`);

    // ── Sanity check: zero test records remaining ──
    const { count: remainingCount } = await supabase
      .from("sales_data")
      .select("*", { count: "exact", head: true })
      .or(`numero_pedido.like.TEST-BLIND-%,numero_nota.like.TEST-BLIND-%`);

    // ── Global stats (informative) ──
    // Can't run raw SQL, so we do individual counts
    const { count: nfTotal } = await supabase
      .from("sales_data")
      .select("*", { count: "exact", head: true })
      .eq("fonte_dados", "nf");
    const { count: ecomTotal } = await supabase
      .from("sales_data")
      .select("*", { count: "exact", head: true })
      .eq("fonte_dados", "ecommerce");

    const body = {
      status: allPassed ? "ALL INVARIANTS HOLD" : "INVARIANT VIOLATION",
      timestamp: new Date().toISOString(),
      prefix: PREFIX,
      results,
      sanidade_global: {
        test_records_remaining: remainingCount ?? 0,
        by_fonte: {
          nf: nfTotal ?? 0,
          ecommerce: ecomTotal ?? 0,
        },
      },
    };

    return new Response(JSON.stringify(body, null, 2), {
      status: allPassed ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Cleanup on unexpected error
    await supabase
      .from("sales_data")
      .delete()
      .or(`numero_pedido.like.TEST-BLIND-%,numero_nota.like.TEST-BLIND-%`);

    return new Response(
      JSON.stringify({
        status: "INVARIANT VIOLATION",
        error: `Unexpected: ${(err as Error).message}`,
        results,
      }, null, 2),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
