import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Store, Package, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const modules:Record<string,{title:string;eyebrow:string;description:string;icon:any;items:string[]}> = {
 formations:{title:"Formations",eyebrow:"ESPACE FORMATIONS",description:"Un espace dédié à vos contenus de formation, parcours pédagogiques et résultats d’apprentissage.",icon:BookOpen,items:["Catalogue de formations","Parcours et inscriptions","Suivi de progression"]},
 boutiques:{title:"Boutiques",eyebrow:"ESPACE COMMERCE",description:"Centralisez les performances de vos boutiques en ligne et suivez les indicateurs de votre activité commerciale.",icon:Store,items:["Boutiques connectées","Commandes et conversions","Performance des ventes"]},
 "produits-numeriques":{title:"Produits numériques",eyebrow:"ESPACE PRODUITS",description:"Préparez le suivi de vos produits digitaux, téléchargements, ventes et engagement des clients.",icon:Package,items:["Catalogue de produits digitaux","Téléchargements et accès","Ventes et engagement"]},
 settings:{title:"Paramètres",eyebrow:"CONFIGURATION",description:"Les paramètres du compte, de l’espace de travail et des membres seront regroupés ici.",icon:Settings2,items:["Profil et préférences","Membres et rôles","Sécurité du compte"]}
};
export default async function WorkspaceModulePage({params}:{params:Promise<{module:string}>}){
 const {module}=await params;const item=modules[module];if(!item)redirect("/dashboard");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const Icon=item.icon;
 return <main className="dashboard-main module-main"><Link href="/dashboard" className="module-back"><ArrowLeft size={15}/> Tableau de bord</Link><header className="dashboard-header"><div><div className="eyebrow">ZENIT / {item.eyebrow}</div><h1>{item.title}.</h1><p>{item.description}</p></div><span className="status-pill">Module en préparation</span></header><section className="module-form-card module-coming"><div className="workspace-symbol"><Icon size={22}/></div><h2>Votre espace {item.title.toLowerCase()} se prépare.</h2><p>La rubrique est ajoutée à votre navigation. Nous construisons les fonctions de gestion et les connexions nécessaires avant de l’activer.</p><div className="module-roadmap">{item.items.map((label,i)=><div key={label}><span>0{i+1}</span><b>{label}</b><small>À construire</small></div>)}</div><Link className="button" href="/dashboard">Retourner au tableau de bord ↗</Link></section></main>;
}
