import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PlugZap, Code2, ShoppingBag, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDataSource } from "./actions";
export const dynamic="force-dynamic";
const providers=[["sdk","SDK JavaScript","Suivi des événements depuis votre site ou application"],["rest_api","API REST","Envoyez vos événements depuis votre serveur"],["webhook","Webhook","Recevez des événements depuis vos outils"],["ga4","Google Analytics 4","Importez vos données Google Analytics"],["shopify","Shopify","Connectez votre boutique Shopify"],["woocommerce","WooCommerce","Connectez votre boutique WooCommerce"],["meta_ads","Meta Ads","Données de campagnes publicitaires"],["youtube","YouTube","Statistiques de votre chaîne"]];
export default async function IntegrationsPage({searchParams}:{searchParams:Promise<{added?:string;error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const{data:sources}=await supabase.from("data_sources").select("id,name,source,status,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false});
 const params=await searchParams;
 return <main className="dashboard-main module-main"><Link href="/dashboard" className="module-back"><ArrowLeft size={15}/> Tableau de bord</Link><header className="dashboard-header"><div><div className="eyebrow">ESPACE PRIVÉ / CONNECTEURS</div><h1>Intégrations.</h1><p>Ajoutez les sources de données que vous souhaitez connecter à ZENIT.</p></div><span className="status-pill">{sources?.length??0} source(s)</span></header>
 {params.added&&<div className="success-banner">La source a été ajoutée. Elle est en attente de configuration.</div>}{params.error&&<div className="form-message">Impossible d’ajouter cette source. Réessayez.</div>}
 <section className="module-form-card"><div className="eyebrow">CATALOGUE DE CONNEXIONS</div><h2>Choisissez une source</h2><p className="module-description">Cette étape enregistre la source dans votre espace. L’autorisation OAuth ou les paramètres techniques seront configurés dans les prochaines étapes.</p><form action={addDataSource} className="module-form"><label>Type de connexion<select name="provider" defaultValue="sdk">{providers.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Nom affiché<input name="display_name" required minLength={2} placeholder="Ex. Site principal"/></label><button className="button">Ajouter la source <span>↗</span></button></form></section>
 <section className="module-list"><div className="workspace-list-head"><div><h2>Vos sources</h2><p>État des sources enregistrées dans cet espace.</p></div></div>{sources?.length?sources.map(s=><article className="workspace-row" key={s.id}><div className="workspace-symbol"><PlugZap size={19}/></div><div><b>{s.name}</b><small>{s.source.toUpperCase()}</small></div><span className="workspace-ready">{s.status==="connected"?"Connectée":s.status==="error"?"Erreur":"À configurer"}</span></article>):<div className="module-empty"><PlugZap size={25}/><b>Aucune source connectée</b><span>Ajoutez SDK, API, webhooks ou une plateforme de votre choix.</span></div>}</section>
 </main>;
}
