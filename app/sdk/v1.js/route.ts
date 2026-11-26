import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 const javascript = `(function () {
  if (window.ZENIT || window.zenit) return;
  var script = document.currentScript;
  var key = script && script.getAttribute("data-key");
  if (!key || key.indexOf("zn_live_") !== 0) { console.error("[ZENIT] Clé SDK absente ou invalide."); return; }
  var endpoint = new URL(script.src).origin + "/api/v1/events";
  var storage = function (name) { try { var v = localStorage.getItem(name); if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "z" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(name,v); } return v; } catch(e) { return "z" + Math.random().toString(36).slice(2); } };
  var anonymousId = storage("zenit_anon_" + key.slice(0,16));
  var sessionId = "";
  try { sessionId = sessionStorage.getItem("zenit_session_" + key.slice(0,16)) || ""; if (!sessionId) { sessionId = (crypto.randomUUID ? crypto.randomUUID() : "s"+Date.now()); sessionStorage.setItem("zenit_session_" + key.slice(0,16),sessionId); } } catch(e) { sessionId = "s"+Date.now(); }
  var queue = [];
  var sending = false;
  function send() {
   if (sending || !queue.length) return;
   sending = true;
   var batch = queue.splice(0,50);
   fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Zenit-Key":key},body:JSON.stringify({events:batch}),keepalive:true,credentials:"omit"})
    .then(function(r){ if(!r.ok && window.console) console.warn("[ZENIT] Collecte refusée ("+r.status+")."); })
    .catch(function(){ queue = batch.concat(queue).slice(-100); })
    .finally(function(){ sending=false; if(queue.length) setTimeout(send,500); });
  }
  function track(name, properties) {
   if (typeof name !== "string" || !name.trim()) return;
   var event = {name:name.trim().slice(0,120),timestamp:new Date().toISOString(),anonymous_id:anonymousId,session_id:sessionId,url:location.href.slice(0,2048),referrer:document.referrer.slice(0,2048),properties:properties && typeof properties === "object" && !Array.isArray(properties) ? properties : {}};
   queue.push(event); if(queue.length>=10) send(); else if(queue.length===1) setTimeout(send,1200);
  }
  window.zenit = {track:track, page: function(){track("page_view");}, identify:function(userId, traits){track("identify",{user_id:String(userId).slice(0,128),traits:traits||{}});}};
  window.ZENIT = window.zenit;
  track("page_view");
  var lastUrl = location.href;
  function checkRoute(){ if(location.href!==lastUrl){lastUrl=location.href;track("page_view");} }
  var push=history.pushState, replace=history.replaceState;
  history.pushState=function(){push.apply(this,arguments);checkRoute();};
  history.replaceState=function(){replace.apply(this,arguments);checkRoute();};
  window.addEventListener("popstate",checkRoute);
  window.addEventListener("pagehide",send);
  window.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")send();});
  window.addEventListener("online",send);
  window.zenit.flush=send;
 })();`;
 return new NextResponse(javascript,{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"public, max-age=300, stale-while-revalidate=3600","Access-Control-Allow-Origin":"*","X-Content-Type-Options":"nosniff"}});
}
