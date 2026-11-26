import Link from "next/link";
import {redirect} from "next/navigation";
import {Activity,ArrowUpRight,Cable,Globe2,Layers3,Package,Smartphone,Store,ChartNoAxesCombined} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";

const number=(n:number)=>new Intl.NumberFormat("fr-FR").format(n);
const platformLabel:Record<string,string>={website:"Site web",web_app:"Application web",mobile_app:"Application mobile",ecommerce:"Boutique en ligne",saas:"SaaS",other:"Application"};
const sourceLabel:Record<string,string>={sdk:"SDK ZENIT",rest_api:"API REST",webhook:"Webhook",ga4:"Google Analytics",shopify:"Shopify",woocommerce:"WooCommerce",meta_ads:"Meta Ads",youtube:"YouTube",chariow:"Chariow",instagram:"Instagram",facebook:"Facebook",tiktok:"TikTok",linkedin:"LinkedIn",x:"X",google_ads:"Google Ads",other:"Autre service"};
const sourceHref=(source:string)=>source==="chariow"?"/dashboard/produits-numeriques":["shopify","woocommerce"].includes(source)?"/dashboard/boutiques":["instagram","facebook","tiktok","linkedin","x","youtube","meta_ads"].includes(source)?"/dashboard/reseaux-sociaux":"/dashboard/integrations";

export default async function DashboardPage(){
 const s=await createClient();
 const{data:{user}}=await s.auth.getUser();
 if(!user)redirect("/login");
 const{data:memberships}=await s.from("workspace_members").select("workspace_id,role,workspaces(id,name,slug)").eq("user_id",user.id).limit(1);
 if(!memberships?.length){
  const full=String(user.user_metadata?.full_name||"").trim();
  const base=(full||String(user.email||"Mon espace").split("@")[0]).slice(0,60);
  const slug=base.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,42)+"-"+crypto.randomUUID().slice(0,6);
  const{error}=await s.from("workspaces").insert({name:base||"Mon espace",slug,created_by:user.id});
  if(error)return <main className="dashboard-main"><div className="form-message">Impossible d'initialiser votre espace. Rechargez la page ou contactez le support.</div></main>;
  redirect("/dashboard");
 }
 const m=memberships[0];const ws=Array.isArray(m.workspaces)?m.workspaces[0]:m.workspaces;const workspaceId=m.workspace_id;
 const since=new Date(Date.now()-30*86400000).toISOString();
 const [projectsResult,sourcesResult,connectionsResult,keysResult,eventsResult,eventsCount,insightsCount]=await Promise.all([
  s.from("tracked_projects").select("id,name,platform,website_url,is_active,currency_code,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}).limit(200),
  s.from("data_sources").select("id,name,source,status,project_id,last_synced_at,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}).limit(300),
  s.from("integration_connections").select("id,provider,display_name,status,project_id,sync_status,last_synced_at,last_sync_error,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}).limit(300),
  s.from("api_keys").select("id,project_id,key_type,last_used_at,revoked_at").eq("workspace_id",workspaceId).is("revoked_at",null).limit(500),
  s.from("events").select("project_id,event_name,event_time").eq("workspace_id",workspaceId).gte("event_time",since).order("event_time",{ascending:false}).limit(5000),
  s.from("events").select("id",{count:"exact",head:true}).eq("workspace_id",workspaceId).gte("event_time",since),
  s.from("ai_insights").select("id",{count:"exact",head:true}).eq("workspace_id",workspaceId)
 ]);
 const projects=projectsResult.data||[];const sources=sourcesResult.data||[];const connections=connectionsResult.data||[];const keys=keysResult.data||[];const events=eventsResult.data||[];
 const connectedSources=sources.filter(x=>x.status==="connected");
 const connectedIntegrations=connections.filter(x=>x.status==="connected");
 const connectedProjectIds=new Set<string>();
 for(const x of connectedSources)if(x.project_id)connectedProjectIds.add(x.project_id);
 for(const x of connectedIntegrations)if(x.project_id)connectedProjectIds.add(x.project_id);
 for(const x of keys)if(x.project_id)connectedProjectIds.add(x.project_id);
 for(const x of events)if(x.project_id)connectedProjectIds.add(x.project_id);
 const connectedProjects=projects.filter(p=>p.is_active&&connectedProjectIds.has(p.id));
 const siteCount=connectedProjects.filter(p=>p.platform==="website").length;
 const appCount=connectedProjects.filter(p=>["web_app","mobile_app","saas"].includes(p.platform)).length;
 const shopKeys=new Set<string>();
 for(const p of connectedProjects)if(p.platform==="ecommerce")shopKeys.add("project:"+p.id);
 for(const x of connectedSources)if(["shopify","woocommerce"].includes(x.source))shopKeys.add("source:"+String(x.project_id||x.id));
 for(const x of connectedIntegrations)if(["shopify","woocommerce"].includes(x.provider))shopKeys.add("integration:"+String(x.project_id||x.id));
 const productKeys=new Set<string>();
 for(const x of connectedSources)if(["chariow"].includes(x.source))productKeys.add("source:"+String(x.project_id||x.id));
 for(const x of connectedIntegrations)if(["chariow"].includes(x.provider))productKeys.add("integration:"+String(x.project_id||x.id));
 const serviceKeys=new Set<string>();
 for(const x of connectedSources)serviceKeys.add(String(x.project_id||x.id)+":"+x.source);
 for(const x of connectedIntegrations)serviceKeys.add(String(x.project_id||x.id)+":"+x.provider);
 const projectCards=projects.map(p=>{
  const projectEvents=events.filter(e=>e.project_id===p.id);
  const lastEvent=projectEvents[0]?.event_time||null;
  return {...p,connected:p.is_active&&connectedProjectIds.has(p.id),eventCount:projectEvents.length,lastEvent};
 });
 const externalSources=connectedSources;
 const integrationCards=connectedIntegrations;
 const fmtDate=(value:string|null)=>value?new Date(value).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}):"Aucune donnée reçue";
 const metrics=[
  {label:"Sites connectés",value:siteCount,icon:Globe2,note:"Sites web suivis"},
  {label:"Applications",value:appCount,icon:Smartphone,note:"Web, mobile et SaaS"},
  {label:"Boutiques",value:shopKeys.size,icon:Store,note:"E-commerce connecté"},
  {label:"Services connectés",value:serviceKeys.size,icon:Cable,note:"SDK, API et intégrations"},
  {label:"Produits numériques",value:productKeys.size,icon:Package,note:"Plateformes de vente digitale"}
 ];
 return <main className="dashboard-main">
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / CENTRE DE PILOTAGE</div><h1>Bonjour{user.user_metadata?.full_name?", "+String(user.user_metadata.full_name).split(" ")[0]:""}.</h1><p>Votre écosystème connecté · <b>{ws?.name||"Mon espace"}</b>.</p></div><span className="status-pill"><i/> Espace actif</span></header>
  <section className="overview-welcome"><div><span className="eyebrow">VOTRE ÉCOSYSTÈME NUMÉRIQUE</span><h2>Vos plateformes.<br/><em>Leurs performances.</em></h2><p>Retrouvez ici les sites, applications, boutiques et services réellement connectés à ZENIT. Ouvrez chaque fiche pour consulter ses statistiques.</p><div className="overview-actions"><Link className="button" href="/dashboard/integrations">Connecter une application <ArrowUpRight size={16}/></Link><Link className="overview-secondary" href="/dashboard/saas">Ajouter un site ou SaaS</Link></div></div><div className="overview-visual"><div className="overview-orbit orbit-a"/><div className="overview-orbit orbit-b"/><div className="overview-core">Z<span>DATA HUB</span></div><div className="overview-float float-a">Connectés <b>{number(connectedProjects.length+externalSources.length+integrationCards.length)}</b></div><div className="overview-float float-b">Événements · 30 j <b>{number(eventsCount.count||0)}</b></div></div></section>
  <section className="connected-metric-grid">{metrics.map(({label,value,icon:Icon,note})=><article className="metric-card" key={label}><div><span>{label}</span><Icon size={18}/></div><strong>{number(value)}</strong><small>{note}</small></article>)}</section>
  <section className="connected-assets-section"><div className="connected-assets-heading"><div><span className="eyebrow">VOS PROJETS</span><h2>Sites et applications</h2><p>Chaque carte ouvre les performances détaillées de la plateforme.</p></div><Link href="/dashboard/saas">Gérer les projets <ArrowUpRight size={14}/></Link></div>
   {projectCards.length?<div className="connected-assets-grid">{projectCards.map(p=><article className="connected-asset-card" key={p.id}><div className="connected-asset-top"><span className="connected-asset-icon"><Globe2 size={19}/></span><span className={p.connected?"connected-asset-status":"connected-asset-status pending"}>{p.connected?"Déjà connecté":"À connecter"}</span></div><span className="eyebrow">{platformLabel[p.platform]||"Application"}</span><h3>{p.name}</h3><p className="connected-asset-domain">{p.website_url||"Domaine non renseigné"}</p><div className="connected-asset-meta"><span><Activity size={13}/>{number(p.eventCount)} événement(s) · 30 j</span><span>{fmtDate(p.lastEvent)}</span></div><Link className="button small" href={"/dashboard/saas/"+p.id}>Voir plus <ArrowUpRight size={14}/></Link></article>)}</div>:<div className="empty-inline"><Layers3 size={22}/><b>Aucun site ou SaaS ajouté</b><span>Ajoutez un site, une boutique ou une application pour commencer son suivi.</span><Link href="/dashboard/saas">Ajouter une plateforme <ArrowUpRight size={14}/></Link></div>}
  </section>
  <section className="connected-assets-section"><div className="connected-assets-heading"><div><span className="eyebrow">CONNEXIONS EXTERNES</span><h2>Services et produits connectés</h2><p>Vos API, outils, réseaux sociaux et plateformes de vente autorisés.</p></div><Link href="/dashboard/integrations">Catalogue <ArrowUpRight size={14}/></Link></div>
   {externalSources.length||integrationCards.length?<div className="connected-assets-grid">{externalSources.map(x=><article className="connected-asset-card" key={"source-"+x.id}><div className="connected-asset-top"><span className="connected-asset-icon"><Cable size={19}/></span><span className="connected-asset-status">Déjà connecté</span></div><span className="eyebrow">SOURCE DE DONNÉES</span><h3>{x.name||sourceLabel[x.source]||x.source}</h3><p className="connected-asset-domain">{sourceLabel[x.source]||x.source}</p><div className="connected-asset-meta"><span>{x.last_synced_at?"Dernière synchronisation":"Connexion active"}</span><span>{fmtDate(x.last_synced_at)}</span></div><Link className="button small" href={x.source==="sdk"&&x.project_id?"/dashboard/saas/"+x.project_id:sourceHref(x.source)}>Voir plus <ArrowUpRight size={14}/></Link></article>)}{integrationCards.map(x=><article className="connected-asset-card" key={"integration-"+x.id}><div className="connected-asset-top"><span className="connected-asset-icon"><ChartNoAxesCombined size={19}/></span><span className="connected-asset-status">Autorisé</span></div><span className="eyebrow">INTÉGRATION OAUTH</span><h3>{x.display_name||sourceLabel[x.provider]||x.provider}</h3><p className="connected-asset-domain">{sourceLabel[x.provider]||x.provider}{x.sync_status&&x.sync_status!=="synced"?" · synchronisation à configurer":""}</p><div className="connected-asset-meta"><span>{x.last_synced_at?"Dernière synchronisation":"Autorisation enregistrée"}</span><span>{fmtDate(x.last_synced_at)}</span></div><Link className="button small" href={x.project_id?"/dashboard/saas/"+x.project_id:"/dashboard/integrations"}>Voir plus <ArrowUpRight size={14}/></Link></article>)}</div>:<div className="empty-inline"><Cable size={22}/><b>Aucun service externe connecté</b><span>Vos connexions SDK, API, boutiques et services apparaîtront ici après leur autorisation.</span><Link href="/dashboard/integrations">Explorer les intégrations <ArrowUpRight size={14}/></Link></div>}
  </section>
  <section className="dashboard-compact-footer"><div><span className="eyebrow">ACTIVITÉ GLOBALE</span><b>{number(eventsCount.count||0)} événements collectés</b><small>sur les 30 derniers jours · {number(insightsCount.count||0)} analyse(s) IA enregistrée(s)</small></div><Link href="/dashboard/developpement/documentation">Documentation API et SDK <ArrowUpRight size={14}/></Link></section>
  <footer className="dashboard-foot">ZENIT · DONNÉES RÉELLES DE VOTRE ESPACE · {ws?.name||"ESPACE ACTIF"}</footer>
 </main>;
}
