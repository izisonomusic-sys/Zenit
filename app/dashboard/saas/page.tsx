import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,Globe2,Layers3} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {createSaaS} from "./actions";
export const dynamic="force-dynamic";
const labels:Record<string,string>={saas:"SaaS",website:"Site web",web_app:"Application web",mobile_app:"Application mobile"};
export default async function SaaSPage({searchParams}:{searchParams:Promise<{created?:string;error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:m}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=m?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const [itemsResult,sourcesResult,connectionsResult,keysResult,eventsResult,params]=await Promise.all([
  supabase.from("tracked_projects").select("id,name,platform,website_url,is_active,created_at").eq("workspace_id",workspaceId).in("platform",["saas","website","web_app","mobile_app"]).order("created_at",{ascending:false}),
  supabase.from("data_sources").select("project_id,status,source").eq("workspace_id",workspaceId),
  supabase.from("integration_connections").select("project_id,status,provider").eq("workspace_id",workspaceId),
  supabase.from("api_keys").select("project_id").eq("workspace_id",workspaceId).is("revoked_at",null),
  supabase.from("events").select("project_id").eq("workspace_id",workspaceId).limit(5000),
  searchParams
 ]);
 const connectedIds=new Set<string>();
 for(const x of sourcesResult.data||[])if(x.project_id&&x.status==="connected")connectedIds.add(x.project_id);
 for(const x of connectionsResult.data||[])if(x.project_id&&x.status==="connected")connectedIds.add(x.project_id);
 for(const x of keysResult.data||[])if(x.project_id)connectedIds.add(x.project_id);
 for(const x of eventsResult.data||[])if(x.project_id)connectedIds.add(x.project_id);
 const items=itemsResult.data||[];const connected=items.filter(p=>p.is_active&&connectedIds.has(p.id));const paramsValue=await params;
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / PORTEFEUILLE LOGICIEL</div><h1>Applications & SaaS.</h1><p>Vos applications connectées, leurs statuts et leurs statistiques au même endroit.</p></div><span className="status-pill">{connected.length} connecté(s)</span></header>
  {paramsValue.created&&<div className="success-banner">Votre application a été ajoutée à votre espace.</div>}
  {paramsValue.error&&<div className="form-message">Impossible d’enregistrer cette application. Vérifiez les informations.</div>}
  <section className="module-form-card"><div className="eyebrow">NOUVELLE APPLICATION</div><h2>Importer une application</h2><p className="module-description">Ajoutez votre site, application web, application mobile ou SaaS. Une fois la connexion reçue, son statut sera automatiquement actualisé.</p><form action={createSaaS} className="module-form"><label>Nom de l’application<input name="name" required minLength={2} placeholder="Ex. Mon application"/></label><label>Type<select name="kind" defaultValue="saas"><option value="saas">SaaS</option><option value="website">Site web</option><option value="web_app">Application web</option><option value="mobile_app">Application mobile</option></select></label><label>URL publique<input name="website_url" type="url" placeholder="https://mon-app.com"/></label><button className="button">Importer une application <ArrowUpRight size={15}/></button></form></section>
  <section className="module-list"><div className="workspace-list-head"><div><h2>Applications de votre espace</h2><p>{connected.length} connexion(s) active(s) sur {items.length} application(s) enregistrée(s).</p></div></div>
  {items.length?items.map(p=>{const isConnected=p.is_active&&connectedIds.has(p.id);return <article className="workspace-row" key={p.id}><div className="workspace-symbol"><Globe2 size={19}/></div><div><b>{p.name}</b><small>{labels[p.platform]||p.platform} · {p.website_url||"URL non renseignée"}</small></div><span className={isConnected?"workspace-ready":"integration-pending"}>{isConnected?"Déjà connecté":"À connecter"}</span><Link className="button small" href={"/dashboard/saas/"+p.id}>Voir plus <ArrowUpRight size={14}/></Link></article>}):<div className="module-empty"><Layers3 size={25}/><b>Aucune application importée</b><span>Utilisez le formulaire ci-dessus pour ajouter votre première application.</span></div>}
  </section>
 </main>;
}