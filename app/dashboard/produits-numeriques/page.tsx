import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,BookOpen,Download,Package,ShoppingBag,CheckCircle2,PlugZap} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {addDigitalProduct} from "./actions";
export const dynamic="force-dynamic";
export default async function DigitalProductsPage({searchParams}:{searchParams:Promise<{added?:string;error?:string}>}){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1);const membership=memberships?.[0];if(!membership)redirect("/dashboard");
 const [{data:productRows},params]=await Promise.all([
  supabase.from("tracked_projects").select("id,name,website_url,created_at,is_active").eq("workspace_id",membership.workspace_id).eq("platform","other").order("created_at",{ascending:false}),
  searchParams
 ]);
 const paramsValue=await params;const products=productRows||[];
 return <main className="dashboard-main module-main">
  <Link href="/dashboard" className="module-back">← Tableau de bord</Link>
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / ÉCONOMIE NUMÉRIQUE</div><h1>Produits digitaux.</h1><p>Formations, ebooks, fichiers, licences et autres produits numériques dans un seul espace.</p></div><span className="status-pill">{products.length} produit(s)</span></header>
  {paramsValue.added&&<div className="success-banner">Produit ajouté à votre espace.</div>}
  {paramsValue.error&&<div className="form-message">Impossible d’ajouter le produit. Vérifiez les informations et vos droits.</div>}
  <section className="digital-platform-grid"><article className="digital-platform-card"><div className="digital-platform-head"><span className="digital-platform-logo chariow">C</span><span className="integration-pending">À connecter</span></div><h3>Chariow</h3><p>Ventes, produits numériques, commandes et chiffre d’affaires.</p><small>Connexion prévue par autorisation MCP/OAuth sécurisée. Aucune clé à copier par le client.</small><Link className="button small" href="/dashboard/integrations?provider=chariow">Connecter Chariow <ArrowUpRight size={14}/></Link></article><article className="digital-platform-card"><div className="digital-platform-head"><span className="digital-platform-logo maketou">M</span><span className="integration-pending">À connecter</span></div><h3>Maketou</h3><p>Catalogue, ventes et performances de votre boutique de produits digitaux.</p><small>Le parcours d’autorisation marchand doit être confirmé avant d’activer la connexion.</small><Link className="button small" href="/dashboard/integrations?provider=maketou">Connecter Maketou <ArrowUpRight size={14}/></Link></article></section>
  <section className="digital-types"><div><BookOpen/><b>Formations & ebooks</b><small>Cours, guides et livres numériques</small></div><div><Download/><b>Fichiers & licences</b><small>Documents, templates et logiciels</small></div><div><ShoppingBag/><b>Produits vendus en ligne</b><small>Liens de vente et plateformes marchandes</small></div></section>
  <section className="module-form-card"><div className="eyebrow">AJOUTER UN PRODUIT</div><h2>Enregistrer un produit numérique</h2><p className="module-description">Ajoutez un ebook, une formation, un fichier, un template ou un logiciel à votre catalogue ZENIT.</p><form action={addDigitalProduct} className="module-form"><label>Nom du produit<input name="name" required minLength={2} placeholder="Ex. Formation marketing digital"/></label><label>Lien de la page de vente<input name="url" type="url" required placeholder="https://ma-boutique.com/mon-produit"/></label><button className="button">Ajouter le produit <ArrowUpRight size={15}/></button></form></section>
  <section className="module-list"><div className="workspace-list-head"><div><h2>Produits de votre espace</h2><p>{products.length} produit(s) numérique(s) enregistré(s).</p></div></div>{products.length?products.map(product=><article className="workspace-row" key={product.id}><div className="workspace-symbol"><Package size={19}/></div><div><b>{product.name}</b><small>{product.website_url||"Lien non renseigné"}</small></div><span className="workspace-ready">Enregistré</span><Link className="button small" href={"/dashboard/produits-numeriques/"+product.id}>Voir plus <ArrowUpRight size={14}/></Link></article>):<div className="module-empty"><Package size={25}/><b>Aucun produit enregistré</b><span>Ajoutez votre premier ebook, cours, fichier ou logiciel numérique.</span></div>}</section>
 </main>;
}