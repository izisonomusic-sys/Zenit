"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Check,Clipboard,KeyRound,Plus,ShieldCheck,Trash2,Code2,BookOpen} from "lucide-react";
import {createSdkKey,revokeSdkKey} from "../actions";

type ApiKey={id:string;label:string;key_prefix:string;last_used_at:string|null;revoked_at:string|null;created_at:string};
export default function SdkKeyPanel({projectId,keys,endpoint}:{projectId:string;keys:ApiKey[];endpoint:string}){
 const [label,setLabel]=useState("Clé du site web");
 const [createdKey,setCreatedKey]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [copied,setCopied]=useState(false);
 const router=useRouter();
 async function create(){
  setBusy(true);setError("");setCreatedKey("");
  const result=await createSdkKey(projectId,label);
  if(result.error)setError(result.error);else if(result.key){setCreatedKey(result.key);router.refresh();}
  setBusy(false);
 }
 async function revoke(id:string){
  if(!window.confirm("Révoquer cette clé ? Les événements envoyés avec cette clé seront immédiatement refusés."))return;
  setError("");const result=await revokeSdkKey(projectId,id);if(result.error)setError(result.error);else router.refresh();
 }
 async function copy(value:string){try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setError("Copie impossible sur cet appareil. Sélectionnez le texte manuellement.");}}
 const snippet=createdKey?'<script src="'+endpoint+'/sdk/v1.js" data-key="'+createdKey+'" defer></script>':'<script src="'+endpoint+'/sdk/v1.js" data-key="VOTRE_CLE_ZENIT" defer></script>';
 return <div className="module-list sdk-key-manager">
  <div className="workspace-list-head"><div><h2>Clés du SDK ZENIT</h2><p>Clés publiques de collecte. Elles identifient le projet, jamais un utilisateur.</p></div><span className="status-pill">{keys.filter(k=>!k.revoked_at).length} active(s)</span></div>
  <div className="sdk-create-row"><label>Nom de la clé<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={80} placeholder="Ex. Site de production"/></label><button className="button" onClick={create} disabled={busy}>{busy?"Création…":<><Plus size={15}/> Créer une clé</>}</button></div>
  {error&&<div className="form-message">{error}</div>}
  {createdKey&&<section className="sdk-new-key"><div><ShieldCheck size={18}/><b>Votre clé est prête. Copiez-la maintenant.</b></div><p>Pour votre sécurité, la clé complète ne sera plus affichée après avoir quitté cette page. Si vous la perdez, créez-en une nouvelle.</p><div className="sdk-key-value"><code>{createdKey}</code><button type="button" onClick={()=>copy(createdKey)} aria-label="Copier la clé">{copied?<Check size={16}/>:<Clipboard size={16}/>}</button></div><b><Code2 size={14}/> 1. Code à installer sur votre site</b><pre><code>{snippet}</code></pre><button className="button small" onClick={()=>copy(snippet)}><Clipboard size={14}/> Copier le code SDK</button><div className="sdk-install-guide"><b><BookOpen size={15}/> Où coller ce code ?</b><p>Dans le fichier principal chargé sur toutes les pages : app/layout.tsx (Next.js), index.html (site HTML) ou le composant principal. Si vous utilisez une IA pour créer votre SaaS, copiez le code et demandez-lui de faire l’installation.</p><button className="button small secondary" onClick={()=>copy("Intègre le suivi analytique ZENIT dans mon application. Installe ce script dans le layout global chargé sur toutes les pages : "+snippet+". Vérifie qu’il ne se charge qu’une seule fois. Après une inscription réussie, ajoute window.zenit.track(\"sign_up\",{method:\"email\"}); N’envoie jamais de mot de passe, données bancaires ou informations sensibles. Ne modifie pas mon authentification ni mes paiements.")}>Copier les instructions pour mon IA</button></div><div className="sdk-api-details"><b>2. API ZENIT pour votre backend</b><p>Endpoint : <code>{endpoint}/api/v1/events</code></p><p>Envoyez 1 à 50 événements avec l’en-tête <code>X-Zenit-Key</code>. Gardez la clé secrète dans les variables d’environnement du serveur, jamais dans le navigateur.</p><button className="button small secondary" onClick={()=>copy(endpoint+"/api/v1/events")}><Clipboard size={14}/> Copier l’URL API</button></div></section>}
  {keys.length?keys.map(k=><article className="workspace-row sdk-key-row" key={k.id}><div className="workspace-symbol"><KeyRound size={18}/></div><div><b>{k.label}</b><small><code>{k.key_prefix}••••••••</code> · Créée le {new Date(k.created_at).toLocaleDateString("fr-FR")} · {k.last_used_at?"Utilisée le "+new Date(k.last_used_at).toLocaleString("fr-FR"):"Jamais utilisée"}</small></div>{k.revoked_at?<span className="integration-pending">Révoquée</span>:<button className="icon-button" onClick={()=>revoke(k.id)} aria-label="Révoquer la clé"><Trash2 size={16}/></button>}</article>):<div className="module-empty"><KeyRound size={24}/><b>Aucune clé SDK</b><span>Créez une clé pour connecter votre site ou votre application.</span></div>}
  <p className="module-description">Ne placez jamais une clé secrète de paiement ou un mot de passe dans le SDK navigateur. Pour les abonnements, revenus et événements sensibles, envoyez les événements depuis votre serveur avec une clé dédiée.</p>
 </div>;
}
