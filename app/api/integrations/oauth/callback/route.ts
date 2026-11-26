import {NextRequest,NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {createClient} from "@/lib/supabase/server";

const label:Record<string,string>={ga4:"Google Analytics 4",youtube:"YouTube",instagram:"Instagram",facebook:"Facebook",meta_ads:"Meta Ads",tiktok:"TikTok",linkedin:"LinkedIn"};
function credentials(provider:string){return provider==="ga4"||provider==="youtube"?{id:process.env.GOOGLE_CLIENT_ID,secret:process.env.GOOGLE_CLIENT_SECRET}:provider==="instagram"||provider==="facebook"||provider==="meta_ads"?{id:process.env.META_APP_ID,secret:process.env.META_APP_SECRET}:provider==="tiktok"?{id:process.env.TIKTOK_CLIENT_KEY,secret:process.env.TIKTOK_CLIENT_SECRET}:{id:process.env.LINKEDIN_CLIENT_ID,secret:process.env.LINKEDIN_CLIENT_SECRET};}
async function readJson(response:Response){const data=await response.json().catch(()=>({}));if(!response.ok||data.error||data.error_description)throw new Error(String(data.error_description||data.error?.message||data.error||"OAuth token exchange failed"));return data;}
export async function GET(request:NextRequest){
 const providerState=request.nextUrl.searchParams.get("state")||"";
 const provider=providerState.split(".")[0]||"";
 const code=request.nextUrl.searchParams.get("code");
 const providerError=request.nextUrl.searchParams.get("error");
 const fail=(reason:string)=>NextResponse.redirect(new URL("/dashboard/integrations?oauth_error="+encodeURIComponent(reason),request.url));
 if(!label[provider])return fail("invalid_state");
 if(providerError||!code)return fail(providerError||"missing_code");
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.redirect(new URL("/login",request.url));
 const stateHash=createHash("sha256").update(providerState).digest("hex");
 const {data:stateRows,error:stateError}=await supabase.rpc("zenit_consume_oauth_state",{p_state_hash:stateHash,p_provider:provider});
 const state=Array.isArray(stateRows)?stateRows[0]:stateRows;
 if(stateError||!state?.workspace_id||state.user_id!==user.id)return fail("invalid_or_expired_state");
 const creds=credentials(provider);
 if(!creds.id||!creds.secret)return fail("provider_not_configured");
 const redirectUri=new URL("/api/integrations/oauth/callback",request.url).toString();
 let tokenData:any;
 if(provider==="ga4"||provider==="youtube"||provider==="linkedin"){
  const tokenUrl=provider==="ga4"||provider==="youtube"?"https://oauth2.googleapis.com/token":"https://www.linkedin.com/oauth/v2/accessToken";
  const body=new URLSearchParams({grant_type:"authorization_code",code,client_id:creds.id,client_secret:creds.secret,redirect_uri:redirectUri});
  tokenData=await readJson(await fetch(tokenUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}));
 }else if(provider==="tiktok"){
  const body=new URLSearchParams({client_key:creds.id,client_secret:creds.secret,code,grant_type:"authorization_code",redirect_uri:redirectUri});
  const result=await readJson(await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body}));
  tokenData=result.data||result;
 }else{
  const tokenUrl=new URL("https://graph.facebook.com/v27.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id",creds.id);tokenUrl.searchParams.set("client_secret",creds.secret);tokenUrl.searchParams.set("redirect_uri",redirectUri);tokenUrl.searchParams.set("code",code);
  tokenData=await readJson(await fetch(tokenUrl));
 }
 const accessToken=tokenData.access_token;
 if(!accessToken)return fail("token_missing");
 let profile:any={};
 try{
  const profileUrl=provider==="ga4"||provider==="youtube"?"https://www.googleapis.com/oauth2/v2/userinfo":provider==="instagram"||provider==="facebook"||provider==="meta_ads"?"https://graph.facebook.com/v27.0/me?fields=id,name":provider==="tiktok"?"https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name":"https://api.linkedin.com/v2/userinfo";
  const profileResponse=await fetch(profileUrl,{headers:{Authorization:"Bearer "+accessToken}});
  if(profileResponse.ok)profile=await profileResponse.json();
 }catch{}
 const externalId=String(profile.id||profile.sub||profile.open_id||"");
 const displayName=String(profile.name||profile.display_name||profile.email||label[provider]);
 const scopes=String(tokenData.scope||tokenData.scope_list||"").split(/[ ,]+/).filter(Boolean);
 const payload={access_token:accessToken,refresh_token:tokenData.refresh_token||null,token_type:tokenData.token_type||"Bearer",expires_at:tokenData.expires_in?new Date(Date.now()+Number(tokenData.expires_in)*1000).toISOString():null,scope:scopes,provider_account_id:externalId};
 const {error:saveError}=await supabase.rpc("zenit_save_oauth_connection",{p_workspace_id:state.workspace_id,p_provider:provider,p_display_name:displayName,p_external_account_id:externalId,p_scopes:scopes,p_token_payload:payload});
 if(saveError)return fail("token_storage_failed");
 return NextResponse.redirect(new URL("/dashboard/integrations?oauth=success&provider="+provider,request.url));
}
