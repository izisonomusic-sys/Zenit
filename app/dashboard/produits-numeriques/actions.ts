"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addDigitalProduct(formData:FormData){
 const name=String(formData.get("name")||"").trim();const url=String(formData.get("url")||"").trim();
 if(name.length<2)redirect("/dashboard/produits-numeriques?error=name");
 try{const parsed=new URL(url);if(!["http:","https:"].includes(parsed.protocol))throw new Error();}catch{redirect("/dashboard/produits-numeriques?error=url");}
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1);const membership=memberships?.[0];if(!membership)redirect("/dashboard");
 if(!["owner","admin"].includes(membership.role))redirect("/dashboard/produits-numeriques?error=permission");
 const{data:project,error}=await supabase.from("tracked_projects").insert({workspace_id:membership.workspace_id,name,platform:"other",website_url:url,created_by:user.id}).select("id").single();
 if(error||!project)redirect("/dashboard/produits-numeriques?error=save");
 const{error:sourceError}=await supabase.from("data_sources").insert({workspace_id:membership.workspace_id,project_id:project.id,name,source:"other",status:"pending",config:{provider:"digital_product",product_url:url,connection_state:"awaiting_events"},created_by:user.id});
 if(sourceError)redirect("/dashboard/produits-numeriques?error=source");
 redirect("/dashboard/produits-numeriques?added=1");
}

export async function connectChariow(formData:FormData){
 const apiKey=String(formData.get("api_key")||"").trim();if(apiKey.length<16)redirect("/dashboard/produits-numeriques?chariow_error=key");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1);const membership=memberships?.[0];if(!membership)redirect("/dashboard");
 if(!["owner","admin"].includes(membership.role))redirect("/dashboard/produits-numeriques?chariow_error=permission");
 let response:Response;try{response=await fetch("https://api.chariow.com/v1/store",{headers:{Authorization:"Bearer "+apiKey,Accept:"application/json"},cache:"no-store"});}catch{redirect("/dashboard/produits-numeriques?chariow_error=network");}
 if(!response.ok)redirect("/dashboard/produits-numeriques?chariow_error=invalid_key");
 let body:any;try{body=await response.json();}catch{redirect("/dashboard/produits-numeriques?chariow_error=response");}
 const store=body?.data?.store??body?.data??body?.store??body;if(!store?.id)redirect("/dashboard/produits-numeriques?chariow_error=store");
 const{error}=await supabase.rpc("zenit_save_chariow_connection",{p_workspace_id:membership.workspace_id,p_store_id:String(store.id),p_store_name:String(store.name||"Ma boutique Chariow"),p_store_url:String(store.url||""),p_api_key:apiKey});
 if(error)redirect("/dashboard/produits-numeriques?chariow_error=save");
 redirect("/dashboard/produits-numeriques?chariow_connected=1");
}

export async function syncChariow(formData:FormData){
 const connectionId=String(formData.get("connection_id")||"");if(!connectionId)redirect("/dashboard/boutiques?sync_error=connection");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{data:memberships}=await supabase.from("workspace_members").select("workspace_id,role").eq("user_id",user.id).limit(1);const membership=memberships?.[0];if(!membership)redirect("/dashboard");
 if(!["owner","admin"].includes(membership.role))redirect("/dashboard/boutiques?sync_error=permission");
 const{data:apiKey,error:keyError}=await supabase.rpc("zenit_get_chariow_secret",{p_connection_id:connectionId});if(keyError||!apiKey)redirect("/dashboard/boutiques?sync_error=secret");
 let cursor:string|null=null;let imported=0;let pages=0;
 try{
  do{
   const url=new URL("https://api.chariow.com/v1/sales");url.searchParams.set("per_page","100");if(cursor)url.searchParams.set("cursor",cursor);
   const response=await fetch(url.toString(),{headers:{Authorization:"Bearer "+apiKey,Accept:"application/json"},cache:"no-store"});if(!response.ok)throw new Error("Chariow API error");
   const result:any=await response.json();const data=result?.data;const sales:any[]=Array.isArray(data)?data:Array.isArray(data?.data)?data.data:[];if(!sales.length)break;
   const rows=sales.filter(sale=>sale?.id).map(sale=>({
    workspace_id:membership.workspace_id,connection_id:connectionId,external_sale_id:String(sale.id),sale_status:String(sale.status||"unknown"),
    payment_status:sale.payment?.status??null,amount:sale.amount?.value??sale.payment?.amount?.value??null,original_amount:sale.original_amount?.value??null,
    settlement_amount:sale.settlement?.amount?.value??null,fee_amount:sale.settlement?.fee?.value??sale.settlement?.service_fee?.value??sale.settlement?.payment_fee?.value??null,
    currency:sale.amount?.currency??sale.payment?.amount?.currency??sale.original_amount?.currency??null,channel:sale.channel?.value??sale.channel??null,
    product_id:sale.product?.id??null,product_name:sale.product?.name??null,product_type:sale.product?.type??null,
    external_customer_id:sale.customer?.id??null,external_created_at:sale.created_at??null,external_completed_at:sale.completed_at??null,
    payload:{payment_method:sale.payment?.method?.name??null,payment_gateway:sale.payment?.gateway??null,discount_code:sale.discount?.code??null,reconciled:sale.is_reconciled??null}
   }));
   if(rows.length){const{error}=await supabase.from("commerce_sales").upsert(rows,{onConflict:"connection_id,external_sale_id"});if(error)throw new Error("Sales save failed");imported+=rows.length;}
   pages+=1;const pagination=result?.pagination??data?.pagination;cursor=pagination?.next_cursor??null;
  }while(cursor&&pages<20);
 }catch{redirect("/dashboard/boutiques?sync_error=failed");}
 const syncedAt=new Date().toISOString();
 await supabase.from("integration_connections").update({last_synced_at:syncedAt}).eq("id",connectionId);
 await supabase.from("data_sources").update({last_synced_at:syncedAt,status:"connected"}).eq("workspace_id",membership.workspace_id).contains("config",{connection_id:connectionId});
 redirect("/dashboard/boutiques?synced="+imported);
}