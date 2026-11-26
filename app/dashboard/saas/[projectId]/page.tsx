import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {Activity,ArrowLeft,ArrowUpRight,Code2,Eye,Globe2,Users} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import SdkKeyPanel from "./keys-panel";
import {updateSaaSDomain} from "../actions";
export const dynamic="force-dynamic";
const number=(n:number)=>new Intl.NumberFormat("fr-FR").format(n||0);
const amount=(n:unknown)=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(n)||0);
type EventRow={id:string;event_name:string;event_time:string;page_url:string|null;anonymous_id:string|null;session_id:string|null;properties:Record<string,unknown>|null};
export default async function SaaSDetailPage({params,searchParams}:{params:Promise<{projectId:string}>;searchParams:Promise<{domain_updated?:string;domain_error?:string}>}){
 const {projectId}=await params;const query=await searchParams;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:project}=await supabase.from("tracked_projects").select("id,name,platform,website_url,is_active,workspace_id,currency_code").eq("id",projectId).maybeSingle();
 if(!project)notFound();
 const {data:membership}=await supabase.from("workspace_members").select("workspace_id,role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).maybeSingle();
 if(!membership)notFound();
 const [{data:keys},{count:eventCount},{data:events}]=await Promise.all([
  supabase.from("api_keys").select("id,label,key_prefix,key_type,last_used_at,revoked_at,created_at").eq("project_id",projectId).order("created_at",{ascending:false}),
  supabase.from("events").select("id",{count:"exact",head:true}).eq("project_id",projectId),
  supabase.from("events").select("id,event_name,event_time,page_url,anonymous_id,session_id,properties").eq("project_id",projectId).order("event_time",{ascending:false}).limit(100)
 ]);
 const endpoint=process.env.NEXT_PUBLIC_SITE_URL||"https://zenit-unv7.onrender.com";
 const rows=(events||[]) as EventRow[];
 const pageViews=rows.filter(e=>["page_view","$pageview","pageview"].includes(e.event_name.toLowerCase())).length;
 const sessions=new Set(rows.map(e=>e.session_id).filter(Boolean));
 const visitors=new Set(rows.map(e=>e.anonymous_id).filter(Boolean));
 const snapshot=rows.find(e=>e.event_name==="app_snapshot"&&e.properties?.source_app);
 const snapshotProps=snapshot?.properties||{};
 return <main className="dashboard-main module-main">
  <Link href="/dashboard/saas" className="module-back"><ArrowLeft size={14}/> Mes SaaS</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / ANALYSE DE L’APPLICATION</div><h1>{project.name}.</h1><p>Statistiques et événements réellement reçus depuis cette application.</p></div><span className="status-pill"><i/> Projet actif</span></header>
  <section className="project-analytics-kpis">
   <article><span><Activity size={15}/> Événements reçus</span><b>{number(eventCount||0)}</b><small>Total enregistré pour ce projet</small></article>
   <article><span><Eye size={15}/> Pages vues</span><b>{number(pageViews)}</b><small>Sur les 100 derniers événements chargés</small></article>
   <article><span><Users size={15}/> Sessions</span><b>{number(sessions.size)}</b><small>Sur les 100 derniers événements chargés</small></article>
   <article><span><Globe2 size={15}/> Visiteurs</span><b>{number(visitors.size)}</b><small>Sur les 100 derniers événements chargés</small></article>
  </section>
  {snapshot&&<section className="project-snapshot"><div className="analytics-panel-title"><b>Données métier synchronisées · {String(snapshotProps.source_app)}</b><span>État reçu le {new Date(snapshot.event_time).toLocaleString("fr-FR")}</span></div><div className="analytics-snapshot-grid">{[["clients_count","Clients"],["projects_count","Chantiers"],["quotes_count","Devis"],["invoices_count","Factures"],["expenses_count","Dépenses"],["catalog_items_count","Articles catalogue"],["suppliers_count","Fournisseurs"],["purchases_count","Achats"],["documents_count","Documents"]].map(([key,label])=><div className="analytics-snapshot-card" key={key}><span>{label}</span><b>{number(Number(snapshotProps[key])||0)}</b></div>)}</div><div className="analytics-snapshot-finance"><div><span>Devis cumulés</span><b>{amount(snapshotProps.quotes_total)} FCFA</b></div><div><span>Factures cumulées</span><b>{amount(snapshotProps.invoices_total)} FCFA</b></div><div><span>Montant encaissé</span><b>{amount(snapshotProps.revenue_paid_total)} FCFA</b></div><div><span>Dépenses cumulées</span><b>{amount(snapshotProps.expenses_total)} FCFA</b></div></div></section>}
  <section className="module-form-card"><div className="workspace-row"><div className="workspace-symbol"><Globe2 size={19}/></div><div><b>{project.name}</b><small>{project.website_url||"Aucun domaine renseigné"} · {project.platform} · {project.currency_code||"Devise non définie"}</small></div></div><form action={updateSaaSDomain.bind(null,projectId)} className="module-form"><label>Domaine autorisé pour le SDK<input name="website_url" type="url" required defaultValue={project.website_url||""} placeholder="https://mon-app.com"/></label><button className="button small">Enregistrer le domaine</button></form>{query.domain_updated&&<div className="success-banner">Domaine mis à jour. Le SDK peut maintenant vérifier l’origine du site.</div>}{query.domain_error&&<div className="form-message">{query.domain_error==="invalid"?"Entrez une URL HTTPS valide.":query.domain_error==="permission"?"Droit administrateur requis.":"Impossible de mettre à jour le domaine."}</div>}{!project.website_url&&<div className="integration-note"><Code2 size={18}/><div><b>Ajoutez le domaine de votre site</b><p>La collecte depuis un navigateur vérifie que l’origine correspond au domaine enregistré. Modifiez l’URL du projet avant d’installer le SDK.</p></div></div>}</section>
  <SdkKeyPanel projectId={project.id} keys={keys||[]} endpoint={endpoint}/>
  <section className="project-events-panel"><div className="workspace-list-head"><div><h2>Dernières données reçues</h2><p>Les événements les plus récents envoyés par l’application.</p></div><Link className="button small" href={"/dashboard/saas/"+project.id+"/events"}>Voir tout <ArrowUpRight size={14}/></Link></div>{rows.length?rows.slice(0,12).map(event=><article className="project-event-row" key={event.id}><div><b>{event.event_name}</b><small>{event.page_url||"URL non fournie"}</small></div><time>{new Date(event.event_time).toLocaleString("fr-FR")}</time></article>):<div className="module-empty"><Activity size={25}/><b>Aucune donnée reçue pour le moment</b><span>Le domaine et les clés sont enregistrés, mais aucun événement réel n’a encore été envoyé par l’application. Installez le SDK dans le code du site puis ouvrez-le et connectez-vous pour déclencher la collecte.</span></div>}</section>
  <section className="integration-note"><Code2 size={19}/><div><b>Événements disponibles</b><p>Le SDK enregistre automatiquement les pages vues. Dans votre application, appelez <code>window.zenit.track("sign_up", {"{"}"method":"email"{"}"})</code> après une inscription réussie. Pour les achats, remboursements et abonnements, envoyez les événements depuis le backend de votre application, jamais depuis le navigateur avec des données de paiement privées.</p><p>Respectez le consentement et les règles de confidentialité applicables avant d’activer la mesure des visiteurs.</p></div></section>
 </main>;
}
