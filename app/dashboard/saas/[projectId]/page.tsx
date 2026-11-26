import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {Activity,ArrowLeft,ArrowUpRight,Eye,Globe2,Users} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const number=(n:number)=>new Intl.NumberFormat("fr-FR").format(n||0);
const amount=(n:unknown)=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(n)||0);
type EventRow={id:string;event_name:string;event_time:string;page_url:string|null;anonymous_id:string|null;session_id:string|null;properties:Record<string,unknown>|null};
export default async function SaaSDetailPage({params}:{params:Promise<{projectId:string}>}){
 const {projectId}=await params;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:project}=await supabase.from("tracked_projects").select("id,name,platform,website_url,is_active,workspace_id,currency_code").eq("id",projectId).maybeSingle();
 if(!project)notFound();
 const {data:membership}=await supabase.from("workspace_members").select("workspace_id,role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!membership)notFound();
 const [{count:eventCount},{count:pageViewsCount},{data:events},{data:snapshotRows},{data:sources},{data:connections}]=await Promise.all([
  supabase.from("events").select("id",{count:"exact",head:true}).eq("project_id",projectId),
  supabase.from("events").select("id",{count:"exact",head:true}).eq("project_id",projectId).in("event_name",["page_view","$pageview","pageview"]),
  supabase.from("events").select("id,event_name,event_time,page_url,anonymous_id,session_id,properties").eq("project_id",projectId).order("event_time",{ascending:false}).limit(100),
  supabase.from("events").select("id,event_name,event_time,properties").eq("project_id",projectId).eq("event_name","app_snapshot").order("event_time",{ascending:false}).limit(1),
  supabase.from("data_sources").select("id,status").eq("project_id",projectId),
  supabase.from("integration_connections").select("id,status").eq("project_id",projectId)
 ]);
 const rows=(events||[]) as EventRow[];
 const sessions=new Set(rows.map(e=>e.session_id).filter(Boolean));
 const visitors=new Set(rows.map(e=>e.anonymous_id).filter(Boolean));
 const snapshot=snapshotRows?.[0]||null;
 const snapshotProps=(snapshot?.properties||{}) as Record<string,unknown>;
 const connected=rows.length>0||(sources||[]).some(x=>x.status==="connected")||(connections||[]).some(x=>x.status==="connected");
 const snapshotLabels=[
  ["businesses_count","Entreprises"],["clients_count","Clients"],["projects_count","Chantiers"],
  ["quotes_count","Devis"],["invoices_count","Factures"],["payments_count","Paiements"],
  ["expenses_count","Dépenses"],["products_count","Articles catalogue"],["suppliers_count","Fournisseurs"],
  ["purchases_count","Achats"],["documents_count","Documents"]
 ] as const;
 return <main className="dashboard-main module-main">
  <Link href="/dashboard/saas" className="module-back"><ArrowLeft size={14}/> Applications & SaaS</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / ANALYSE DE L’APPLICATION</div><h1>{project.name}.</h1><p>Statistiques et données réellement reçues depuis cette application.</p></div><span className="status-pill"><i/>{connected?"Déjà connecté":"À connecter"}</span></header>
  <section className="project-analytics-kpis">
   <article><span><Activity size={15}/> Événements reçus</span><b>{number(eventCount||0)}</b><small>Total enregistré pour ce projet</small></article>
   <article><span><Eye size={15}/> Pages vues</span><b>{number(pageViewsCount||0)}</b><small>Total des pages vues enregistrées</small></article>
   <article><span><Users size={15}/> Sessions récentes</span><b>{number(sessions.size)}</b><small>Sur les 100 derniers événements</small></article>
   <article><span><Globe2 size={15}/> Visiteurs récents</span><b>{number(visitors.size)}</b><small>Sur les 100 derniers événements</small></article>
  </section>
  {snapshot&&<section className="project-snapshot"><div className="analytics-panel-title"><b>Données métier synchronisées · {String(snapshotProps.source_app||project.name)}</b><span>Dernière synchronisation : {new Date(snapshot.event_time).toLocaleString("fr-FR")}</span></div><div className="analytics-snapshot-grid">{snapshotLabels.map(([key,label])=><div className="analytics-snapshot-card" key={key}><span>{label}</span><b>{number(Number(snapshotProps[key])||0)}</b></div>)}</div><div className="analytics-snapshot-finance"><div><span>Total devis</span><b>{amount(snapshotProps.quotes_total)} FCFA</b></div><div><span>Total facturé</span><b>{amount(snapshotProps.invoices_total)} FCFA</b></div><div><span>Montant encaissé</span><b>{amount(snapshotProps.revenue_paid_total)} FCFA</b></div><div><span>Dépenses totales</span><b>{amount(snapshotProps.expenses_total)} FCFA</b></div><div><span>Paiements enregistrés</span><b>{amount(snapshotProps.payments_total)} FCFA</b></div></div></section>}
  {!snapshot&&<section className="project-snapshot project-snapshot-empty"><b>Les statistiques métier ne sont pas encore synchronisées.</b><p>Les statistiques apparaîtront ici dès que cette application transmettra des données à ZENIT.</p></section>}
  <section className="module-form-card"><div className="workspace-row"><div className="workspace-symbol"><Globe2 size={19}/></div><div><b>{project.name}</b><small>{project.website_url||"Aucun domaine renseigné"} · {project.platform} · {project.currency_code||"Devise non définie"}</small></div><span className={connected?"workspace-ready":"integration-pending"}>{connected?"Déjà connecté":"À connecter"}</span></div></section>
  <section className="project-events-panel"><div className="workspace-list-head"><div><h2>Dernières données reçues</h2><p>Les événements les plus récents envoyés par l’application.</p></div><Link className="button small" href={"/dashboard/saas/"+project.id+"/events"}>Voir tout <ArrowUpRight size={14}/></Link></div>{rows.length?rows.slice(0,12).map(event=><article className="project-event-row" key={event.id}><div><b>{event.event_name}</b><small>{event.page_url||"URL non fournie"}</small></div><time>{new Date(event.event_time).toLocaleString("fr-FR")}</time></article>):<div className="module-empty"><Activity size={25}/><b>Aucune donnée reçue pour le moment</b><span>Les événements et statistiques apparaîtront après une connexion effective.</span></div>}</section>
 </main>;
}