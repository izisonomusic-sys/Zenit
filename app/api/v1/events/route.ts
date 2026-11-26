import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
const corsHeaders=(origin:string|null,preflight=false):Record<string,string>=>({
 "Access-Control-Allow-Origin":preflight?"*":(origin||"null"),
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"content-type, x-zenit-key",
 "Access-Control-Max-Age":"86400",
 "Vary":"Origin"
});
export async function OPTIONS(){
 return new NextResponse(null,{status:204,headers:corsHeaders(null,true)});
}
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");
 const apiKey=request.headers.get("x-zenit-key")||"";
 const isPublic=apiKey.startsWith("zn_pub_");
 const isSecret=apiKey.startsWith("zn_sec_");
 if(!isPublic&&!isSecret)return NextResponse.json({error:"invalid_api_key"},{status:401});
 if(isSecret&&origin)return NextResponse.json({error:"server_key_not_allowed_in_browser"},{status:403});
 if(isPublic&&!origin)return NextResponse.json({error:"browser_key_requires_origin"},{status:403});
 let rawBody="";
 try{rawBody=await request.text();}catch{return NextResponse.json({error:"invalid_body"},{status:400});}
 if(Buffer.byteLength(rawBody,"utf8")>65536)return NextResponse.json({error:"payload_too_large"},{status:413});
 let body:any;
 try{body=JSON.parse(rawBody);}catch{return NextResponse.json({error:"invalid_json"},{status:400});}
 if(!Array.isArray(body?.events)||body.events.length<1||body.events.length>50)
  return NextResponse.json({error:"events_must_contain_1_to_50_items"},{status:400});
 const supabase=await createClient();
 const {data,error}=await supabase.rpc("zenit_ingest_events",{p_api_key:apiKey,p_events:body.events,p_origin:origin});
 if(error){
  const message=error.message||"ingestion_failed";
  const status=/rate limit exceeded/i.test(message)?429:/origin is not authorized|requires an authorized origin|must not be used from a browser origin/i.test(message)?403:/invalid or revoked|invalid api key|invalid .*key format/i.test(message)?401:400;
  return NextResponse.json({error:status===403?"origin_not_allowed":status===401?"invalid_api_key":"invalid_event",message:status===400?message:undefined},{status,headers:isPublic&&origin?corsHeaders(origin):{}});
 }
 return NextResponse.json(data,{status:202,headers:isPublic&&origin?corsHeaders(origin):{}});
}
