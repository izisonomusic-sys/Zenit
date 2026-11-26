import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,Code2,Globe2} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import SdkKeyPanel from "./keys-panel";
import {updateSaaSDomain} from "../actions";
export const dynamic="force-dynamic";
export default async function SaaSDetailPage({params,searchParams}:{params:Promise<{projectId:string}>;searchParams:Promise<{domain_updated?:string}>}){
 const {projectId}=await params;const query=await searchParams;
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
  <section className="module-form-card"><div className="workspace-row"><div className="workspace-symbol"><Globe2 size={19}/></div><div><b>{project.name}</b><small>{project.website_url||"Aucun domaine renseigné"} · {project.platform}</small></div></div><form action={updateSaaSDomain.bind(null,projectId)} className="module-form"><label>Domaine autorisé pour le SDK<input name="website_url" type="url" required defaultValue={project.website_url||""} placeholder="https://mon-app.com"/></label><button className="button small">Enregistrer le domaine</button></form>{query.domain_updated&&<div className="success-banner">Domaine mis à jour. Le SDK peut maintenant vérifier l’origine du site.</div>}{!project.website_url&&<div className="integration-note"><Code2 size={18}/><div><b>Ajoutez le domaine de votre site</b><p>La collecte depuis un navigateur vérifie que l’origine correspond au domaine enregistré. Modifiez l’URL du projet avant d’installer le SDK.</p></div></div>}</section>
  <SdkKeyPanel projectId={project.id} keys={keys||[]} endpoint={endpoint}/>
  <section className="integration-note"><Code2 size={19}/><div><b>Événements disponibles</b><p>Le SDK enregistre automatiquement les pages vues. Dans votre application, appelez <code>window.zenit.track(&quot;sign_up&quot;, &#123;&quot;method&quot;:&quot;email&quot;&#125;)</code> après une inscription réussie. Pour les achats, remboursements et abonnements, envoyez les événements depuis le backend de votre application, jamais depuis le navigateur avec des données de paiement privées.</p><p>Respectez le consentement et les règles de confidentialité applicables avant d’activer la mesure des visiteurs.</p></div></section>
 </main>;
}
