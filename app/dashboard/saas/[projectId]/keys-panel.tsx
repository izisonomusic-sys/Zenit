"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Check,Clipboard,KeyRound,Plus,ShieldCheck,Trash2,Code2,BookOpen,Server,Globe} from "lucide-react";
import {createApiKey,revokeSdkKey} from "../actions";

type ApiKey={id:string;label:string;key_prefix:string;key_type:"public"|"secret";last_used_at:string|null;revoked_at:string|null;created_at:string};
export default function SdkKeyPanel({projectId,keys,endpoint}:{projectId:string;keys:ApiKey[];endpoint:string}){
 const [label,setLabel]=useState("Clé du site web");
 const [createdKey,setCreatedKey]=useState("");
 const [createdKeyType,setCreatedKeyType]=useState<"public"|"secret">("public");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [copied,setCopied]=useState("");
 const router=useRouter();
 async function create(type:"public"|"secret"){
  setBusy(true);setError("");setCreatedKey("");
  const result=await createApiKey(projectId,label,type);
  if(result.error)setError(result.error);else if(result.key){setCreatedKey(result.key);setCreatedKeyType(type);router.refresh();}
  setBusy(false);
 }
 async function revoke(id:string){
  if(!window.confirm("Révoquer cette clé ? Les événements envoyés avec cette clé seront immédiatement refusés."))return;
  setError("");const result=await revokeSdkKey(projectId,id);if(result.error)setError(result.error);else router.refresh();
 }
 async function copy(value:string,id:string){try{await navigator.clipboard.writeText(value);setCopied(id);setTimeout(()=>setCopied(""),1800);}catch{setError("Copie impossible sur cet appareil. Sélectionnez le texte manuellement.");}}
 const snippet=createdKeyType==="public"&&createdKey?'<script src="'+endpoint+'/sdk/v1.js" data-key="'+createdKey+'" defer></script>':'<script src="'+endpoint+'/sdk/v1.js" data-key="VOTRE_CLE_PUBLIQUE_ZENIT" defer></script>';
 const edgeCode='const ZENIT_API_KEY = Deno.env.get("ZENIT_API_KEY");\nif (!ZENIT_API_KEY) throw new Error("ZENIT_API_KEY manquante");\nconst response = await fetch("'+endpoint+'/api/v1/events", {\n  method: "POST",\n  headers: { "Content-Type": "application/json", "X-Zenit-Key": ZENIT_API_KEY },\n  body: JSON.stringify({ events: [{\n    name: "purchase_completed",\n    timestamp: new Date().toISOString(),\n    user_id: user.id,\n    properties: { order_id: order.id, amount: order.total, currency: order.currency }\n  }] })\n});\nif (!response.ok) throw new Error("ZENIT API error: " + response.status);\nreturn await response.json();';
 const renderCode='const response = await fetch("'+endpoint+'/api/v1/events", {\n  method: "POST",\n  headers: { "Content-Type": "application/json", "X-Zenit-Key": process.env.ZENIT_API_KEY },\n  body: JSON.stringify({ events: [{ name: "subscription_created", properties: { plan: "pro" } }] })\n});';
 return <div className="module-list sdk-key-manager">
  <div className="workspace-list-head"><div><h2>Clés API & SDK ZENIT</h2><p>Une seule section pour gérer les clés publiques du navigateur et les clés secrètes du serveur.</p></div><span className="status-pill">{keys.filter(k=>!k.revoked_at).length} active(s)</span></div>
  <div className="sdk-create-row"><label>Nom de la clé<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={80} placeholder="Ex. Site de production"/></label></div>
  <div className="sdk-key-type-grid">
   <article><div><Globe size={18}/><b>Clé publique · SDK</b></div><p>Pour les pages vues et les événements non sensibles depuis le navigateur.</p><button className="button" onClick={()=>create("public")} disabled={busy}>{busy?"Création…":<><Plus size={15}/> Créer une clé publique</>}</button></article>
   <article><div><Server size={18}/><b>Clé secrète · API serveur</b></div><p>Pour les achats, abonnements et événements métier envoyés depuis votre backend.</p><button className="button secondary" onClick={()=>create("secret")} disabled={busy}>{busy?"Création…":<><Plus size={15}/> Créer une clé secrète</>}</button></article>
  </div>
  {error&&<div className="form-message">{error}</div>}
  {createdKey&&<section className="sdk-new-key"><div><ShieldCheck size={18}/><b>{createdKeyType==="public"?"Votre clé publique est prête.":"Votre clé secrète est prête. Copiez-la maintenant."}</b></div><p>La clé complète ne sera affichée qu'une seule fois. Si vous la perdez, révoquez-la et créez-en une nouvelle.</p><div className="sdk-key-value"><code>{createdKey}</code><button type="button" onClick={()=>copy(createdKey,"key")} aria-label="Copier la clé">{copied==="key"?<Check size={16}/>:<Clipboard size={16}/>}</button></div>
   {createdKeyType==="public"?<><b><Code2 size={14}/> Installer le SDK dans votre application</b><pre><code>{snippet}</code></pre><button className="button small" onClick={()=>copy(snippet,"sdk")}>{copied==="sdk"?<Check size={14}/>:<Clipboard size={14}/>} Copier le code SDK</button><div className="sdk-install-guide"><b><BookOpen size={15}/> Où coller ce code ?</b><p>Next.js : dans app/layout.tsx. HTML : avant la balise de fermeture body dans index.html. Autres plateformes : dans le code global du site ou la zone « code personnalisé ». Si votre SaaS a été créé avec une IA, demandez-lui de l'installer dans le layout global.</p><button className="button small secondary" onClick={()=>copy("Installe le SDK ZENIT dans le layout global de mon application. Ajoute exactement ce script une seule fois : "+snippet+". Après une inscription réussie, ajoute window.zenit.track('sign_up',{method:'email'}). N'envoie jamais de données personnelles sensibles, mots de passe ou informations bancaires.", "ai")}>{copied==="ai"?<Check size={14}/>:<Clipboard size={14}/>} Copier les instructions pour mon IA</button></div></>:<div className="sdk-install-guide"><b><ShieldCheck size={15}/> Ne jamais mettre cette clé dans le navigateur</b><p>Enregistrez-la comme variable secrète <code>ZENIT_API_KEY</code> dans Supabase Edge Functions → Secrets ou dans Render → Environment. Le code backend pourra ensuite appeler l'API ZENIT.</p></div>}
  </section>}
  <section className="sdk-api-details"><b>Guide API serveur — Supabase Edge Functions</b><p><b>1.</b> Dans le tableau de bord Supabase de votre propre application, ouvrez Edge Functions puis Secrets et ajoutez <code>ZENIT_API_KEY</code> avec votre clé secrète ZENIT.</p><p><b>2.</b> Dans la fonction qui confirme réellement une commande ou un abonnement, ajoutez cet appel après validation métier :</p><pre><code>{edgeCode}</code></pre><button className="button small secondary" onClick={()=>copy(edgeCode,"edge")}>{copied==="edge"?<Check size={14}/>:<Clipboard size={14}/>} Copier le code Edge Function</button><p><b>3.</b> Déployez la fonction. La clé reste côté serveur dans les Secrets Supabase, jamais dans le code public.</p><details><summary>Vous utilisez Render ou un autre hébergeur ?</summary><p>Ajoutez <code>ZENIT_API_KEY</code> dans les variables d'environnement du service, puis utilisez ce modèle dans votre backend Node.js :</p><pre><code>{renderCode}</code></pre><button className="button small secondary" onClick={()=>copy(renderCode,"render")}>{copied==="render"?<Check size={14}/>:<Clipboard size={14}/>} Copier l'exemple serveur</button></details><p>Endpoint : <code>{endpoint}/api/v1/events</code> · En-tête : <code>X-Zenit-Key</code> · 1 à 50 événements par requête.</p><button className="button small secondary" onClick={()=>copy(endpoint+"/api/v1/events","url")}>{copied==="url"?<Check size={14}/>:<Clipboard size={14}/>} Copier l'URL API</button></section>
  {keys.length?keys.map(k=><article className="workspace-row sdk-key-row" key={k.id}><div className="workspace-symbol">{k.key_type==="secret"?<Server size={18}/>:<Globe size={18}/>}</div><div><b>{k.label} · {k.key_type==="secret"?"Clé secrète API":"Clé publique SDK"}</b><small><code>{k.key_prefix}••••••••</code> · Créée le {new Date(k.created_at).toLocaleDateString("fr-FR")} · {k.last_used_at?"Utilisée le "+new Date(k.last_used_at).toLocaleString("fr-FR"):"Jamais utilisée"}</small></div>{k.revoked_at?<span className="integration-pending">Révoquée</span>:<button className="icon-button" onClick={()=>revoke(k.id)} aria-label="Révoquer la clé"><Trash2 size={16}/></button>}</article>):<div className="module-empty"><KeyRound size={24}/><b>Aucune clé API</b><span>Créez une clé publique pour le SDK ou une clé secrète pour votre serveur.</span></div>}
  <p className="module-description">La clé publique est limitée au domaine autorisé. La clé secrète est refusée lorsqu'une requête provient d'un navigateur. Vous pouvez révoquer chaque clé à tout moment.</p>
 </div>;
}
