"use server";
import {redirect} from "next/navigation";import {createClient} from "@/lib/supabase/server";
export async function importStore(formData:FormData){
 const name=String(formData.get("name")||"").trim();const url=String(formData.get("url")||"").trim();const provider=String(formData.get("provider")||"other");
 if(name.length<2)redirect("/dashboard/boutiques?error=name");try{const u=new URL(url);if(!["http:","https:"].includes(u.protocol))throw new Error();}catch{redirect("/dashboard/boutiques?error=url");}
 if(!["shopify","woocommerce","other"].includes(provider))redirect("/dashboard/boutiques?error=provider");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const{data:m}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=m?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const{data:project,error}=await supabase.from("tracked_projects").insert({workspace_id:workspaceId,name,platform:"ecommerce",website_url:url,created_by:user.id}).select("id").single();if(error||!project)redirect("/dashboard/boutiques?error=save");
 const source=provider==="shopify"?"shopify":provider==="woocommerce"?"woocommerce":"other";
 const{error:sourceError}=await supabase.from("data_sources").insert({workspace_id:workspaceId,project_id:project.id,name,source,status:"pending",config:{provider,store_url:url,connection_state:"awaiting_authorization",note:"A store URL does not grant access to private orders or revenue. OAuth/API credentials are required."},created_by:user.id});
 if(sourceError)redirect("/dashboard/boutiques?error=source");redirect("/dashboard/boutiques?imported=1");
}