import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, CheckCircle2, Download, Package, RefreshCw, ShoppingBag, Store, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDigitalProduct, connectChariow, syncChariow } from "./actions";
export const dynamic="force-dynamic";
const errorMessages:Record<string,string>={
 key:"La clé API semble trop courte.",permission:"Seul le propriétaire ou un administrateur peut connecter Chariow.",
 network:"Impossible de joindre Chariow. Réessayez.",invalid_key:"Chariow a refusé cette clé API. Vérifiez-la dans Paramètres → Clés API.",
 response:"La réponse de Chariow est illisible.",store:"La clé fonctionne peut-être, mais les informations de boutique sont absentes.",
 save:"La clé a été vérifiée, mais son enregistrement sécurisé a échoué."
};
export default async function DigitalProductsPage({searchParams}:{searchParams:Promise<{added?:string;error?:string;chariow_connected?:string;chariow_error?:string;sync_error?:string;synced?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1);const membership=memberships?.[0];const workspaceId=membership?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const [{data:products},{data:connection}]=await Promise.all([
  supabase.from("tracked_projects").select("id,name,website_url,created_at").eq("workspace_id",workspaceId).eq("platform","other").order("created_at",{ascending:false}),
  supabase.from("integration_connections").select("id,display_name,external_account_id,status,last_synced_at").eq("workspace_id",workspaceId).eq("provider","chariow").order("created_at",{ascending:false}).limit(1).maybeSingle()
 ]);
 const params=await searchParams;
 let summaries:any[]=[];let sales:any[]=[];
 if(connection?.id){
  const [summaryResult,salesResult]=await Promise.all([
   supabase.rpc("zenit_chariow_sales_summary",{p_connection_id:connection.id}),
   supabase.from("commerce_sales").select("id,external_sale_id,sale_status,payment_status,amount,currency,settlement_amount,fee_amount,product_name,external_created_at,external_completed_at,channel").eq("workspace_id",workspaceId).eq("connection_id",connection.id).order("external_created_at",{ascending:false}).limit(12)
  ]);
  summaries=summaryResult.data||[];sales=salesResult.data||[];
 }
 const total=(key:string)=>summaries.reduce((sum,row)=>sum+Number(row[key]||0),0);
 const money=(value:number,currency:string)=>currency&&currency!=="N/A"?new Intl.NumberFormat("fr-FR",{style:"currency",currency}).format(value):new Intl.NumberFormat("fr-FR").format(value);
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / ÉCONOMIE NUMÉRIQUE</div><h1>Produits numériques.</h1><p>Suivez vos ebooks, formations, licences et ventes de produits digitaux.</p></div><span className="status-pill">{products?.length??0} produit(s) enregistré(s)</span></header>
  {params.added&&<div className="success-banner">Produit enregistré dans votre espace.</div>}
  {params.error&&<div className="form-message">Impossible d’enregistrer le produit. Vérifiez le nom et l’URL.</div>}
  {params.chariow_connected&&<div className="success-banner">Chariow est connecté. Vous pouvez maintenant synchroniser vos ventes.</div>}
  {params.chariow_error&&<div className="form-message">{errorMessages[params.chariow_error]||"La connexion Chariow a échoué."}</div>}
  {params.sync_error&&<div className="form-message">La synchronisation Chariow a échoué. Vérifiez l’autorisation et réessayez.</div>}
  {params.synced!==undefined&&<div className="success-banner">Synchronisation terminée : {params.synced} vente(s) importée(s) ou actualisée(s).</div>}
  <section className="digital-types"><div><BookOpen/><b>Ebooks & documents</b><small>Ventes et téléchargements</small></div><div><Download/><b>Fichiers & licences</b><small>Accès, activations et renouvellements</small></div><div><ShoppingBag/><b>Produits vendus en ligne</b><small>Commandes et revenus</small></div></section>
  <section className="chariow-panel">
   <div className="chariow-heading"><div className="chariow-brand">C</div><div><span className="eyebrow">CONNECTEUR OFFICIEL PAR API</span><h2>Chariow</h2><p>Importez les ventes, paiements, produits, clients et montants de règlement de votre boutique digitale.</p></div><span className={connection?"chariow-connected":"integration-pending"}>{connection?"Connecté":"Non connecté"}</span></div>
   {connection?<><div className="chariow-store-line"><div><b>{connection.display_name}</b><small>Compte boutique : {connection.external_account_id}</small></div><span>{connection.last_synced_at?"Dernière synchro : "+new Date(connection.last_synced_at).toLocaleString("fr-FR"):"Aucune synchronisation"}</span></div>
    <div className="chariow-metrics"><article><small>Ventes enregistrées</small><b>{total("total_sales").toLocaleString("fr-FR")}</b></article><article><small>Ventes terminées</small><b>{total("completed_sales").toLocaleString("fr-FR")}</b></article><article><small>En attente</small><b>{total("pending_sales").toLocaleString("fr-FR")}</b></article><article><small>Clients distincts</small><b>{total("unique_customers").toLocaleString("fr-FR")}</b></article></div>
    {summaries.length>0&&<div className="chariow-currency-grid">{summaries.map(row=><article key={row.currency}><span>{row.currency}</span><div><small>Chiffre d’affaires confirmé</small><b>{money(Number(row.gross_revenue),row.currency)}</b></div><div><small>Règlement net annoncé</small><b>{money(Number(row.net_settlement),row.currency)}</b></div><div><small>Frais enregistrés</small><b>{money(Number(row.total_fees),row.currency)}</b></div></article>)}</div>}
    <form action={syncChariow}><input type="hidden" name="connection_id" value={connection.id}/><button className="button"><RefreshCw size={15}/> Synchroniser les ventes Chariow</button></form>
   </>:<div className="chariow-connect"><div><h3>Connecter votre boutique Chariow</h3><p>Dans Chariow, ouvrez Paramètres → Clés API, créez une clé et collez-la ci-dessous. ZENIT vérifie la clé en lisant les informations de la boutique, puis la conserve chiffrée dans le coffre sécurisé Supabase Vault. La clé ne sera pas affichée après l’envoi.</p><a href="https://chariow.dev/fr/introduction/overview" target="_blank" rel="noreferrer">Lire la documentation officielle de l’API Chariow ↗</a></div><form action={connectChariow} className="module-form"><label>Clé API Chariow<input name="api_key" type="password" required minLength={16} autoComplete="off" placeholder="Collez votre clé API Chariow"/></label><button className="button">Vérifier et connecter Chariow <ArrowUpRight size={15}/></button><small>Connexion en lecture pour l’analytique. ZENIT ne crée aucune vente et ne touche pas aux paiements.</small></form></div>}
  </section>
  {connection&&<section className="module-list"><div className="workspace-list-head"><div><h2>Dernières ventes Chariow</h2><p>Les ventes sont importées depuis l’API officielle de Chariow.</p></div></div>{sales.length?sales.map(s=><article className="workspace-row" key={s.id}><div className="workspace-symbol"><Wallet size={18}/></div><div><b>{s.product_name||"Produit Chariow"}</b><small>{s.external_sale_id} · {s.external_created_at?new Date(s.external_created_at).toLocaleString("fr-FR"):"Date inconnue"} · {s.channel||"Canal inconnu"}</small></div><div className="chariow-sale-amount"><b>{money(Number(s.amount||0),s.currency||"N/A")}</b><small>{s.payment_status||s.sale_status}</small></div><span className={["completed","settled"].includes(s.sale_status)?"workspace-ready":"integration-pending"}>{s.sale_status}</span></article>):<div className="module-empty"><ShoppingBag size={24}/><b>Aucune vente synchronisée</b><span>Lancez une synchronisation pour importer l’historique de votre boutique.</span></div>}</section>}
  <section className="module-form-card"><div className="eyebrow">AJOUTER UN PRODUIT HORS CHARIOW</div><h2>Importer un produit numérique</h2><p className="module-description">Ajoutez la page de vente ou le site qui héberge votre produit. Pour les ventes privées, ZENIT devra se connecter à la plateforme ou recevoir les événements de commande.</p><form action={addDigitalProduct} className="module-form"><label>Nom du produit<input name="name" required minLength={2} placeholder="Ex. Guide complet du marketing"/></label><label>Lien de la page de vente<input name="url" type="url" required placeholder="https://monsite.com/mon-ebook"/></label><button className="button">Enregistrer le produit <ArrowUpRight size={15}/></button></form></section>
  <section className="module-list"><div className="workspace-list-head"><div><h2>Produits enregistrés</h2><p>Produits numériques de votre espace.</p></div></div>{products?.length?products.map(p=><article className="workspace-row" key={p.id}><div className="workspace-symbol"><Package size={19}/></div><div><b>{p.name}</b><small>{p.website_url}</small></div><span className="integration-pending">Suivi à configurer</span></article>):<div className="module-empty"><Package size={25}/><b>Aucun produit ajouté</b><span>Ajoutez votre premier ebook ou produit digital.</span></div>}</section>
 </main>;
}