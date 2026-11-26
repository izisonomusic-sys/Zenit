import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, CircleHelp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import IntegrationCatalogue from "./catalogue";
export const dynamic="force-dynamic";
export default async function IntegrationsPage({searchParams}:{searchParams:Promise<{provider?:string;setup_required?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const[{data:sources},params]=await Promise.all([supabase.from("data_sources").select("id,name,source,status,config,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}),searchParams]);
 const connected=(sources||[]).filter(s=>s.status==="connected").map(s=>String((s.config as any)?.provider||s.source));
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / APP DIRECTORY</div><h1>Applications.</h1><p>Recherchez vos outils et connectez-les à ZENIT depuis un catalogue unique.</p></div><span className="status-pill">{connected.length} connexion(s) active(s)</span></header>
  {params.setup_required&&<div className="integration-note"><CircleHelp size={19}/><div><b>Autorisation de l’application à configurer</b><p>Le bouton Installer est prêt dans le catalogue, mais la connexion OAuth officielle de ce fournisseur nécessite l’enregistrement de ZENIT dans son portail développeur et ses identifiants Client ID / Client Secret. Aucun faux statut connecté ne sera affiché.</p></div></div>}
  <section className="integration-intro"><div><span className="eyebrow">UN CATALOGUE. UN CLIC.</span><h2>Tous vos outils.<br/><em>Un seul tableau de bord.</em></h2><p>Choisissez une application, lancez son parcours d’autorisation officiel et revenez dans ZENIT pour analyser les données auxquelles vous avez donné accès.</p></div><div className="integration-intro-badge"><ShieldCheck size={25}/><b>Autorisations sécurisées</b><small>Vous gardez le contrôle des accès accordés à chaque application.</small></div></section>
  <IntegrationCatalogue connectedProviders={connected}/>
  <section className="integration-note"><CircleHelp size={19}/><div><b>Connexion officielle, données réelles</b><p>Les intégrations OAuth nécessitent les applications développeur ZENIT auprès de chaque fournisseur. Chariow utilise actuellement son mécanisme de clé API sécurisée. WooCommerce utilise des clés REST et Shopify exige une application OAuth enregistrée. Les données privées ne sont synchronisées qu’après autorisation et mise en place du connecteur correspondant.</p></div></section>
 </main>;
}
