"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function createSaaS(formData:FormData){
 const name=String(formData.get("name")||"").trim();const kind=String(formData.get("kind")||"saas");const url=String(formData.get("website_url")||"").trim();
 if(name.length<2||!["saas","website","web_app","mobile_app"].includes(kind))redirect("/dashboard/saas?error=invalid");
 if(url){try{const u=new URL(url);if(!["http:","https:"].includes(u.protocol))throw new Error();}catch{redirect("/dashboard/saas?error=url");}}
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:m}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=m?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const{error}=await supabase.from("tracked_projects").insert({workspace_id:workspaceId,name,platform:kind,website_url:url||null,created_by:user.id});
 if(error)redirect("/dashboard/saas?error=save");redirect("/dashboard/saas?created=1");
}