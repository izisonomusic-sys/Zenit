import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,Code2,Globe2} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import SdkKeyPanel from "./keys-panel";
export const dynamic="force-dynamic";
export default async function SaaSDetailPage({params}:{params:Promise<{projectId:string}>}){
 const {projectId}=await params;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:membership}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1).maybeSingle();
 if(!membership)redirect("/dashboard");
 const {data:project}=await supabase.from("tracked_projects").select("id,name,platform,website_url,is_active").eq("id",projectId).eq("workspace_id",membership.workspace_id).maybeSingle();
 if(!project)notFound();
 const {data:keys}=await supabase.from("api_keys").select("id,label,key_prefix,last_used_at,revoked_at,created_at").eq("project_id",projectId).order("created_at",{ascending:false});
 const endpoint=process.env.NEXT_PUBLIC_SITE_URL||"https://zenit-unv7.onrender.com";
 return <main className="dashboard-main module-main">
  <Link href="/dashboard/saas" className="module-back"><ArrowLeft size={14}/> Mes SaaS</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / CONFIGURATION DU SUIVI</div><h1>{project.name}.</h1><p>Configurez la collecte de données et l’installation du SDK pour ce projet.</p></div><span className="status-pill"><i/> Projet enregistré</span></header>
  <section className="module-form-card"><div className="workspace-row"><div className="workspace-symbol"><Globe2 size={19}/></div><div><b>{project.name}</b><small>{project.website_url||"Aucun domaine renseigné"} · {project.platform}</small></div></div>{!project.website_url&&<div className="integration-note"><Code2 size={18}/><div><b>Ajoutez le domaine de votre site</b><p>La collecte depuis un navigateur vérifie que l’origine correspond au domaine enregistré. Modifiez l’URL du projet avant d’installer le SDK.</p></div></div>}</section>
  <SdkKeyPanel projectId={project.id} keys={keys||[]} endpoint={endpoint}/>
  <section className="integration-note"><Code2 size={19}/><div><b>Événements disponibles</b><p>Le SDK enregistre automatiquement les pages vues. Dans votre application, appelez <code>window.zenit.track(&quot;sign_up&quot;, &#123;&quot;method&quot;:&quot;email&quot;&#125;)</code> après une inscription réussie. Pour les achats, remboursements et abonnements, envoyez les événements depuis le backend de votre application, jamais depuis le navigateur avec des données de paiement privées.</p><p>Respectez le consentement et les règles de confidentialité applicables avant d’activer la mesure des visiteurs.</p></div></section>
 </main>;
}
