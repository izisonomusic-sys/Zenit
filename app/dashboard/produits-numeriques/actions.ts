"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encryptIntegrationSecret, decryptIntegrationSecret } from "@/lib/integrations/crypto";

export async function addDigitalProduct(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (name.length < 2) redirect("/dashboard/produits-numeriques?error=name");
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    redirect("/dashboard/produits-numeriques?error=url");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect("/dashboard");
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard/produits-numeriques?error=permission");

  const { data: project, error } = await supabase.from("tracked_projects")
    .insert({ workspace_id: membership.workspace_id, name, platform: "other", website_url: url, created_by: user.id })
    .select("id").single();
  if (error || !project) redirect("/dashboard/produits-numeriques?error=save");

  const { error: sourceError } = await supabase.from("data_sources").insert({
    workspace_id: membership.workspace_id, project_id: project.id, name, source: "other", status: "pending",
    config: { provider: "digital_product", product_url: url, connection_state: "awaiting_events" }, created_by: user.id
  });
  if (sourceError) redirect("/dashboard/produits-numeriques?error=source");
  redirect("/dashboard/produits-numeriques?added=1");
}

export async function connectChariow(formData: FormData) {
  const apiKey = String(formData.get("api_key") || "").trim();
  if (apiKey.length < 16) redirect("/dashboard/produits-numeriques?chariow_error=key");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect("/dashboard");
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard/produits-numeriques?chariow_error=permission");

  let response: Response;
  try {
    response = await fetch("https://api.chariow.com/v1/store", {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store"
    });
  } catch {
    redirect("/dashboard/produits-numeriques?chariow_error=network");
  }
  if (!response.ok) redirect("/dashboard/produits-numeriques?chariow_error=invalid_key");

  let body: any;
  try { body = await response.json(); } catch {
    redirect("/dashboard/produits-numeriques?chariow_error=response");
  }
  const store = body?.data?.store ?? body?.data ?? body?.store ?? body;
  if (!store?.id) redirect("/dashboard/produits-numeriques?chariow_error=store");

  let encryptedKey: string;
  try { encryptedKey = encryptIntegrationSecret(apiKey); } catch {
    redirect("/dashboard/produits-numeriques?chariow_error=server_config");
  }

  const storeName = String(store.name || "Ma boutique Chariow").slice(0, 120);
  const storeUrl = String(store.url || "").trim();
  const { data: existing } = await supabase.from("integration_connections")
    .select("id,project_id").eq("workspace_id", membership.workspace_id)
    .eq("provider", "other").eq("external_account_id", String(store.id)).maybeSingle();

  let projectId: string | null = existing?.project_id ?? null;
  if (!projectId) {
    const { data: project, error: projectError } = await supabase.from("tracked_projects").insert({
      workspace_id: membership.workspace_id, name: storeName, platform: "other",
      website_url: storeUrl || null, created_by: user.id
    }).select("id").single();
    if (projectError || !project) redirect("/dashboard/produits-numeriques?chariow_error=save");
    projectId = project.id;
  }

  const connectionValues = {
    workspace_id: membership.workspace_id, project_id: projectId, provider: "other" as const,
    display_name: `Chariow · ${storeName}`, external_account_id: String(store.id),
    status: "connected", secret_reference: encryptedKey, created_by: user.id
  };
  let connectionId = existing?.id;
  if (connectionId) {
    const { error } = await supabase.from("integration_connections").update({
      project_id: projectId, display_name: connectionValues.display_name,
      status: "connected", secret_reference: encryptedKey
    }).eq("id", connectionId);
    if (error) redirect("/dashboard/produits-numeriques?chariow_error=save");
  } else {
    const { data: created, error } = await supabase.from("integration_connections")
      .insert(connectionValues).select("id").single();
    if (error || !created) redirect("/dashboard/produits-numeriques?chariow_error=save");
    connectionId = created.id;
  }

  const sourceName = `Chariow · ${storeName}`;
  const { data: existingSource } = await supabase.from("data_sources").select("id")
    .eq("workspace_id", membership.workspace_id).eq("name", sourceName).maybeSingle();
  const sourceValues = {
    workspace_id: membership.workspace_id, project_id: projectId, name: sourceName,
    source: "other" as const, status: "connected",
    config: { provider: "chariow", store_id: String(store.id), store_url: storeUrl, connection_id: connectionId },
    created_by: user.id
  };
  if (existingSource?.id) {
    await supabase.from("data_sources").update({ project_id: projectId, status: "connected", config: sourceValues.config }).eq("id", existingSource.id);
  } else {
    const { error } = await supabase.from("data_sources").insert(sourceValues);
    if (error) redirect("/dashboard/produits-numeriques?chariow_error=save");
  }
  redirect("/dashboard/produits-numeriques?chariow_connected=1");
}

export async function syncChariow(formData: FormData) {
  const connectionId = String(formData.get("connection_id") || "");
  if (!connectionId) redirect("/dashboard/produits-numeriques?sync_error=connection");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect("/dashboard");
  if (!["owner", "admin"].includes(membership.role)) redirect("/dashboard/produits-numeriques?sync_error=permission");

  const { data: connection, error: connectionError } = await supabase.from("integration_connections")
    .select("id,secret_reference").eq("id", connectionId)
    .eq("workspace_id", membership.workspace_id).eq("provider", "other").single();
  if (connectionError || !connection?.secret_reference) redirect("/dashboard/produits-numeriques?sync_error=connection");

  let apiKey: string;
  try { apiKey = decryptIntegrationSecret(connection.secret_reference); } catch {
    redirect("/dashboard/produits-numeriques?sync_error=secret");
  }

  let cursor: string | null = null;
  let imported = 0;
  let pages = 0;
  try {
    do {
      const url = new URL("https://api.chariow.com/v1/sales");
      url.searchParams.set("per_page", "100");
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Chariow API error");
      const result: any = await response.json();
      const sales: any[] = Array.isArray(result?.data) ? result.data :
        (Array.isArray(result?.data?.data) ? result.data.data : []);
      if (!sales.length) break;
      const rows = sales.filter(sale => sale?.id).map(sale => ({
        workspace_id: membership.workspace_id,
        connection_id: connectionId,
        external_sale_id: String(sale.id),
        sale_status: String(sale.status || "unknown"),
        payment_status: sale.payment?.status ?? null,
        amount: sale.amount?.value ?? sale.payment?.amount?.value ?? null,
        original_amount: sale.original_amount?.value ?? null,
        settlement_amount: sale.settlement?.amount?.value ?? null,
        fee_amount: sale.settlement?.fee?.value ?? sale.settlement?.service_fee?.value ?? sale.settlement?.payment_fee?.value ?? null,
        currency: sale.amount?.currency ?? sale.payment?.amount?.currency ?? sale.original_amount?.currency ?? null,
        channel: sale.channel?.value ?? sale.channel ?? null,
        product_id: sale.product?.id ?? null,
        product_name: sale.product?.name ?? null,
        product_type: sale.product?.type ?? null,
        external_customer_id: sale.customer?.id ?? null,
        external_created_at: sale.created_at ?? null,
        external_completed_at: sale.completed_at ?? null,
        payload: {
          payment_method: sale.payment?.method?.name ?? null,
          payment_gateway: sale.payment?.gateway ?? null,
          discount_code: sale.discount?.code ?? null,
          reconciled: sale.is_reconciled ?? null
        }
      }));
      if (rows.length) {
        const { error } = await supabase.from("commerce_sales").upsert(rows, { onConflict: "connection_id,external_sale_id" });
        if (error) throw new Error("Could not save sales");
        imported += rows.length;
      }
      pages += 1;
      const pagination = result?.pagination ?? result?.data?.pagination;
      cursor = pagination?.next_cursor ?? null;
    } while (cursor && pages < 20);
  } catch {
    redirect("/dashboard/produits-numeriques?sync_error=failed");
  }

  const syncedAt = new Date().toISOString();
  await supabase.from("integration_connections").update({ last_synced_at: syncedAt }).eq("id", connectionId);
  await supabase.from("data_sources").update({ last_synced_at: syncedAt, status: "connected" })
    .eq("workspace_id", membership.workspace_id).contains("config", { connection_id: connectionId });
  redirect("/dashboard/produits-numeriques?synced=" + imported);
}
