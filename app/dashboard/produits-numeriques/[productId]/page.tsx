import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,ArrowUpRight,Package,CalendarDays,ExternalLink} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function DigitalProductDetail({params}:{params:Promise<{productId:string}>}){
 const{productId}=await params;const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:product}=await supabase.from("tracked_projects").select("id,name,website_url,created_at,workspace_id,platform,is_active").eq("id",productId).eq("platform","other").maybeSingle();if(!product)notFound();
 const{data:membership}=await supabase.from("workspace_members").select("workspace_id").eq("workspace_id",product.workspace_id).eq("user_id",user.id).maybeSingle();if(!membership)notFound();
 return <main className="dashboard-main module-main"><Link href="/dashboard/produits-numeriques" className="module-back"><ArrowLeft size={14}/> Produits digitaux</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / FICHE PRODUIT NUMÉRIQUE</div><h1>{product.name}.</h1><p>Informations de ce produit enregistré dans votre espace.</p></div><span className="status-pill">Produit enregistré</span></header>
  <section className="module-form-card"><div className="workspace-row"><div className="workspace-symbol"><Package size={20}/></div><div><b>{product.name}</b><small>Produit numérique · {product.is_active?"Actif":"Inactif"}</small></div><span className="workspace-ready">Enregistré</span></div>
   <div className="product-detail-meta"><div><CalendarDays size={15}/><span>Ajouté le {new Date(product.created_at).toLocaleDateString("fr-FR")}</span></div><div><ExternalLink size={15}/><span>{product.website_url||"Aucun lien de vente renseigné"}</span></div></div>
   {product.website_url&&<a className="button small" href={product.website_url} target="_blank" rel="noreferrer">Ouvrir la page de vente <ArrowUpRight size={14}/></a>}
  </section>
 </main>;
}