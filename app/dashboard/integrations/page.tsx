import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, CircleHelp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import IntegrationCatalogue from "./catalogue";
export const dynamic="force-dynamic";
export default async function IntegrationsPage({searchParams}:{searchParams:Promise<{provider?:string;setup_required?:string;oauth?:string;oauth_error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const[{data:connections},params]=await Promise.all([supabase.from("integration_connections").select("id,provider,display_name,status,created_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}),searchParams]);
 const connected=(connections||[]).filter(s=>s.status==="connected").map(s=>String(s.provider));
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / APP DIRECTORY</div><h1>Applications.</h1><p>Recherchez vos outils et connectez-les à ZENIT depuis un catalogue unique.</p></div><span className="status-pill">{connected.length} autorisation(s) active(s)</span></header>
  {params.oauth==="success"&&<div className="success-banner">Autorisation {params.provider||""} enregistrée et jetons chiffrés dans Supabase Vault. La synchronisation des statistiques de cette plateforme reste à configurer.</div>}
  {params.oauth_error&&<div className="integration-note"><CircleHelp size={19}/><div><b>Connexion non terminée</b><p>{params.oauth_error==="not_configured"?"Les identifiants développeur de ce fournisseur ne sont pas encore configurés sur ZENIT.":params.oauth_error==="provider"?"Ce fournisseur n’est pas encore pris en charge.":params.oauth_error==="provider_not_configured"?"Les identifiants Client ID et Client Secret de ZENIT ne sont pas configurés pour ce fournisseur.":"L’autorisation a échoué. Vérifiez les paramètres de l’application fournisseur et réessayez."}</p></div></div>}
  {params.setup_required&&<div className="integration-note"><CircleHelp size={19}/><div><b>Autorisation de l’application à configurer</b><p>La connexion OAuth nécessite les identifiants développeur officiels de ZENIT pour chaque fournisseur. Une autorisation réussie enregistre les jetons chiffrés ; la synchronisation des données doit ensuite être activée pour chaque connecteur.</p></div></div>}
  <section className="integration-intro"><div><span className="eyebrow">UN CATALOGUE. UN CLIC.</span><h2>Tous vos outils.<br/><em>Un seul tableau de bord.</em></h2><p>Choisissez une application, lancez son parcours d’autorisation officiel et revenez dans ZENIT pour analyser les données auxquelles vous avez donné accès.</p></div><div className="integration-intro-badge"><ShieldCheck size={25}/><b>Autorisations sécurisées</b><small>Vous gardez le contrôle des accès accordés à chaque application.</small></div></section>
  <IntegrationCatalogue connectedProviders={connected}/>
  <section className="integration-note"><CircleHelp size={19}/><div><b>Activer les autorisations OAuth ZENIT</b><p>Pour activer les boutons Google, Meta, TikTok et LinkedIn, enregistrez une application développeur ZENIT chez chaque fournisseur puis ajoutez les identifiants dans Render → Environment.</p><p>Variables Google : <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>. Meta : <code>META_APP_ID</code>, <code>META_APP_SECRET</code>. TikTok : <code>TIKTOK_CLIENT_KEY</code>, <code>TIKTOK_CLIENT_SECRET</code>. LinkedIn : <code>LINKEDIN_CLIENT_ID</code>, <code>LINKEDIN_CLIENT_SECRET</code>.</p><p>URL de redirection à enregistrer chez chaque fournisseur : <code>https://zenit-unv7.onrender.com/api/integrations/oauth/callback</code>.</p></div></section>
  <section className="integration-note"><CircleHelp size={19}/><div><b>Connexion officielle, données réelles</b><p>Les intégrations OAuth nécessitent les applications développeur ZENIT auprès de chaque fournisseur. Chariow utilise actuellement son mécanisme de clé API sécurisée. WooCommerce utilise des clés REST et Shopify exige une application OAuth enregistrée. Les données privées ne sont synchronisées qu’après autorisation et mise en place du connecteur correspondant.</p></div></section>
 </main>;
}
