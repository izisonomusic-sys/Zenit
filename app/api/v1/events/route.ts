import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export const runtime="nodejs";
const cors=(origin:string|null,preflight=false):Record<string,string>=>({
 "Access-Control-Allow-Origin":preflight?"*":(origin||"null"),
 "Access-Control-Allow-Methods":"POST, OPTIONS",
 "Access-Control-Allow-Headers":"content-type, x-zenit-key",
 "Access-Control-Max-Age":"86400",
 "Vary":"Origin"
});
const json=(body:unknown,status:number,origin:string|null)=>NextResponse.json(body,{status,headers:origin?cors(origin):{}});
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:cors(null,true)});}
export async function POST(request:NextRequest){
 const origin=request.headers.get("origin"),key=request.headers.get("x-zenit-key")||"";
 const isPublic=key.startsWith("zn_pub_"),isSecret=key.startsWith("zn_sec_");
 if(!isPublic&&!isSecret)return json({error:"invalid_api_key"},401,origin);
 if(isSecret&&origin)return json({error:"server_key_not_allowed_in_browser"},403,origin);
 if(isPublic&&!origin)return NextResponse.json({error:"browser_key_requires_origin"},{status:403});
 let raw="";
 try{raw=await request.text();}catch{return json({error:"invalid_body"},400,origin);}
 if(Buffer.byteLength(raw,"utf8")>65536)return json({error:"payload_too_large"},413,origin);
 let body:any;try{body=JSON.parse(raw);}catch{return json({error:"invalid_json"},400,origin);}
 if(!Array.isArray(body?.events)||body.events.length<1||body.events.length>50)return json({error:"events_must_contain_1_to_50_items"},400,origin);
 const supabase=await createClient();
 const{data,error}=await supabase.rpc("zenit_ingest_events",{p_api_key:key,p_events:body.events,p_origin:origin});
 if(error){
  const message=error.message||"ingestion_failed";
  const status=/rate limit exceeded/i.test(message)?429:/origin is not authorized|requires an authorized origin|must not be used from a browser origin/i.test(message)?403:/invalid or revoked|invalid api key|invalid .*key format/i.test(message)?401:400;
  return json({error:status===403?"origin_not_allowed":status===401?"invalid_api_key":"invalid_event",message:status===400?message:undefined},status,origin);
 }
 return json(data,202,origin);
}
