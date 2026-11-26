import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, AlertCircle, BookOpen, CheckCircle2, Download, Package, RefreshCw, ShoppingBag, Store, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDigitalProduct, connectChariow, syncChariow } from "./actions";
export const dynamic="force-dynamic";
type Summary={currency:string;total_sales:number;completed_sales:number;pending_sales:number;failed_sales:number;abandoned_sales:number;cancelled_payments:number;gross_revenue:number;net_settlement:number;total_fees:number;unique_customers:number};
function money(value:number,currency:string){try{return new Intl.NumberFormat("fr-FR",{style:"currency",currency:currency||"XOF",maximumFractionDigits:0}).format(value);}catch{return value.toLocaleString("fr-FR")+" "+currency;}}
const errors:Record<string,string>={key:"La clé API est trop courte ou invalide.",permission:"Seuls le propriétaire ou un administrateur peuvent connecter une boutique.",network:"Impossible de joindre Chariow. Réessayez.",invalid_key:"Chariow a refusé cette clé API. Vérifiez-la dans Paramètres → API Keys.",response:"La réponse de Chariow n’a pas pu être lue.",store:"Les informations de la boutique sont introuvables.",save:"La clé a été vérifiée, mais son enregistrement sécurisé a échoué."};
export default async function DigitalProductsPage({searchParams}:{searchParams:Promise<{added?:string;error?:string;chariow_error?:string;chariow_connected?:string;synced?:string;sync_error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1);const membership=memberships?.[0];if(!membership)redirect("/dashboard");
 const workspaceId=membership.workspace_id;const isAdmin=["owner","admin"].includes(membership.role);
 const [{data:products},{data:connection},params]=await Promise.all([
  supabase.from("tracked_projects").select("id,name,website_url,created_at").eq("workspace_id",workspaceId).eq("platform","other").order("created_at",{ascending:false}),
  supabase.from("integration_connections").select("id,display_name,external_account_id,status,last_synced_at").eq("workspace_id",workspaceId).eq("provider","chariow").order("created_at",{ascending:false}).limit(1).maybeSingle(),
  searchParams
 ]);
 let summaries:Summary[]=[];let sales:any[]=[];
 if(connection?.id){
  const [summaryResult,salesResult]=await Promise.all([
   supabase.rpc("zenit_chariow_sales_summary",{p_connection_id:connection.id}),
   supabase.from("commerce_sales").select("id,external_sale_id,sale_status,payment_status,amount,currency,product_name,external_created_at,channel").eq("workspace_id",workspaceId).eq("connection_id",connection.id).order("external_created_at",{ascending:false}).limit(20)
  ]);
  summaries=(summaryResult.data||[]) as Summary[];sales=salesResult.data||[];
 }
 const sum=(key:keyof Summary)=>summaries.reduce((total,row)=>total+Number(row[key]||0),0);
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / ÉCONOMIE NUMÉRIQUE</div><h1>Produits numériques.</h1><p>Connectez vos plateformes de vente et suivez les ventes, paiements et licences.</p></div><span className="status-pill">{(products?.length||0)+(connection?1:0)} ressource(s)</span></header>
  {params.added&&<div className="success-banner">Produit enregistré. Connectez sa plateforme ou installez le suivi ZENIT pour recevoir ses ventes.</div>}
  {params.error&&<div className="form-message">Impossible d’enregistrer le produit. Vérifiez les informations et vos droits.</div>}
  {params.chariow_connected&&<div className="success-banner"><CheckCircle2 size={16}/> Boutique Chariow vérifiée et connectée. Lancez une première synchronisation.</div>}
  {params.chariow_error&&<div className="form-message"><AlertCircle size={16}/> {errors[params.chariow_error]||"La connexion Chariow a échoué."}</div>}
  {params.synced!==undefined&&<div className="success-banner">{params.synced} vente(s) importée(s) ou actualisée(s) depuis Chariow.</div>}
  {params.sync_error&&<div className="form-message">La synchronisation a échoué. Vérifiez les droits de la clé API puis réessayez.</div>}
  <section className="digital-types"><div><BookOpen/><b>Ebooks & documents</b><small>Ventes et téléchargements</small></div><div><Download/><b>Fichiers & licences</b><small>Accès et activations</small></div><div><ShoppingBag/><b>Produits vendus en ligne</b><small>Commandes et revenus</small></div></section>
  <section className="module-form-card chariow-connect-card">
   <div className="chariow-connect-head"><div><div className="eyebrow">CONNECTEUR API OFFICIEL</div><h2>{connection?"Chariow est connecté":"Connecter une boutique Chariow"}</h2><p className="module-description">ZENIT récupère les ventes et les statuts depuis l’API Chariow. La clé est conservée dans le coffre sécurisé Supabase Vault et n’est pas stockée en clair.</p></div><span className="chariow-mark">C</span></div>
   {connection?<><div className="workspace-row"><div className="workspace-symbol"><Store size={19}/></div><div><b>{connection.display_name}</b><small>ID boutique : {connection.external_account_id}</small></div><span className="workspace-ready">API connectée</span></div><div className="chariow-sync-row"><span>{connection.last_synced_at?"Dernière synchronisation : "+new Date(connection.last_synced_at).toLocaleString("fr-FR"):"Aucune synchronisation effectuée"}</span>{isAdmin&&<form action={syncChariow}><input type="hidden" name="connection_id" value={connection.id}/><button className="button small"><RefreshCw size={14}/> Synchroniser les ventes</button></form>}</div></>:<form action={connectChariow} className="module-form chariow-key-form"><label>Clé API Chariow<input name="api_key" type="password" required minLength={16} autoComplete="off" placeholder="Collez votre clé API Chariow"/></label><button className="button" disabled={!isAdmin}>Vérifier et connecter <ArrowUpRight size={15}/></button>{!isAdmin&&<small>Seul le propriétaire ou un administrateur peut connecter une source.</small>}</form>}
   <p className="chariow-help">Dans Chariow : Paramètres → API Keys → créer une clé. <Link href="https://app.chariow.com" target="_blank">Ouvrir Chariow ↗</Link> · <Link href="https://chariow.dev/fr/introduction/overview" target="_blank">Documentation API ↗</Link></p>
  </section>
  {connection&&<section className="chariow-analytics">
   <div className="workspace-list-head"><div><h2>Performances de la boutique</h2><p>Statistiques réelles importées depuis l’API Chariow.</p></div><span className="status-pill">{sales.length} vente(s) récentes</span></div>
   <div className="metric-grid chariow-metrics">
    <article className="metric-card"><div><span>Ventes enregistrées</span><ShoppingBag size={17}/></div><strong>{sum("total_sales").toLocaleString("fr-FR")}</strong><small>Tous statuts</small></article>
    <article className="metric-card"><div><span>Ventes réussies</span><CheckCircle2 size={17}/></div><strong>{sum("completed_sales").toLocaleString("fr-FR")}</strong><small>Paiements terminés</small></article>
    <article className="metric-card"><div><span>En attente</span><Wallet size={17}/></div><strong>{sum("pending_sales").toLocaleString("fr-FR")}</strong><small>Paiements en cours</small></article>
    <article className="metric-card"><div><span>Échecs</span><AlertCircle size={17}/></div><strong>{sum("failed_sales").toLocaleString("fr-FR")}</strong><small>Ventes ou paiements échoués</small></article>
    <article className="metric-card"><div><span>Abandonnées</span><ShoppingBag size={17}/></div><strong>{sum("abandoned_sales").toLocaleString("fr-FR")}</strong><small>Ventes abandonnées</small></article>
    <article className="metric-card"><div><span>Paiements annulés</span><AlertCircle size={17}/></div><strong>{sum("cancelled_payments").toLocaleString("fr-FR")}</strong><small>Transactions annulées</small></article>
   </div>
   <div className="chariow-currency-grid">{summaries.map(row=><article key={row.currency}><span>{row.currency}</span><div><small>Chiffre d’affaires confirmé</small><b>{money(Number(row.gross_revenue),row.currency)}</b></div><div><small>Règlement net détaillé</small><b>{Number(row.net_settlement)>0?money(Number(row.net_settlement),row.currency):"Détails non synchronisés"}</b></div><div><small>Frais détaillés</small><b>{Number(row.total_fees)>0?money(Number(row.total_fees),row.currency):"Détails non synchronisés"}</b></div></article>)}</div>
   <div className="module-list"><div className="workspace-list-head"><div><h2>Dernières ventes importées</h2><p>Statut de vente, paiement, produit et montant.</p></div></div>{sales.length?<div className="sales-table-wrap"><table className="sales-table"><thead><tr><th>Produit</th><th>Statut</th><th>Paiement</th><th>Montant</th><th>Date</th></tr></thead><tbody>{sales.map(sale=><tr key={sale.id}><td><b>{sale.product_name||"Produit numérique"}</b><small>{sale.external_sale_id}</small></td><td>{sale.sale_status}</td><td>{sale.payment_status||"—"}</td><td>{sale.amount===null?"—":money(Number(sale.amount),sale.currency||"XOF")}</td><td>{sale.external_created_at?new Date(sale.external_created_at).toLocaleDateString("fr-FR"):"—"}</td></tr>)}</tbody></table></div>:<div className="module-empty"><ShoppingBag size={24}/><b>Aucune vente importée</b><span>Lancez une synchronisation pour importer l’historique disponible.</span></div>}</div>
   <p className="module-description">Le chiffre d’affaires et les statuts proviennent de la liste des ventes. Les règlements nets et frais détaillés apparaîtront lorsque les données détaillées de vente ou les webhooks Pulses seront synchronisés.</p>
  </section>}
  <section className="module-form-card"><div className="eyebrow">AJOUTER UN PRODUIT EXTERNE</div><h2>Suivre un produit vendu sur un autre site</h2><p className="module-description">Ajoutez sa page de vente. Pour récupérer les ventes privées, il faudra connecter l’API de la plateforme ou envoyer des événements de commande à ZENIT.</p><form action={addDigitalProduct} className="module-form"><label>Nom du produit<input name="name" required minLength={2} placeholder="Ex. Guide complet du marketing"/></label><label>Lien de la page de vente<input name="url" type="url" required placeholder="https://monsite.com/mon-ebook"/></label><button className="button" disabled={!isAdmin}>Enregistrer le produit <ArrowUpRight size={15}/></button></form></section>
  <section className="module-list"><div className="workspace-list-head"><div><h2>Produits enregistrés</h2><p>Produits numériques hébergés hors Chariow.</p></div></div>{products?.length?products.map(product=><article className="workspace-row" key={product.id}><div className="workspace-symbol"><Package size={19}/></div><div><b>{product.name}</b><small>{product.website_url}</small></div><span className="integration-pending">Suivi à configurer</span></article>):<div className="module-empty"><Package size={25}/><b>Aucun produit externe ajouté</b><span>Connectez Chariow ou ajoutez un produit hébergé ailleurs.</span></div>}</section>
 </main>;
}