// ZENIT generic Supabase Edge Function connector
// Deploy as: supabase functions deploy zenit-sync
// Keep verify_jwt enabled. Invoke from an authenticated scheduler or a trusted backend.
import { createClient } from "npm:@supabase/supabase-js@2";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ZENIT_API_KEY", "ZENIT_SYNC_TOKEN"] as const;
const env = Object.fromEntries(required.map((name) => [name, Deno.env.get(name)])) as Record<(typeof required)[number], string | undefined>;
const missing = required.filter((name) => !env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);

const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const ZENIT_ENDPOINT = "https://zenit-unv7.onrender.com/api/v1/events";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (request.headers.get("x-sync-token") !== env.ZENIT_SYNC_TOKEN) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Implement this RPC in the SOURCE project's database. It must return aggregate
  // metrics only, shaped for your app (e.g. clients_count, orders_count,
  // revenue_paid_total, products_count, currency). Never return personal data.
  const { data: metrics, error } = await supabase.rpc("zenit_metrics_snapshot");
  if (error) {
    console.error("zenit_metrics_snapshot failed", error.code);
    return Response.json({ error: "metrics_snapshot_failed" }, { status: 500 });
  }
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return Response.json({ error: "snapshot_must_be_a_json_object" }, { status: 422 });
  }

  const response = await fetch(ZENIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Zenit-Key": env.ZENIT_API_KEY!,
    },
    body: JSON.stringify({
      events: [{
        name: "app_snapshot",
        timestamp: new Date().toISOString(),
        properties: metrics,
      }],
    }),
  });
  const result = await response.json().catch(() => ({ error: "invalid_zenit_response" }));
  if (!response.ok) {
    console.error("ZENIT ingestion failed", response.status);
    return Response.json({ error: "zenit_ingestion_failed", status: response.status }, { status: 502 });
  }
  return Response.json({ ok: true, accepted: result.accepted ?? 1, synced_at: new Date().toISOString() });
});
