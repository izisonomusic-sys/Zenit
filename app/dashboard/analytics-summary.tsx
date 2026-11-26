"import {Activity,ArrowUpRight,MousePointerClick,Users,Eye} from "lucide-react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";

type EventRow={id:string;event_name:string;event_time:string;session_id:string|null;anonymous_id:string|null;page_url:string|null;project_id:string};
const number=(n:number)=>new Intl.NumberFormat("fr-FR").format(n);
const dayKey=(date:Date)=>date.toISOString().slice(0,10);
const dayLabel=(date:Date)=>date.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",timeZone:"UTC"});

export default async function AnalyticsSummary({workspaceId}:{workspaceId:string}){
 const supabase=await createClient();
 const since=new Date(Date.now()-13*86400000);since.setUTCHours(0,0,0,0);
 const {data,error}=await supabase.from("events").select("id,event_name,event_time,session_id,anonymous_id,page_url,project_id").eq("workspace_id",workspaceId).gte("event_time",since.toISOString()).order("event_time",{ascending:false}).limit(2000);
 const rows=(data||[]) as EventRow[];
 const days=Array.from({length:14},(_,i)=>{const d=new Date(since);d.setUTCDate(d.getUTCDate()+i);return {key:dayKey(d),label:dayLabel(d),count:0};});
 const dayMap=new Map(days.map(d=>[d.key,d]));
 const eventCounts=new Map<string,number>();
 const sessions=new Set<string>();const visitors=new Set<string>();
 let pageViews=0;
 for(const event of rows){
  const key=dayKey(new Date(event.event_time));const day=dayMap.get(key);if(day)day.count++;
  eventCounts.set(event.event_name,(eventCounts.get(event.event_name)||0)+1);
  if(event.session_id)sessions.add(event.session_id);
  if(event.anonymous_id)visitors.add(event.anonymous_id);
  if(["page_view","$pageview","pageview"].includes(event.event_name.toLowerCase()))pageViews++;
 }
 const max=Math.max(1,...days.map(d=>d.count));
 const top=[...eventCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
 const latest=rows.slice(0,6);
 return <section className="analytics-summary">
  <div className="analytics-summary-head"><div><span className="eyebrow">MESURE D’AUDIENCE · 14 DERNIERS JOURS</span><h2>Activité réelle</h2><p>Événements effectivement reçus par le collecteur ZENIT.</p></div><Link href="/dashboard/saas">Configurer le suivi <ArrowUpRight size={14}/></Link></div>
  {error?<div className="analytics-empty"><Activity size={22}/><b>Les données analytiques sont momentanément indisponibles.</b><span>Réessayez dans quelques instants.</span></div>:rows.length===0?<div className="analytics-empty"><Activity size={24}/><b>Pas encore de données collectées</b><span>Ajoutez un SaaS, créez une clé SDK et installez le script sur votre site. Les statistiques apparaîtront dès les premiers événements réels.</span><Link href="/dashboard/saas">Configurer mon premier suivi <ArrowUpRight size={14}/></Link></div>:<>
   <div className="analytics-kpis"><article><span><Activity size={15}/> Événements</span><b>{number(rows.length)}</b><small>sur les 14 derniers jours</small></article><article><span><Eye size={15}/> Pages vues</span><b>{number(pageViews)}</b><small>événements de type page_view</small></article><article><span><Users size={15}/> Sessions identifiées</span><b>{number(sessions.size)}</b><small>sessions présentes dans les événements reçus</small></article><article><span><MousePointerClick size={15}/> Visiteurs anonymes</span><b>{number(visitors.size)}</b><small>identifiants anonymes distincts</small></article></div>
   <div className="analytics-summary-grid"><article className="analytics-panel"><div className="analytics-panel-title"><b>Événements par jour</b><span>14 jours</span></div><div className="analytics-bars">{days.map(d=><div className="analytics-bar-column" key={d.key} title={d.label+": "+d.count+" événements"}><div className="analytics-bar-track"><i style={{height:(d.count?Math.max(4,d.count/max*100):0)+"%"}}/></div><small>{d.label}</small></div>)}</div><p className="analytics-footnote">{rows.length===2000?"Échantillon limité aux 2 000 événements les plus récents.":"Comptage basé sur les événements présents dans votre espace."}</p></article>
   <article className="analytics-panel"><div className="analytics-panel-title"><b>Événements principaux</b><span>{top.length} types</span></div>{top.map(([name,count])=><div className="analytics-event-row" key={name}><span>{name}</span><b>{number(count)}</b></div>)}</article></div>
   <article className="analytics-panel analytics-recent"><div className="analytics-panel-title"><b>Derniers événements reçus</b><span>Temps réel à la prochaine actualisation</span></div>{latest.map(event=><div className="analytics-event-row" key={event.id}><span><b>{event.event_name}</b><small>{event.page_url||"URL non fournie"}</small></span><time>{new Date(event.event_time).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</time></div>)}</article>
  </>}
 </section>;
}
