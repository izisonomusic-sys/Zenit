(function () {
  "use strict";
  if (window.zenit || window.ZENIT) return;
  var script = document.currentScript;
  var key = script && script.getAttribute("data-key");
  if (!key || key.indexOf("zn_pub_") !== 0) {
    console.error("[ZENIT] Clé publique SDK absente ou invalide.");
    return;
  }
  var endpoint = (script.getAttribute("data-endpoint") || new URL(script.src).origin).replace(/\/+$/, "") + "/api/v1/events";
  function makeId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : "z_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function storage(name, session) {
    var store = session ? window.sessionStorage : window.localStorage;
    try {
      var value = store.getItem(name);
      if (!value) { value = makeId(); store.setItem(name, value); }
      return value;
    } catch (e) { return makeId(); }
  }
  var suffix = key.slice(0, 16);
  var anonymousId = storage("zenit_anon_" + suffix, false);
  var sessionId = storage("zenit_session_" + suffix, true);
  var userId = null;
  try { userId = window.sessionStorage.getItem("zenit_user_" + suffix); } catch (e) {}
  var queue = [];
  var sending = false;
  function flush() {
    if (sending || !queue.length) return;
    sending = true;
    var batch = queue.splice(0, 50);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Zenit-Key": key },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
      credentials: "omit"
    }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
    }).catch(function (error) {
      queue = batch.concat(queue).slice(-100);
      if (window.console) console.warn("[ZENIT] Échec de collecte :", error.message);
    }).finally(function () {
      sending = false;
      if (queue.length) setTimeout(flush, 800);
    });
  }
  function track(name, properties) {
    if (typeof name !== "string" || !name.trim()) return;
    queue.push({
      name: name.trim().slice(0, 120),
      timestamp: new Date().toISOString(),
      anonymous_id: anonymousId,
      session_id: sessionId,
      user_id: userId,
      url: location.href.slice(0, 2048),
      referrer: document.referrer ? document.referrer.slice(0, 2048) : null,
      properties: properties && typeof properties === "object" && !Array.isArray(properties) ? properties : {}
    });
    if (queue.length >= 10) flush();
    else if (queue.length === 1) setTimeout(flush, 900);
  }
  var api = {
    track: track,
    page: function () { track("page_view", { title: document.title }); },
    identify: function (id, traits) {
      userId = id == null ? null : String(id).slice(0, 128);
      try {
        if (userId) window.sessionStorage.setItem("zenit_user_" + suffix, userId);
        else window.sessionStorage.removeItem("zenit_user_" + suffix);
      } catch (e) {}
      track("identify", { traits: traits || {} });
    },
    flush: flush
  };
  window.zenit = api;
  window.ZENIT = api;
  track("page_view", { title: document.title });
  var lastUrl = location.href;
  function routeChanged() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(function () { track("page_view", { title: document.title }); }, 0);
    }
  }
  var push = history.pushState;
  var replace = history.replaceState;
  history.pushState = function () { var result = push.apply(this, arguments); routeChanged(); return result; };
  history.replaceState = function () { var result = replace.apply(this, arguments); routeChanged(); return result; };
  window.addEventListener("popstate", routeChanged);
  window.addEventListener("pagehide", flush);
  window.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("online", flush);
})();