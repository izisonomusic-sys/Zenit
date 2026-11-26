"use server";
import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSaaS(formData:FormData){
 const name=String(formData.get("name")||"").trim();const kind=String(formData.get("kind")||"saas");const url=String(formData.get("website_url")||"").trim();
 if(name.length<2||!["saas","website","web_app","mobile_app"].includes(kind))redirect("/dashboard/saas?error=invalid");
 if(url){try{const u=new URL(url);if(!["http:","https:"].includes(u.protocol))throw new Error();}catch{redirect("/dashboard/saas?error=url");}}
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:m}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=m?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const{error}=await supabase.from("tracked_projects").insert({workspace_id:workspaceId,name,platform:kind,website_url:url||null,created_by:user.id});
 if(error)redirect("/dashboard/saas?error=save");redirect("/dashboard/saas?created=1");
}

export async function createApiKey(projectId:string,label:string,keyType:"public"|"secret"="public"){
 const cleanLabel=String(label||"").trim();
 if(cleanLabel.length<2||cleanLabel.length>80)return {error:"Donnez un nom de 2 à 80 caractères à cette clé."};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:"Votre session a expiré. Reconnectez-vous."};
 const {data:project}=await supabase.from("tracked_projects").select("id,workspace_id").eq("id",projectId).maybeSingle();
 if(!project)return {error:"Ce projet n'appartient pas à votre espace."};
 const {data:membership}=await supabase.from("workspace_members").select("workspace_id,role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).in("role",["owner","admin"]).maybeSingle();
 if(!membership)return {error:"Seul le propriétaire ou un administrateur peut créer une clé API."};
 const rawKey=(keyType==="public"?"zn_pub_":"zn_sec_")+randomBytes(32).toString("base64url");
 const keyPrefix=rawKey.slice(0,16);
 const keyHash=createHash("sha256").update(rawKey).digest("hex");
 const {error}=await supabase.rpc("zenit_create_api_key",{p_project_id:projectId,p_label:cleanLabel,p_key_type:keyType,p_key_prefix:keyPrefix,p_key_hash:keyHash});
 if(error)return {error:"La clé n'a pas pu être créée. Vérifiez vos droits et réessayez."};
 return {key:rawKey,keyType};
}

export async function revokeSdkKey(projectId:string,keyId:string){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {error:"Votre session a expiré."};
 const {data:project}=await supabase.from("tracked_projects").select("id,workspace_id").eq("id",projectId).maybeSingle();
 if(!project)return {error:"Projet introuvable."};
 const {data:membership}=await supabase.from("workspace_members").select("workspace_id,role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).in("role",["owner","admin"]).maybeSingle();
 if(!membership)return {error:"Droit administrateur requis."};
 const {error}=await supabase.rpc("zenit_revoke_sdk_key",{p_key_id:keyId});
 if(error)return {error:"Impossible de révoquer cette clé."};
 return {success:true};
}

export async function updateSaaSDomain(projectId:string,formData:FormData){
 const raw=String(formData.get("website_url")||"").trim();
 let origin="";
 try{const parsed=new URL(raw);if(parsed.protocol!=="https:"||parsed.username||parsed.password)throw new Error();origin=parsed.origin;}catch{redirect("/dashboard/saas/"+projectId+"?domain_error=invalid");}
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:project}=await supabase.from("tracked_projects").select("id,workspace_id").eq("id",projectId).maybeSingle();
 if(!project)redirect("/dashboard/saas?error=project");
 const {data:membership}=await supabase.from("workspace_members").select("role").eq("workspace_id",project.workspace_id).eq("user_id",user.id).in("role",["owner","admin"]).maybeSingle();
 if(!membership)redirect("/dashboard/saas/"+projectId+"?domain_error=permission");
 const {error}=await supabase.from("tracked_projects").update({website_url:origin}).eq("id",projectId).eq("workspace_id",project.workspace_id);
 if(error)redirect("/dashboard/saas/"+projectId+"?domain_error=save");
 redirect("/dashboard/saas/"+projectId+"?domain_updated=1");
}
