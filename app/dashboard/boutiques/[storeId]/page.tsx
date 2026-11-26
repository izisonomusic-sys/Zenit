import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,ArrowUpRight,Store,CalendarDays,Globe2} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function StoreDetail({params}:{params:Promise<{storeId:string}>}){
 const{storeId}=await params;const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:store}=await supabase.from("tracked_projects").select("id,name,website_url,created_at,workspace_id,platform,is_active").eq("id",storeId).eq("platform","ecommerce").maybeSingle();if(!store)notFound();
 const{data:membership}=await supabase.from("workspace_members").select("workspace_id").eq("workspace_id",store.workspace_id).eq("user_id",user.id).maybeSingle();if(!membership)notFound();
 const[{data:sources},{data:connections},{count:eventCount}]=await Promise.all([
  supabase.from("data_sources").select("id,name,source,status,last_synced_at").eq("project_id",storeId),
  supabase.from("integration_connections").select("id,provider,display_name,status,last_synced_at,sync_status").eq("project_id",storeId),
  supabase.from("events").select("id",{count:"exact",head:true}).eq("project_id",storeId)
 ]);
 const connected=(sources||[]).some(x=>x.status==="connected")||(connections||[]).some(x=>x.status==="connected")||(eventCount||0)>0;
 const lastSync=[...(sources||[]).map(x=>x.last_synced_at),...(connections||[]).map(x=>x.last_synced_at)].filter(Boolean).sort().at(-1)||null;
 return <main className="dashboard-main module-main"><Link href="/dashboard/boutiques" className="module-back"><ArrowLeft size={14}/> Mes boutiques</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / FICHE BOUTIQUE</div><h1>{store.name}.</h1><p>Statut, domaine et données reçues pour cette boutique.</p></div><span className={connected?"workspace-ready":"integration-pending"}>{connected?"Déjà connecté":"À connecter"}</span></header>
  <section className="project-analytics-kpis"><article><span><Store size={15}/> Statut</span><b>{connected?"Connectée":"En attente"}</b><small>Autorisation vérifiée</small></article><article><span><Globe2 size={15}/> Événements</span><b>{new Intl.NumberFormat("fr-FR").format(eventCount||0)}</b><small>Données reçues</small></article><article><span><CalendarDays size={15}/> Ajoutée le</span><b>{new Date(store.created_at).toLocaleDateString("fr-FR")}</b><small>Dans votre espace</small></article><article><span><CalendarDays size={15}/> Synchronisation</span><b>{lastSync?new Date(lastSync).toLocaleDateString("fr-FR"):"—"}</b><small>{lastSync?new Date(lastSync).toLocaleTimeString("fr-FR"):"Aucune synchronisation"}</small></article></section>
  <section className="module-form-card"><div className="workspace-row"><div className="workspace-symbol"><Store size={19}/></div><div><b>{store.name}</b><small>{store.website_url||"Aucun domaine renseigné"}</small></div><span className={connected?"workspace-ready":"integration-pending"}>{connected?"Déjà connecté":"À connecter"}</span></div>
   {(sources||[]).map(source=><div className="product-detail-meta" key={source.id}><div><span>{source.name||source.source}</span><span className={source.status==="connected"?"workspace-ready":"integration-pending"}>{source.status==="connected"?"Connecté":"En attente"}</span><span>{source.last_synced_at?new Date(source.last_synced_at).toLocaleString("fr-FR"):"Pas encore synchronisé"}</span></div></div>)}
   {!connected&&<p className="module-description">La boutique est enregistrée, mais ZENIT n’a pas encore reçu d’autorisation permettant de consulter ses données privées.</p>}
   {store.website_url&&<a className="button small" href={store.website_url} target="_blank" rel="noreferrer">Ouvrir la boutique <ArrowUpRight size={14}/></a>}
  </section>
 </main>;
}