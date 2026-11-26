import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, Download, Package, ShoppingBag, RefreshCw, Store, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { decryptIntegrationSecret } from "@/lib/integrations/crypto";
import { addDigitalProduct, connectChariow, syncChariow } from "./actions";

export const dynamic = "force-dynamic";

type SaleRow = {
  id: string;
  external_sale_id: string;
  sale_status: string;
  payment_status: string | null;
  amount: number | null;
  settlement_amount: number | null;
  currency: string | null;
  product_name: string | null;
  external_created_at: string | null;
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "XOF", maximumFractionDigits: 0 }).format(value);
  } catch {
    return value.toLocaleString("fr-FR") + " " + (currency || "");
  }
}

export default async function DigitalProductsPage({
  searchParams
}: {
  searchParams: Promise<{ added?: string; error?: string; chariow_error?: string; chariow_connected?: string; synced?: string; sync_error?: string }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase.from("workspace_members")
    .select("workspace_id,role").eq("user_id", user.id).limit(1);
  const membership = memberships?.[0];
  if (!membership) redirect("/dashboard");

  const [{ data: products }, { data: connection }, params] = await Promise.all([
    supabase.from("tracked_projects").select("id,name,website_url,created_at")
      .eq("workspace_id", membership.workspace_id).eq("platform", "other")
      .order("created_at", { ascending: false }),
    supabase.from("integration_connections").select("id,project_id,display_name,external_account_id,status,last_synced_at,secret_reference")
      .eq("workspace_id", membership.workspace_id).eq("provider", "other")
      .ilike("display_name", "Chariow ·%").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    searchParams
  ]);

  let sales: SaleRow[] = [];
  let liveApiError = false;
  if (connection?.id) {
    const { data: storedSales } = await supabase.from("commerce_sales")
      .select("id,external_sale_id,sale_status,payment_status,amount,settlement_amount,currency,product_name,external_created_at")
      .eq("connection_id", connection.id).order("external_created_at", { ascending: false }).limit(100);
    sales = (storedSales || []) as SaleRow[];
    if (connection.secret_reference) {
      try {
        const key = decryptIntegrationSecret(connection.secret_reference);
        const check = await fetch("https://api.chariow.com/v1/store", {
          headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, cache: "no-store"
        });
        liveApiError = !check.ok;
      } catch {
        liveApiError = true;
      }
    }
  }

  const ownProducts = (products || []).filter(product => product.id !== connection?.project_id);
  const completed = sales.filter(sale => sale.sale_status === "completed");
  const failed = sales.filter(sale => sale.sale_status === "failed" || sale.payment_status === "failed");
  const abandoned = sales.filter(sale => sale.sale_status === "abandoned");
  const cancelled = sales.filter(sale => sale.payment_status === "cancelled");
  const currency = completed.find(sale => sale.currency)?.currency || sales.find(sale => sale.currency)?.currency || "XOF";
  const gross = completed.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
  const net = completed.reduce((sum, sale) => sum + Number(sale.settlement_amount || 0), 0);
  const isAdmin = ["owner", "admin"].includes(membership.role);

  const chariowErrors: Record<string, string> = {
    key: "La clé API est trop courte ou invalide.",
    permission: "Seuls le propriétaire ou un administrateur de l’espace peuvent connecter une boutique.",
    network: "Impossible de joindre Chariow. Vérifiez votre connexion et réessayez.",
    invalid_key: "Chariow a refusé cette clé API. Vérifiez-la dans Paramètres → API Keys.",
    response: "La réponse de Chariow n’a pas pu être lue.",
    store: "La clé API a répondu, mais les informations de la boutique sont introuvables.",
    server_config: "Le chiffrement sécurisé n’est pas configuré sur le serveur.",
    save: "La connexion a été vérifiée, mais ZENIT n’a pas pu l’enregistrer."
  };

  return (
    <main className="dashboard-main module-main">
      <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
      <header className="dashboard-header">
        <div><div className="eyebrow">ZENIT / ÉCONOMIE NUMÉRIQUE</div><h1>Produits numériques.</h1><p>Connectez vos plateformes de vente et suivez les ventes, paiements et licences.</p></div>
        <span className="status-pill">{ownProducts.length + (connection ? 1 : 0)} ressource(s)</span>
      </header>

      {params.added && <div className="success-banner">Produit enregistré. Il faudra connecter sa plateforme ou installer le suivi ZENIT pour recevoir ses ventes.</div>}
      {params.error && <div className="form-message">Impossible d’enregistrer le produit. Vérifiez les informations et vos droits dans cet espace.</div>}
      {params.chariow_connected && <div className="success-banner"><CheckCircle2 size={16}/> Boutique Chariow vérifiée et connectée. Lancez une première synchronisation pour importer les ventes.</div>}
      {params.chariow_error && <div className="form-message"><AlertCircle size={16}/> {chariowErrors[params.chariow_error] || "La connexion Chariow a échoué."}</div>}
      {params.synced && <div className="success-banner">{params.synced} vente(s) synchronisée(s) depuis Chariow.</div>}
      {params.sync_error && <div className="form-message">La synchronisation a échoué. Vérifiez les autorisations de la clé API puis réessayez.</div>}

      <section className="digital-types">
        <div><BookOpen/><b>Ebooks & documents</b><small>Ventes et téléchargements</small></div>
        <div><Download/><b>Fichiers & licences</b><small>Accès, activations et renouvellements</small></div>
        <div><ShoppingBag/><b>Produits vendus en ligne</b><small>Commandes et revenus</small></div>
      </section>

      <section className="module-form-card chariow-connect-card">
        <div className="chariow-connect-head">
          <div><div className="eyebrow">CONNEXION API · PRODUITS DIGITAUX</div><h2>{connection ? "Chariow est connecté" : "Connecter une boutique Chariow"}</h2>
          <p className="module-description">ZENIT lit les ventes et les statuts depuis l’API officielle. La clé est chiffrée avant son enregistrement et n’est jamais envoyée au navigateur après la connexion.</p></div>
          <span className="chariow-mark">C</span>
        </div>
        {connection ? (
          <div className="chariow-connected">
            <div className="workspace-row"><div className="workspace-symbol"><Store size={19}/></div><div><b>{connection.display_name}</b><small>ID boutique : {connection.external_account_id}</small></div><span className="workspace-ready">{liveApiError ? "Vérification API à contrôler" : "API autorisée"}</span></div>
            <div className="chariow-sync-row">
              <span>{connection.last_synced_at ? "Dernière synchronisation : " + new Date(connection.last_synced_at).toLocaleString("fr-FR") : "Aucune synchronisation effectuée"}</span>
              {isAdmin && <form action={syncChariow}><input type="hidden" name="connection_id" value={connection.id}/><button className="button small"><RefreshCw size={14}/> Synchroniser les ventes</button></form>}
            </div>
          </div>
        ) : (
          <form action={connectChariow} className="module-form chariow-key-form">
            <label>Clé API Chariow<input name="api_key" type="password" required minLength={16} autoComplete="off" placeholder="Collez votre clé API Chariow"/></label>
            <button className="button" disabled={!isAdmin}>Vérifier et connecter <ArrowUpRight size={15}/></button>
            {!isAdmin && <small>Seul le propriétaire ou un administrateur peut connecter une source.</small>}
          </form>
        )}
        <p className="chariow-help">Pour créer votre clé : <Link href="https://app.chariow.com" target="_blank">ouvrir Chariow</Link>, puis Paramètres → API Keys. <Link href="https://chariow.dev/en/introduction/authentication" target="_blank">Guide officiel de l’API</Link>.</p>
      </section>

      {connection && (
        <section className="chariow-analytics">
          <div className="workspace-list-head"><div><h2>Performances de la boutique</h2><p>Données importées depuis l’API Chariow · {sales.length} vente(s) chargée(s)</p></div><span className="status-pill">{liveApiError ? "API à vérifier" : "Données synchronisées"}</span></div>
          <div className="metric-grid chariow-metrics">
            <article className="metric-card"><div><span>Chiffre d’affaires brut</span><ShoppingBag size={17}/></div><strong>{money(gross, currency)}</strong><small>Ventes au statut terminé</small></article>
            <article className="metric-card"><div><span>Montant net reversé</span><CheckCircle2 size={17}/></div><strong>{money(net, currency)}</strong><small>Selon les règlements fournis</small></article>
            <article className="metric-card"><div><span>Ventes réussies</span><CheckCircle2 size={17}/></div><strong>{completed.length}</strong><small>Paiements terminés</small></article>
            <article className="metric-card"><div><span>Échecs / abandons</span><AlertCircle size={17}/></div><strong>{failed.length + abandoned.length + cancelled.length}</strong><small>{failed.length} échec(s), {abandoned.length} abandon(s), {cancelled.length} paiement(s) annulé(s)</small></article>
          </div>
          <div className="module-list">
            <div className="workspace-list-head"><div><h2>Dernières ventes importées</h2><p>Le détail financier et le statut de paiement reçus de Chariow.</p></div></div>
            {sales.length ? <div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Produit</th><th>Statut</th><th>Paiement</th><th>Montant</th><th>Date</th></tr></thead><tbody>{sales.slice(0,20).map(sale=><tr key={sale.id}><td><b>{sale.product_name || "Produit numérique"}</b><small>{sale.external_sale_id}</small></td><td>{sale.sale_status}</td><td>{sale.payment_status || "—"}</td><td>{sale.amount === null ? "—" : money(Number(sale.amount), sale.currency || currency)}</td><td>{sale.external_created_at ? new Date(sale.external_created_at).toLocaleDateString("fr-FR") : "—"}</td></tr>)}</tbody></table></div> : <div className="module-empty"><ShoppingBag size={24}/><b>Aucune vente importée</b><span>Cliquez sur « Synchroniser les ventes » pour importer l’historique disponible.</span></div>}
          </div>
          <p className="module-description">La synchronisation actuelle importe jusqu’à 2 000 ventes par lancement. Les notifications en temps réel via les webhooks sécurisés Chariow (Pulses) seront ajoutées dans l’étape suivante.</p>
        </section>
      )}

      <section className="module-form-card">
        <div className="eyebrow">AJOUTER UN PRODUIT EXTERNE</div><h2>Suivre un produit vendu sur un autre site</h2>
        <p className="module-description">Ajoutez sa page de vente. Pour obtenir les ventes privées, il faudra connecter l’API de la plateforme ou envoyer des événements de commande à ZENIT.</p>
        <form action={addDigitalProduct} className="module-form">
          <label>Nom du produit<input name="name" required minLength={2} placeholder="Ex. Guide complet du marketing"/></label>
          <label>Lien de la page de vente<input name="url" type="url" required placeholder="https://monsite.com/mon-ebook"/></label>
          <button className="button" disabled={!isAdmin}>Enregistrer le produit <ArrowUpRight size={15}/></button>
        </form>
      </section>

      <section className="module-list">
        <div className="workspace-list-head"><div><h2>Produits enregistrés</h2><p>Produits numériques de votre espace.</p></div></div>
        {ownProducts.length ? ownProducts.map(product=><article className="workspace-row" key={product.id}><div className="workspace-symbol"><Package size={19}/></div><div><b>{product.name}</b><small>{product.website_url}</small></div><span className="integration-pending">Suivi à configurer</span></article>) : <div className="module-empty"><Package size={25}/><b>Aucun produit externe ajouté</b><span>Connectez Chariow ou ajoutez un produit hébergé ailleurs.</span></div>}
      </section>
    </main>
  );
}
