"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Check, LockKeyhole, PlugZap } from "lucide-react";

type App = { id:string; name:string; category:string; description:string; logo:string; color:string; method:string; href?:string; connected:boolean; available:boolean };
const apps:App[] = [
 {id:"shopify",name:"Shopify",category:"E-commerce",description:"Commandes, produits, remboursements et chiffre d’affaires.",logo:"https://cdn.simpleicons.org/shopify/95BF47",color:"#95bf47",method:"OAuth Shopify",href:"/dashboard/boutiques?provider=shopify",connected:false,available:false},
 {id:"woocommerce",name:"WooCommerce",category:"E-commerce",description:"Commandes, clients, produits et revenus de votre boutique.",logo:"https://cdn.simpleicons.org/woocommerce/96588A",color:"#96588a",method:"Autorisation REST",href:"/dashboard/boutiques?provider=woocommerce",connected:false,available:false},
 {id:"chariow",name:"Chariow",category:"Produits numériques",description:"Ventes, produits, paiements et règlements.",logo:"https://cdn.simpleicons.org/chariow/C8F169",color:"#c8f169",method:"Clé API sécurisée",href:"/dashboard/produits-numeriques",connected:false,available:true},
 {id:"marketo",name:"Adobe Marketo",category:"Marketing",description:"Campagnes, leads et engagement marketing.",logo:"https://cdn.simpleicons.org/marketo/5B9BD5",color:"#5b9bd5",method:"OAuth / API selon l’édition",connected:false,available:false},
 {id:"instagram",name:"Instagram",category:"Réseaux sociaux",description:"Reels, vues, portée et interactions des comptes éligibles.",logo:"https://cdn.simpleicons.org/instagram/E4405F",color:"#e4405f",method:"Meta OAuth",connected:false,available:false},
 {id:"facebook",name:"Facebook",category:"Réseaux sociaux",description:"Pages, publications, portée et engagement.",logo:"https://cdn.simpleicons.org/facebook/1877F2",color:"#1877f2",method:"Meta OAuth",connected:false,available:false},
 {id:"tiktok",name:"TikTok",category:"Réseaux sociaux",description:"Vues vidéo, likes, commentaires et partages autorisés.",logo:"https://cdn.simpleicons.org/tiktok/FFFFFF",color:"#ffffff",method:"TikTok OAuth",connected:false,available:false},
 {id:"youtube",name:"YouTube",category:"Réseaux sociaux",description:"Vues, abonnés et statistiques de chaîne.",logo:"https://cdn.simpleicons.org/youtube/FF0033",color:"#ff0033",method:"Google OAuth",connected:false,available:false},
 {id:"linkedin",name:"LinkedIn",category:"Réseaux sociaux",description:"Pages et performances des publications éligibles.",logo:"https://cdn.simpleicons.org/linkedin/0A66C2",color:"#0a66c2",method:"LinkedIn OAuth",connected:false,available:false},
 {id:"x",name:"X",category:"Réseaux sociaux",description:"Impressions et interactions selon les droits API.",logo:"https://cdn.simpleicons.org/x/FFFFFF",color:"#ffffff",method:"OAuth 2.0",connected:false,available:false},
 {id:"ga4",name:"Google Analytics 4",category:"Analytics",description:"Trafic, sessions, événements et conversions.",logo:"https://cdn.simpleicons.org/googleanalytics/E9AB27",color:"#e9ab27",method:"Google OAuth",connected:false,available:false},
 {id:"meta_ads",name:"Meta Ads",category:"Publicité",description:"Dépenses, campagnes, clics et résultats publicitaires.",logo:"https://cdn.simpleicons.org/meta/1877F2",color:"#1877f2",method:"Meta OAuth",connected:false,available:false},
 {id:"google_ads",name:"Google Ads",category:"Publicité",description:"Campagnes, coûts et conversions publicitaires.",logo:"https://cdn.simpleicons.org/googleads/34A853",color:"#34a853",method:"Google OAuth",connected:false,available:false},
 {id:"zenit_sdk",name:"ZENIT SDK",category:"SaaS & développeurs",description:"Suivi des inscriptions, événements et abonnements de votre SaaS.",logo:"",color:"#c8f169",method:"Installation du SDK",connected:false,available:true},
];
const categories=["Toutes","E-commerce","Produits numériques","Réseaux sociaux","Marketing","Analytics","Publicité","SaaS & développeurs"];
export default function IntegrationCatalogue({connectedProviders=[]}:{connectedProviders?:string[]}){
 const [query,setQuery]=useState("");const [category,setCategory]=useState("Toutes");
 const connected=new Set(connectedProviders);
 const filtered=useMemo(()=>apps.filter(a=>(category==="Toutes"||a.category===category)&&((a.name+" "+a.description+" "+a.category).toLowerCase().includes(query.toLowerCase()))),[query,category]);
 return <section className="app-catalogue">
  <div className="catalogue-toolbar"><label className="catalogue-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une application…"/></label><span>{filtered.length} applications</span></div>
  <div className="catalogue-categories">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?"active":""}>{c}</button>)}</div>
  <div className="catalogue-grid">{filtered.map(app=>{const isConnected=connected.has(app.id);return <article className="catalogue-card" key={app.id}>
   <div className="catalogue-card-top"><span className="catalogue-logo" style={{background:app.color+"18",borderColor:app.color+"55"}}>{app.logo?<img src={app.logo} alt={app.name}/>:"Z"}</span><span className={isConnected?"catalogue-status connected":"catalogue-status"}>{isConnected?<><Check size={12}/> Connectée</>:"Disponible"}</span></div>
   <div className="catalogue-card-copy"><small>{app.category}</small><h3>{app.name}</h3><p>{app.description}</p></div>
   <div className="catalogue-card-bottom"><span><LockKeyhole size={12}/>{app.method}</span>{isConnected?<button disabled className="catalogue-connect connected-button">Connectée</button>:app.href?<Link className="catalogue-connect" href={app.href}>Installer <ArrowUpRight size={14}/></Link>:<button className="catalogue-connect" onClick={()=>window.location.href="/dashboard/integrations?provider="+app.id+"&setup_required=1"}>Installer <ArrowUpRight size={14}/></button>}</div>
  </article>})}</div>
  {!filtered.length&&<div className="catalogue-empty"><PlugZap size={24}/><b>Aucune application trouvée</b><span>Essayez un autre nom ou une autre catégorie.</span></div>}
 </section>;
}
