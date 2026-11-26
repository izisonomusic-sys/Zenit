import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe2, Smartphone, ShoppingBag, Layers3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createTrackedProject } from "./actions";

export const dynamic = "force-dynamic";
const labels: Record<string,string> = { website:"Site web", web_app:"Application web", mobile_app:"Application mobile", ecommerce:"E-commerce", saas:"SaaS", other:"Autre" };
export default async function ProjectsPage({searchParams}:{searchParams:Promise<{created?:string;error?:string}>}) {
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);
  const workspaceId = memberships?.[0]?.workspace_id;
  if (!workspaceId) redirect("/dashboard");
  const { data: projects } = await supabase.from("tracked_projects").select("id,name,platform,website_url,is_active,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false});
  const params=await searchParams;
  return <main className="dashboard-main module-main"><Link href="/dashboard" className="module-back"><ArrowLeft size={15}/> Tableau de bord</Link><header className="dashboard-header"><div><div className="eyebrow">ESPACE PRIVÉ / PORTEFEUILLE</div><h1>Vos projets.</h1><p>Ajoutez les sites, applications et produits que vous souhaitez suivre avec ZENIT.</p></div><span className="status-pill">{projects?.length??0} projet(s)</span></header>
  {params.created&&<div className="success-banner">Votre projet a été ajouté à votre espace.</div>}
  {params.error&&<div className="form-message">Impossible d’ajouter ce projet. Vérifiez les informations et réessayez.</div>}
  <section className="module-form-card"><div className="eyebrow">NOUVEAU PROJET</div><h2>Ajouter un projet à suivre</h2><form action={createTrackedProject} className="module-form"><label>Nom du projet<input name="name" required minLength={2} maxLength={120} placeholder="Ex. Ma boutique en ligne"/></label><label>Type de projet<select name="platform" defaultValue="website"><option value="website">Site web</option><option value="web_app">Application web</option><option value="mobile_app">Application mobile</option><option value="ecommerce">E-commerce</option><option value="saas">SaaS</option><option value="other">Autre</option></select></label><label>Adresse du site (facultatif)<input name="website_url" type="url" placeholder="https://exemple.com"/></label><button className="button">Ajouter le projet <span>↗</span></button></form></section>
  <section className="module-list"><div className="workspace-list-head"><div><h2>Projets enregistrés</h2><p>Les projets de votre espace de travail.</p></div></div>{projects?.length?projects.map(p=><article className="workspace-row" key={p.id}><div className="workspace-symbol"><Globe2 size={19}/></div><div><b>{p.name}</b><small>{labels[p.platform]??p.platform} {p.website_url? "· "+p.website_url:""}</small></div><span className="workspace-ready">{p.is_active?"Actif":"En pause"}</span></article>):<div className="module-empty"><Layers3 size={25}/><b>Aucun projet pour le moment</b><span>Ajoutez votre premier site ou application pour commencer.</span></div>}</section>
  </main>;
}
