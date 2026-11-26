import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,ShoppingBag,Store,PlugZap} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {importStore} from "./actions";
export const dynamic="force-dynamic";
const storeTypes=[{key:"shopify",letter:"S",label:"Shopify",detail:"Commandes, produits, remboursements et chiffre d'affaires."},{key:"woocommerce",letter:"W",label:"WooCommerce",detail:"Commandes, clients, produits et revenus."},{key:"custom",letter:"↗",label:"Boutique personnalisée",detail:"Connexion sécurisée par API ou webhook."}];
export default async function BoutiquesPage({searchParams}:{searchParams:Promise<{imported?:string;error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const [storesResult,sourcesResult,connectionsResult,params]=await Promise.all([
  supabase.from("tracked_projects").select("id,name,platform,website_url,created_at,is_active").eq("workspace_id",workspaceId).eq("platform","ecommerce").order("created_at",{ascending:false}),
  supabase.from("data_sources").select("id,name,source,status,project_id,last_synced_at").eq("workspace_id",workspaceId),
  supabase.from("integration_connections").select("id,provider,display_name,status,project_id,last_synced_at,sync_status").eq("workspace_id",workspaceId).in("provider",["shopify","woocommerce"]).order("created_at",{ascending:false}),
  searchParams
 ]);
 const sources=sourcesResult.data||[];const connections=connectionsResult.data||[];const stores=storesResult.data||[];const paramsValue=await params;
 const connectedIds=new Set<string>();for(const x of sources)if(x.project_id&&x.status==="connected")connectedIds.add(x.project_id);for(const x of connections)if(x.project_id&&x.status==="connected")connectedIds.add(x.project_id);
 const providerConnected=new Set(connections.filter(x=>x.status==="connected").map(x=>x.provider));
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / COMMERCE</div><h1>Mes boutiques.</h1><p>Vos boutiques e-commerce, leur statut de connexion et leurs performances.</p></div><span className="status-pill">{stores.filter(s=>s.is_active&&connectedIds.has(s.id)).length+connections.filter(c=>c.status==="connected"&&!c.project_id).length} connectée(s)</span></header>
  {paramsValue.imported&&<div className="success-banner">Boutique ajoutée. Son statut passera à « Déjà connecté » après une autorisation réussie.</div>}
  {paramsValue.error&&<div className="form-message">Import impossible : vérifiez le nom, l'URL et réessayez.</div>}
  <section className="store-connect-grid">{storeTypes.map(item=><article key={item.key}><span className={"store-brand "+item.key}>{item.letter}</span><b>{item.label}</b><small>{item.detail}</small></article>)}</section>
  <section className="module-form-card"><div className="eyebrow">NOUVELLE BOUTIQUE</div><h2>Importer une boutique</h2><p className="module-description">Enregistrez votre boutique. ZENIT affichera le statut connecté uniquement après validation de l’autorisation de la plateforme.</p><form action={importStore} className="module-form"><label>Nom de la boutique<input name="name" required minLength={2} placeholder="Ex. Ma boutique"/></label><label>Plateforme<select name="provider" defaultValue="shopify"><option value="shopify">Shopify</option><option value="woocommerce">WooCommerce</option><option value="other">Autre / API personnalisée</option></select></label><label>URL de la boutique<input name="url" type="url" required placeholder="https://ma-boutique.com"/></label><button className="button">Importer la boutique <ArrowUpRight size={15}/></button></form></section>
  <section className="module-list"><div className="workspace-list-head"><div><h2>Boutiques de votre espace</h2><p>Les connexions autorisées et les boutiques enregistrées.</p></div></div>
   {connections.filter(c=>c.status==="connected").map(c=><article className="workspace-row" key={"connection-"+c.id}><div className="workspace-symbol"><ShoppingBag size={19}/></div><div><b>{c.display_name||c.provider}</b><small>{c.provider.toUpperCase()} · {c.last_synced_at?"Dernière synchronisation : "+new Date(c.last_synced_at).toLocaleString("fr-FR"):"Connexion active"}</small></div><span className="workspace-ready">Déjà connecté</span><Link className="button small" href={c.project_id?"/dashboard/saas/"+c.project_id:"/dashboard/boutiques"}>Voir plus <ArrowUpRight size={14}/></Link></article>)}
   {stores.map(store=>{const isConnected=store.is_active&&connectedIds.has(store.id);return <article className="workspace-row" key={store.id}><div className="workspace-symbol"><Store size={19}/></div><div><b>{store.name}</b><small>{store.website_url||"URL non renseignée"} · {storeTypes.find(t=>t.key===store.platform)?.label||"Boutique"}</small></div><span className={isConnected?"workspace-ready":"integration-pending"}>{isConnected?"Déjà connecté":"À connecter"}</span><Link className="button small" href={"/dashboard/saas/"+store.id}>Voir plus <ArrowUpRight size={14}/></Link></article>})}
   {!stores.length&&!connections.length&&<div className="module-empty"><Store size={25}/><b>Aucune boutique importée</b><span>Ajoutez votre première boutique avec le formulaire ci-dessus.</span></div>}
  </section>
  <section className="integration-note"><PlugZap size={19}/><div><b>Une connexion doit être vérifiée avant d’afficher les statistiques.</b><p>Les commandes, clients et paiements ne sont affichés qu’après une autorisation effective et une synchronisation des données.</p></div></section>
 </main>;
}