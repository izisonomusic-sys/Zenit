import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {Activity,ArrowLeft,ArrowRight,Code2} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const PAGE_SIZE=100;
const number=(n:number)=>new Intl.NumberFormat("fr-FR").format(n);
export default async function SaaSEventsPage({params,searchParams}:{params:Promise<{projectId:string}>;searchParams:Promise<{page?:string}>}){
 const {projectId}=await params;const query=await searchParams;
 const page=Math.max(1,Math.min(10000,Number.parseInt(query.page||"1",10)||1));
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:project}=await supabase.from("tracked_projects").select("id,name,workspace_id").eq("id",projectId).maybeSingle();
 if(!project)notFound();
 const {data:membership}=await supabase.from("workspace_members").select("workspace_id").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!membership)notFound();
 const [{count},{data:events,error}]=await Promise.all([
  supabase.from("events").select("id",{count:"exact",head:true}).eq("project_id",projectId),
  supabase.from("events").select("id,event_name,event_time,page_url,referrer,anonymous_id,session_id,user_id,properties").eq("project_id",projectId).order("event_time",{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1)
 ]);
 const total=count||0;const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 return <main className="dashboard-main module-main">
  <Link href={"/dashboard/saas/"+projectId} className="module-back"><ArrowLeft size={14}/> Retour à {project.name}</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / DONNÉES BRUTES</div><h1>Événements de {project.name}.</h1><p>Historique des événements reçus et enregistrés par ZENIT.</p></div><span className="status-pill">{number(total)} événement(s)</span></header>
  {error?<div className="form-message">Impossible de charger les événements. Réessayez.</div>:events?.length?<section className="project-events-panel"><div className="workspace-list-head"><div><h2>Historique complet</h2><p>Page {page} sur {pages} · {number(total)} événements au total.</p></div><span className="integration-sync-frequency"><Activity size={14}/> Données réelles</span></div>{events.map(event=><article className="project-event-detail" key={event.id}><div className="project-event-detail-head"><b>{event.event_name}</b><time>{new Date(event.event_time).toLocaleString("fr-FR")}</time></div><div className="project-event-meta"><span>URL : {event.page_url||"Non fournie"}</span><span>Session : {event.session_id||"Non identifiée"}</span><span>Visiteur : {event.anonymous_id||"Non identifié"}</span></div>{event.properties&&Object.keys(event.properties).length>0&&<details><summary>Voir les propriétés de l’événement</summary><pre>{JSON.stringify(event.properties,null,2)}</pre></details>}</article>)}<nav className="project-events-pagination"><span>Page {page} / {pages}</span><div>{page>1&&<Link className="button small" href={"/dashboard/saas/"+projectId+"/events?page="+(page-1)}><ArrowLeft size={14}/> Précédent</Link>}{page<pages&&<Link className="button small" href={"/dashboard/saas/"+projectId+"/events?page="+(page+1)}>Suivant <ArrowRight size={14}/></Link>}</div></nav></section>:<div className="module-empty"><Activity size={25}/><b>Aucun événement enregistré</b><span>Installez le SDK et envoyez des événements depuis votre application. Ils apparaîtront ici dès leur réception.</span><Link href={"/dashboard/saas/"+projectId}><Code2 size={14}/> Configurer le SDK</Link></div>}
 </main>;
}
