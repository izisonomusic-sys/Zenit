import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,Code2,KeyRound,BookOpen,ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function DeveloperPage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:members}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=members?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const{data:projects}=await supabase.from("tracked_projects").select("id,name,platform,website_url").eq("workspace_id",workspaceId).order("created_at",{ascending:false});
 const{count}=await supabase.from("api_keys").select("*",{count:"exact",head:true}).eq("workspace_id",workspaceId).is("revoked_at",null);
 return <main className="dashboard-main module-main">
 <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
 <header className="dashboard-header"><div><div className="eyebrow">ZENIT / ESPACE DÉVELOPPEUR</div><h1>Développeur.</h1><p>Connectez votre propre SaaS à ZENIT avec une clé API et un SDK facile à installer.</p></div><span className="status-pill">{count||0} clé(s) active(s)</span></header>
 <section className="digital-types"><div><KeyRound/><b>API ZENIT</b><small>Envoyer vos événements depuis votre serveur</small></div><div><Code2/><b>SDK JavaScript</b><small>Mesurer automatiquement les pages vues</small></div><div><ShieldCheck/><b>Sécurité</b><small>Clés révocables et domaines autorisés</small></div></section>
 <section className="module-form-card"><div className="eyebrow">COMMENT ÇA MARCHE ?</div><h2>Trois étapes simples</h2><ol className="developer-steps"><li><b>Ajoutez votre application</b><span>Enregistrez le nom et le domaine de votre SaaS dans « Mes SaaS ».</span></li><li><b>Créez une clé API</b><span>ZENIT génère une clé propre à ce projet. Copiez-la, elle ne sera affichée qu’une seule fois.</span></li><li><b>Installez le SDK</b><span>Copiez le petit script dans le fichier principal de votre application. Vous pouvez demander à votre assistant IA de le faire à votre place.</span></li></ol><p className="module-description">Vous n’avez pas besoin de créer un projet Supabase ou Render pour ZENIT. Le SDK est hébergé par ZENIT. Vous ajoutez simplement son script dans le code de votre application. Pour les données confidentielles, votre serveur utilise l’API avec une clé stockée dans ses variables d’environnement.</p><Link className="button" href="/dashboard/saas">Ajouter ou configurer mon SaaS <ArrowUpRight size={15}/></Link></section>
 <section className="module-list"><div className="workspace-list-head"><div><h2>Mes applications</h2><p>Choisissez un projet pour gérer ses clés API et son SDK.</p></div></div>{projects?.length?projects.map(p=><article className="workspace-row" key={p.id}><div className="workspace-symbol"><Code2 size={18}/></div><div><b>{p.name}</b><small>{p.website_url||"Domaine à configurer"} · {p.platform}</small></div><Link className="button small" href={"/dashboard/saas/"+p.id}>API & SDK <ArrowUpRight size={14}/></Link></article>):<div className="module-empty"><Code2 size={24}/><b>Aucun projet pour le moment</b><span>Ajoutez d’abord votre SaaS, puis créez sa clé API.</span><Link href="/dashboard/saas" className="button small">Ajouter mon SaaS</Link></div>}</section>
 </main>;
}
