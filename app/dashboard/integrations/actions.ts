"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function addDataSource(formData:FormData){
 const provider=String(formData.get("provider")||"");
 const displayName=String(formData.get("display_name")||"").trim();
 const allowed=["sdk","rest_api","webhook","ga4","shopify","woocommerce","meta_ads","youtube","other"];
 if(!allowed.includes(provider)||displayName.length<2) redirect("/dashboard/integrations?error=invalid");
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect("/login");
 const {data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);
 const workspaceId=memberships?.[0]?.workspace_id;
 if(!workspaceId) redirect("/dashboard");
 const {error}=await supabase.from("data_sources").insert({workspace_id:workspaceId,name:displayName,source:provider,status:"pending",created_by:user.id});
 if(error) redirect("/dashboard/integrations?error=create");
 redirect("/dashboard/integrations?added=1");
}
