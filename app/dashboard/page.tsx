import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowUpRight,Blocks,ChartNoAxesCombined,Globe2,Package,Store} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
const fmt=(n:number)=>new Intl.NumberFormat("fr-FR").format(n);
const platformLabel:Record<string,string>={website:"Site web",web_app:"Application web",mobile_app:"Application mobile",saas:"SaaS",ecommerce:"Boutique en ligne",other:"Produit numérique"};
const brand:Record<string,{name:string;logo:string}>={instagram:{name:"Instagram",logo:"https://cdn.simpleicons.org/instagram/E4405F"},facebook:{name:"Facebook",logo:"https://cdn.simpleicons.org/facebook/1877F2"},tiktok:{name:"TikTok",logo:"https://cdn.simpleicons.org/tiktok/000000"},youtube:{name:"YouTube",logo:"https://cdn.simpleicons.org/youtube/FF0033"},linkedin:{name:"LinkedIn",logo:"https://cdn.simpleicons.org/linkedin/0A66C2"},x:{name:"X",logo:"https://cdn.simpleicons.org/x/000000"},shopify:{name:"Shopify",logo:"https://cdn.simpleicons.org/shopify/7AB55C"},woocommerce:{name:"WooCommerce",logo:"https://cdn.simpleicons.org/woocommerce/96588A"},chariow:{name:"Chariow",logo:""},maketou:{name:"Maketou",logo:""}};
const socialIds=["instagram","facebook","tiktok","youtube","linkedin","x","meta_ads"];
const shopIds=["shopify","woocommerce","chariow","maketou"];
const digitalIds:string[]=[];
function Item({name,detail,logo,href,connected=true}:{name:string;detail:string;logo:string;href:string;connected?:boolean}){return <div className="ecosystem-item"><span className="ecosystem-logo">{logo?<img src={logo} alt=""/>:<b>{name.slice(0,1).toUpperCase()}</b>}</span><span className="ecosystem-item-copy"><b>{name}</b><small><span className={connected?"ecosystem-item-connected":"integration-pending"}>{connected?"Déjà connecté":"En attente de données"}</span> · {detail}</small></span><Link href={href} aria-label={"Voir "+name}><ArrowUpRight size={15}/></Link></div>}
export default async function DashboardPage(){
 const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await s.from("workspace_members").select("workspace_id,workspaces(name)").eq("user_id",user.id).limit(1);
 if(!memberships?.length){const full=String(user.user_metadata?.full_name||"").trim();const base=(full||String(user.email||"Mon espace").split("@")[0]).slice(0,60);const slug=base.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,42)+"-"+crypto.randomUUID().slice(0,6);const{error}=await s.from("workspaces").insert({name:base||"Mon espace",slug,created_by:user.id});if(error)return <main className="dashboard-main"><div className="form-message">Impossible d'initialiser votre espace. Rechargez la page ou contactez le support.</div></main>;redirect("/dashboard");}
 const workspaceId=memberships[0].workspace_id;const workspace=Array.isArray(memberships[0].workspaces)?memberships[0].workspaces[0]:memberships[0].workspaces;
 const since=new Date(Date.now()-30*86400000).toISOString();
 const [pr,sr,cr,er,ec]=await Promise.all([
  s.from("tracked_projects").select("id,name,platform,website_url,is_active").eq("workspace_id",workspaceId).order("created_at",{ascending:false}).limit(300),
  s.from("data_sources").select("id,name,source,status,project_id,last_synced_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}).limit(500),
  s.from("integration_connections").select("id,provider,display_name,status,project_id,last_synced_at").eq("workspace_id",workspaceId).order("created_at",{ascending:false}).limit(500),
  s.from("events").select("project_id,event_time").eq("workspace_id",workspaceId).gte("event_time",since).limit(5000),
  s.from("events").select("id",{count:"exact",head:true}).eq("workspace_id",workspaceId).gte("event_time",since)
 ]);
 const projects=pr.data||[],sources=sr.data||[],connections=cr.data||[],events=er.data||[];
 const projectIds=new Set<string>();for(const x of sources)if(x.project_id&&x.status==="connected")projectIds.add(x.project_id);for(const x of connections)if(x.project_id&&x.status==="connected")projectIds.add(x.project_id);for(const x of events)if(x.project_id)projectIds.add(x.project_id);
 const apps=projects.filter(p=>p.is_active&&["website","web_app","mobile_app","saas"].includes(p.platform));const connectedApps=apps.filter(p=>projectIds.has(p.id));
 const social=new Map<string,{name:string;detail:string;logo:string;href:string}>();const shops=new Map<string,{name:string;detail:string;logo:string;href:string}>();const digital=new Map<string,{name:string;detail:string;logo:string;href:string}>();
 const add=(map:Map<string,any>,key:string,name:string,detail:string,href:string)=>{const b=brand[key];map.set(key+":"+name,{name,detail,logo:b?.logo||"",href});};
 for(const x of sources.filter(v=>v.status==="connected")){const id=String(x.source);if(socialIds.includes(id))add(social,id,x.name||brand[id]?.name||id,"Réseau connecté","/dashboard/reseaux-sociaux");if(shopIds.includes(id))add(shops,id,x.name||brand[id].name,"Boutique connectée","/dashboard/boutiques");if(digitalIds.includes(id))add(digital,id,x.name||brand[id].name,"Plateforme numérique connectée","/dashboard/produits-numeriques");}
 for(const x of connections.filter(v=>v.status==="connected")){const id=String(x.provider);if(socialIds.includes(id))add(social,id,x.display_name||brand[id]?.name||id,"Compte autorisé","/dashboard/reseaux-sociaux");if(shopIds.includes(id))add(shops,id,x.display_name||brand[id].name,"Boutique autorisée","/dashboard/boutiques");if(digitalIds.includes(id))add(digital,id,x.display_name||brand[id].name,"Plateforme autorisée","/dashboard/produits-numeriques");}
 const ecommerce=projects.filter(p=>p.is_active&&p.platform==="ecommerce");for(const p of ecommerce)add(shops,"custom",p.name,"Boutique enregistrée","/dashboard/boutiques");
 const productRows=projects.filter(p=>p.is_active&&p.platform==="other");for(const p of productRows)add(digital,"product",p.name,"Produit numérique enregistré","/dashboard/produits-numeriques");
 const fmtDate=(v:string|null)=>v?new Date(v).toLocaleDateString("fr-FR"):"Connexion active";
 const sections=[
  {id:"apps",title:"Applications",desc:"Sites web, applications mobiles et logiciels",count:connectedApps.length,icon:Blocks,href:"/dashboard/saas",items:apps.map(p=>({name:p.name,detail:platformLabel[p.platform]||"Application",logo:p.website_url?(()=>{try{return "https://www.google.com/s2/favicons?domain="+new URL(p.website_url).hostname+"&sz=64"}catch{return ""}})():"",href:"/dashboard/saas/"+p.id,connected:projectIds.has(p.id)})),empty:"Importez une application pour suivre ses performances."},
  {id:"social",title:"Réseaux sociaux",desc:"Comptes sociaux et statistiques de contenu",count:social.size,icon:ChartNoAxesCombined,href:"/dashboard/reseaux-sociaux",items:[...social.values()],empty:"Connectez Instagram, Facebook, TikTok, YouTube et vos autres réseaux."},
  {id:"shops",title:"Boutiques",desc:"Vos boutiques e-commerce connectées",count:shops.size,icon:Store,href:"/dashboard/boutiques",items:[...shops.values()],empty:"Connectez une boutique pour centraliser ses commandes."},
  {id:"digital",title:"Produits digitaux",desc:"Formations, ebooks, fichiers et plateformes de vente",count:digital.size,icon:Package,href:"/dashboard/produits-numeriques",items:[...digital.values()],empty:"Vos plateformes de produits digitaux et produits suivis apparaîtront ici."}
 ];
 return <main className="dashboard-main">
  <header className="dashboard-header"><div><div className="eyebrow">ZENIT / CENTRE DE PILOTAGE</div><h1>Vue d’ensemble.</h1><p>Bienvenue{user.user_metadata?.full_name?", "+String(user.user_metadata.full_name).split(" ")[0]:""} · {workspace?.name||"Mon espace"}</p></div><span className="status-pill"><i/> Espace actif</span></header>
  <section className="ecosystem-welcome"><div><span className="eyebrow">VOTRE ÉCOSYSTÈME NUMÉRIQUE</span><h2>Toutes vos connexions.<br/><em>Un seul espace.</em></h2><p>Consultez les applications, réseaux, boutiques et produits numériques déjà reliés à ZENIT. Chaque élément ouvre sa fiche de suivi.</p></div><div className="ecosystem-total"><span>Connexions actives</span><b>{fmt(sections.reduce((n,x)=>n+x.count,0))}</b><small>{fmt(ec.count||0)} événements ces 30 derniers jours</small></div></section>
  <section className="ecosystem-grid">{sections.map(section=>{const Icon=section.icon;return <article className="ecosystem-card" key={section.id}><div className="ecosystem-card-head"><span className="ecosystem-card-icon"><Icon size={19}/></span><span className="ecosystem-count">{fmt(section.count)}</span></div><h2>{section.title}</h2><p>{section.desc}</p><div className="ecosystem-items">{section.items.length?section.items.map((item,i)=><Item key={section.id+":"+i} {...item}/>):<div className="ecosystem-empty">{section.empty}</div>}</div><Link className="ecosystem-more" href={section.href}>Voir plus <ArrowUpRight size={15}/></Link></article>})}</section>

  <footer className="dashboard-foot">ZENIT · CONNEXIONS ET DONNÉES DE VOTRE ESPACE · {workspace?.name||"ESPACE ACTIF"}</footer>
 </main>;
}