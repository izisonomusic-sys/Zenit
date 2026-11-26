import {NextRequest,NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {processIntegrationConnection} from "@/lib/integrations/provider-sync";
export const runtime="nodejs";
export const maxDuration=120;
export async function POST(request:NextRequest){
 const match=(request.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i);
 if(!match)return NextResponse.json({error:"unauthorized"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:"supabase_not_configured"},{status:503});
 const client=createSupabaseClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{"x-zenit-cron-secret":match[1]}}});
 const{data:due,error}=await client.rpc("zenit_claim_due_oauth_syncs");
 if(error)return NextResponse.json({error:"sync_queue_unavailable",detail:error.message},{status:500});
 let completed=0,failed=0,written=0;
 for(const c of due||[]){try{written+=await processIntegrationConnection(client,c);completed++;}catch(e){failed++;await client.rpc("zenit_fail_integration_sync",{p_connection_id:c.connection_id,p_error:e instanceof Error?e.message:"Unknown integration error"});console.error("[ZENIT integration sync]",c.provider,e);}}
 return NextResponse.json({ok:true,checked:(due||[]).length,completed,failed,metrics_written:written});
}
