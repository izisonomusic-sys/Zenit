import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, MessageCircle, PlayCircle, Share2, Eye, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addDataSource } from "../integrations/actions";
export const dynamic = "force-dynamic";
const social=[
 {id:"instagram",name:"Instagram",description:"Reels, vues, portée, commentaires et interactions",logo:"https://cdn.simpleicons.org/instagram/E4405F",color:"#E4405F"},
 {id:"facebook",name:"Facebook",description:"Pages, publications, portée et engagement",logo:"https://cdn.simpleicons.org/facebook/1877F2",color:"#1877F2"},
 {id:"tiktok",name:"TikTok",description:"Vues vidéo, likes, commentaires et audience selon les accès API",logo:"https://cdn.simpleicons.org/tiktok/FFFFFF",color:"#ffffff"},
 {id:"youtube",name:"YouTube",description:"Vues, abonnés, commentaires et revenus éligibles",logo:"https://cdn.simpleicons.org/youtube/FF0033",color:"#FF0033"},
 {id:"linkedin",name:"LinkedIn",description:"Pages, publications et interactions professionnelles",logo:"https://cdn.simpleicons.org/linkedin/0A66C2",color:"#0A66C2"},
 {id:"x",name:"X",description:"Impressions et interactions selon les droits API",logo:"https://cdn.simpleicons.org/x/FFFFFF",color:"#ffffff"}
];
export default async function SocialPage({searchParams}:{searchParams:Promise<{added?:string;error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const{data:sources}=await supabase.from("data_sources").select("id,name,source,config,status").eq("workspace_id",workspaceId);const params=await searchParams;
 const added=new Set((sources||[]).map(s=>String((s.config as any)?.provider||s.source)));
 return <main className="dashboard-main module-main"><Link href="/dashboard" className="module-back">← Tableau de bord</Link><header className="dashboard-header"><div><div className="eyebrow">ZENIT / SOCIAL ANALYTICS</div><h1>Réseaux sociaux.</h1><p>Centralisez les statistiques de vos comptes et de vos contenus vidéo.</p></div><span className="status-pill">{social.filter(s=>added.has(s.id)).length} compte(s) ajouté(s)</span></header>
 {params.added&&<div className="success-banner">{params.added} a été ajouté à votre espace. L’autorisation officielle reste à configurer.</div>}{params.error&&<div className="form-message">Impossible d’ajouter ce réseau social. Réessayez.</div>}
 <section className="social-hero"><div><span className="eyebrow">VUES · ENGAGEMENT · CONVERSIONS</span><h2>Comprenez ce que vos contenus<br/><em>rapportent vraiment.</em></h2><p>Mesurez les vues et interactions accessibles via les API officielles, puis reliez les clics aux ventes grâce aux liens suivis et aux événements de commande.</p></div><div className="social-kpis"><div><Eye/><b>Vues</b><small>Performance vidéo</small></div><div><MessageCircle/><b>Commentaires</b><small>Engagement</small></div><div><Users/><b>Audience</b><small>Abonnés et portée</small></div><div><PlayCircle/><b>Revenus</b><small>Quand la plateforme les expose</small></div></div></section>
 <section className="integration-group"><div className="integration-group-heading"><h2>Connecter un réseau</h2><p>Choisissez les comptes que vous gérez. Chaque plateforme demandera ses propres autorisations.</p></div><div className="integration-grid">{social.map(item=>{const exists=added.has(item.id);return <article className="integration-card" key={item.id}><div className="integration-card-top"><span className="integration-logo" style={{backgroundColor:item.color+"18",borderColor:item.color+"55"}}><img src={item.logo} alt="" loading="lazy"/></span><span className={exists?"integration-state is-added":"integration-state"}>{exists?"Ajouté":"Disponible"}</span></div><h3>{item.name}</h3><p>{item.description}</p><form action={addDataSource}><input type="hidden" name="provider" value={item.id}/><button className={exists?"integration-add is-added":"integration-add"} disabled={exists}>{exists?"Déjà dans votre espace":<>Ajouter ce réseau <ArrowUpRight size={14}/></>}</button></form></article>})}</div></section>
 <section className="integration-note"><Share2 size={19}/><div><b>Les ventes attribuées à une vidéo demandent un suivi supplémentaire.</b><p>ZENIT peut mesurer les clics avec des liens UTM propres à chaque vidéo. Pour confirmer une vente, la boutique ou le site doit ensuite envoyer un événement de commande payée. Les commentaires seuls ne prouvent pas qu'une vente a été réalisée.</p></div></section>
 </main>;
}