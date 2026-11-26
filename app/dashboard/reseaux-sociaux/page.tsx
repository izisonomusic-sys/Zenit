import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,ChartNoAxesCombined,Eye,MessageCircle,PlayCircle,Users} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const social=[
 {id:"instagram",name:"Instagram",description:"Reels, vues, portée et interactions",logo:"https://cdn.simpleicons.org/instagram/E4405F",oauth:true},
 {id:"facebook",name:"Facebook",description:"Pages, publications, portée et engagement",logo:"https://cdn.simpleicons.org/facebook/1877F2",oauth:true},
 {id:"tiktok",name:"TikTok",description:"Vues vidéo, likes, commentaires et audience",logo:"https://cdn.simpleicons.org/tiktok/000000",oauth:true},
 {id:"youtube",name:"YouTube",description:"Vues, abonnés, commentaires et revenus éligibles",logo:"https://cdn.simpleicons.org/youtube/FF0033",oauth:true},
 {id:"linkedin",name:"LinkedIn",description:"Profil professionnel ; statistiques de page selon les permissions",logo:"https://cdn.simpleicons.org/linkedin/0A66C2",oauth:true},
 {id:"x",name:"X",description:"Impressions et interactions selon les droits API",logo:"https://cdn.simpleicons.org/x/000000",oauth:false}
];
export default async function SocialPage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const [sourcesResult,connectionsResult]=await Promise.all([
  supabase.from("data_sources").select("id,name,source,status,project_id,last_synced_at,config").eq("workspace_id",workspaceId),
  supabase.from("integration_connections").select("id,provider,display_name,status,project_id,last_synced_at,sync_status").eq("workspace_id",workspaceId)
 ]);
 const sources=sourcesResult.data||[],connections=connectionsResult.data||[];
 const rows=social.map(item=>{const source=sources.find(s=>s.source===item.id||((s.config as any)?.provider===item.id));const connection=connections.find(c=>c.provider===item.id&&c.status==="connected");return {...item,source,connection,connected:!!connection||source?.status==="connected"};});
 const connected=rows.filter(x=>x.connected);
 return <main className="dashboard-main module-main"><Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / SOCIAL ANALYTICS</div><h1>Réseaux sociaux.</h1><p>Retrouvez tous vos comptes connectés et leur état de synchronisation.</p></div><span className="status-pill">{connected.length} réseau(x) connecté(s)</span></header>
  <section className="social-hero"><div><span className="eyebrow">VUES · ENGAGEMENT · AUDIENCE</span><h2>Vos réseaux.<br/><em>Vos performances.</em></h2><p>Connectez vos comptes professionnels via les autorisations officielles. Chaque réseau connecté sera listé ici avec son statut.</p></div><div className="social-kpis"><div><Eye/><b>Vues</b><small>Performance vidéo</small></div><div><MessageCircle/><b>Interactions</b><small>Engagement</small></div><div><Users/><b>Audience</b><small>Abonnés et portée</small></div><div><PlayCircle/><b>Contenus</b><small>Publications et vidéos</small></div></div></section>
  <section className="integration-group"><div className="integration-group-heading"><h2>Comptes et connexions</h2><p>Les comptes autorisés apparaissent avec « Déjà connecté ». Les autres peuvent démarrer leur parcours OAuth.</p></div><div className="integration-grid">{rows.map(item=><article className="integration-card" key={item.id}><div className="integration-card-top"><span className="integration-logo"><img src={item.logo} alt={item.name} loading="lazy"/></span><span className={item.connected?"integration-state is-added":"integration-state"}>{item.connected?"Déjà connecté":"À connecter"}</span></div><h3>{item.name}</h3><p>{item.description}</p>{item.connected?<><small className="social-sync-date">{item.connection?.last_synced_at||item.source?.last_synced_at?"Dernière synchronisation : "+new Date((item.connection?.last_synced_at||item.source?.last_synced_at) as string).toLocaleString("fr-FR"):"Autorisation active"}</small><Link className="button small" href={"/dashboard/integrations?provider="+item.id}>Voir plus <ArrowUpRight size={14}/></Link></>:item.oauth?<Link className="integration-add" href={"/api/integrations/oauth/start?provider="+item.id}>Connecter <ArrowUpRight size={14}/></Link>:<button className="integration-add" disabled>Connexion en préparation</button>}</article>)}</div></section>
 </main>;
}