(function(){
  "use strict";
  var script=document.currentScript;
  if(!script)return;
  var key=script.getAttribute("data-key");
  var endpoint=(script.getAttribute("data-endpoint")||"https://zenit-unv7.onrender.com").replace(/\/$/,"")+"/api/v1/events";
  if(!key)return;
  var anonymousId=sessionValue("zenit_anonymous_id",false);
  var sessionId=sessionValue("zenit_session_id",true);
  var userId=null;
  var queue=[];
  var sending=false;
  function sessionValue(name,session){
    var store=session?window.sessionStorage:window.localStorage;
    try{var value=store.getItem(name);if(!value){value=makeId();store.setItem(name,value);}return value;}
    catch(e){return makeId();}
  }
  function makeId(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():"z_"+Math.random().toString(36).slice(2)+Date.now().toString(36);}
  function flush(){
    if(sending||!queue.length)return;
    sending=true;
    var batch=queue.splice(0,50);
    fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-ZENIT-Key":key},body:JSON.stringify({events:batch}),keepalive:true,credentials:"omit"})
      .then(function(response){if(!response.ok)throw new Error("ZENIT event ingestion failed");})
      .catch(function(){queue=batch.concat(queue).slice(0,100);})
      .finally(function(){sending=false;if(queue.length)setTimeout(flush,1200);});
  }
  function track(name,properties){
    if(typeof name!=="string"||!name.trim()||name.length>120)return;
    queue.push({name:name.trim(),timestamp:new Date().toISOString(),anonymous_id:anonymousId,user_id:userId,session_id:sessionId,url:location.href,referrer:document.referrer||null,properties:properties&&typeof properties==="object"?properties:{}});
    if(queue.length>=10)flush();else if(queue.length===1)setTimeout(flush,300);
  }
  window.zenit=window.zenit||{};
  window.zenit.track=track;
  window.zenit.identify=function(id){userId=id==null?null:String(id).slice(0,128);};
  window.zenit.flush=flush;
  track("page_view",{title:document.title});
  window.addEventListener("pagehide",flush);
})();