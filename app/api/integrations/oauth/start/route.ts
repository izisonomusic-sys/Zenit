import {NextRequest,NextResponse} from "next/server";
import {createHash,randomBytes} from "node:crypto";
import {createClient} from "@/lib/supabase/server";

type ProviderConfig={clientId?:string;authorizeUrl:string;scopes:string[];extra?:Record<string,string>;label:string};
function config(provider:string):ProviderConfig|null{
 const google={clientId:process.env.GOOGLE_CLIENT_ID,authorizeUrl:"https://accounts.google.com/o/oauth2/v2/auth",scopes:["openid","email","profile",...(provider==="ga4"?["https://www.googleapis.com/auth/analytics.readonly"]:provider==="google_ads"?["https://www.googleapis.com/auth/adwords"]:["https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/yt-analytics.readonly"])],extra:{access_type:"offline",prompt:"consent",include_granted_scopes:"true"},label:provider==="ga4"?"Google Analytics 4":"YouTube"};
 const meta={clientId:process.env.META_APP_ID,authorizeUrl:"https://www.facebook.com/v27.0/dialog/oauth",scopes:provider==="meta_ads"?["ads_read","business_management"]:provider==="instagram"?["pages_show_list","pages_read_engagement","instagram_basic","instagram_manage_insights"]:["pages_show_list","pages_read_engagement"],label:provider==="meta_ads"?"Meta Ads":provider==="instagram"?"Instagram":"Facebook"};
 const tiktok={clientId:process.env.TIKTOK_CLIENT_KEY,authorizeUrl:"https://www.tiktok.com/v2/auth/authorize/",scopes:["user.info.basic","video.list"],label:"TikTok"};
 const linkedin={clientId:process.env.LINKEDIN_CLIENT_ID,authorizeUrl:"https://www.linkedin.com/oauth/v2/authorization",scopes:["openid","profile","email"],label:"LinkedIn"};
 if(provider==="ga4"||provider==="youtube"||provider==="google_ads")return google;
 if(provider==="instagram"||provider==="facebook"||provider==="meta_ads")return meta;
 if(provider==="tiktok")return tiktok;
 if(provider==="linkedin")return linkedin;
 return null;
}
export async function GET(request:NextRequest){
 const provider=request.nextUrl.searchParams.get("provider")||"";
 const cfg=config(provider);
 if(!cfg)return NextResponse.redirect(new URL("/dashboard/integrations?oauth_error=provider",request.url));
 const clientSecret=provider==="ga4"||provider==="youtube"?process.env.GOOGLE_CLIENT_SECRET:provider==="instagram"||provider==="facebook"||provider==="meta_ads"?process.env.META_APP_SECRET:provider==="tiktok"?process.env.TIKTOK_CLIENT_SECRET:process.env.LINKEDIN_CLIENT_SECRET;
 if(!cfg.clientId||!clientSecret)return NextResponse.redirect(new URL("/dashboard/integrations?oauth_error=not_configured&provider="+provider,request.url));
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.redirect(new URL("/login",request.url));
 const random=randomBytes(24).toString("hex");
 const state=provider+"."+random;
 const stateHash=createHash("sha256").update(state).digest("hex");
 const {error}=await supabase.rpc("zenit_create_oauth_state",{p_state_hash:stateHash,p_provider:provider});
 if(error)return NextResponse.redirect(new URL("/dashboard/integrations?oauth_error=state",request.url));
 const redirectUri=new URL("/api/integrations/oauth/callback",request.url).toString();
 const auth=new URL(cfg.authorizeUrl);
 auth.searchParams.set("client_id",cfg.clientId);
 auth.searchParams.set("redirect_uri",redirectUri);
 auth.searchParams.set("response_type","code");
 auth.searchParams.set("scope",cfg.scopes.join(provider==="tiktok"?",":" "));
 auth.searchParams.set("state",state);
 Object.entries(cfg.extra||{}).forEach(([k,v])=>auth.searchParams.set(k,v));
 if(provider==="tiktok")auth.searchParams.set("client_key",cfg.clientId);
 return NextResponse.redirect(auth);
}
