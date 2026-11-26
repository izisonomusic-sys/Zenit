"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const catalog:Record<string,{source:string;label:string;category:string}> = {
 shopify:{source:"shopify",label:"Shopify",category:"commerce"},woocommerce:{source:"woocommerce",label:"WooCommerce",category:"commerce"},
 ga4:{source:"ga4",label:"Google Analytics 4",category:"analytics"},meta_ads:{source:"meta_ads",label:"Meta Ads",category:"marketing"},
 youtube:{source:"youtube",label:"YouTube",category:"social"},instagram:{source:"other",label:"Instagram",category:"social"},facebook:{source:"other",label:"Facebook",category:"social"},
 tiktok:{source:"other",label:"TikTok",category:"social"},linkedin:{source:"other",label:"LinkedIn",category:"social"},x:{source:"other",label:"X",category:"social"},
 google_ads:{source:"other",label:"Google Ads",category:"marketing"},stripe:{source:"other",label:"Stripe",category:"commerce"},
 sdk:{source:"sdk",label:"ZENIT JavaScript SDK",category:"developer"},rest_api:{source:"rest_api",label:"API REST",category:"developer"},webhook:{source:"webhook",label:"Webhook",category:"developer"}
};
export async function addDataSource(formData:FormData){
 const provider=String(formData.get("provider")||"");const entry=catalog[provider];if(!entry)redirect("/dashboard/integrations?error=provider");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id").eq("user_id",user.id).limit(1);const workspaceId=memberships?.[0]?.workspace_id;if(!workspaceId)redirect("/dashboard");
 const {data:existing}=await supabase.from("data_sources").select("id").eq("workspace_id",workspaceId).eq("name",entry.label).limit(1);
 if(existing?.length)redirect("/dashboard/integrations?exists=1");
 const {error}=await supabase.from("data_sources").insert({workspace_id:workspaceId,name:entry.label,source:entry.source,status:"pending",config:{provider,category:entry.category,connection_state:"awaiting_authorization",note:"OAuth/API credentials and sync worker required"},created_by:user.id});
 if(error)redirect("/dashboard/integrations?error=create");
 redirect("/dashboard/integrations?added="+encodeURIComponent(entry.label));
}