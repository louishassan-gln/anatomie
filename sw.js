/* Anatomie — service worker (fait par tools/publier_github.py, ne pas modifier à la main).
   La page et les voix restent sur l'appareil : le site s'ouvre et se lit hors connexion. */
const V = "48606cd02a", APP = "anatomie-app-" + V, VOIX = "anatomie-voix-7eaa011045";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "3d/corps3d.bin"];
const FILES = ["voice/mp3/en-1-1.mp3", "voice/mp3/en-1-2.mp3", "voice/mp3/en-1-3.mp3", "voice/mp3/en-2-1.mp3", "voice/mp3/en-2-2.mp3", "voice/mp3/en-2-3.mp3", "voice/mp3/en-3-1.mp3", "voice/mp3/en-3-2.mp3", "voice/mp3/en-3-3.mp3", "voice/mp3/en-4-1.mp3", "voice/mp3/en-4-2.mp3", "voice/mp3/en-4-3.mp3", "voice/mp3/en-4-4.mp3", "voice/mp3/en-5-1.mp3", "voice/mp3/en-5-2.mp3", "voice/mp3/en-5-3.mp3", "voice/mp3/en-5-4.mp3", "voice/mp3/en-5-5.mp3", "voice/mp3/en-6-1.mp3", "voice/mp3/en-6-2.mp3", "voice/mp3/en-6-3.mp3", "voice/mp3/en-6-4.mp3", "voice/mp3/en-6-5.mp3", "voice/mp3/en-7-1.mp3", "voice/mp3/en-7-2.mp3", "voice/mp3/en-8-1.mp3", "voice/mp3/en-8-2.mp3", "voice/mp3/en-8-3.mp3", "voice/mp3/en-8-4.mp3", "voice/mp3/en-8-5.mp3", "voice/mp3/en-visite-1.mp3", "voice/mp3/en-visite-2.mp3", "voice/mp3/en-visite-3.mp3", "voice/mp3/en-visite-4.mp3", "voice/mp3/en-visite-5.mp3", "voice/mp3/en-visite-6.mp3", "voice/mp3/fr-1-1.mp3", "voice/mp3/fr-1-2.mp3", "voice/mp3/fr-1-3.mp3", "voice/mp3/fr-2-1.mp3", "voice/mp3/fr-2-2.mp3", "voice/mp3/fr-2-3.mp3", "voice/mp3/fr-3-1.mp3", "voice/mp3/fr-3-2.mp3", "voice/mp3/fr-3-3.mp3", "voice/mp3/fr-4-1.mp3", "voice/mp3/fr-4-2.mp3", "voice/mp3/fr-4-3.mp3", "voice/mp3/fr-4-4.mp3", "voice/mp3/fr-5-1.mp3", "voice/mp3/fr-5-2.mp3", "voice/mp3/fr-5-3.mp3", "voice/mp3/fr-5-4.mp3", "voice/mp3/fr-5-5.mp3", "voice/mp3/fr-6-1.mp3", "voice/mp3/fr-6-2.mp3", "voice/mp3/fr-6-3.mp3", "voice/mp3/fr-6-4.mp3", "voice/mp3/fr-6-5.mp3", "voice/mp3/fr-7-1.mp3", "voice/mp3/fr-7-2.mp3", "voice/mp3/fr-8-1.mp3", "voice/mp3/fr-8-2.mp3", "voice/mp3/fr-8-3.mp3", "voice/mp3/fr-8-4.mp3", "voice/mp3/fr-8-5.mp3", "voice/mp3/fr-visite-1.mp3", "voice/mp3/fr-visite-2.mp3", "voice/mp3/fr-visite-3.mp3", "voice/mp3/fr-visite-4.mp3", "voice/mp3/fr-visite-5.mp3", "voice/mp3/fr-visite-6.mp3"];
const abs = p => new URL(p, self.registration.scope).href;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL.map(p => new Request(abs(p), {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith("anatomie-") && k !== APP && k !== VOIX).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Page : depuis l'appareil (la nouvelle version arrive avec un nouveau service worker). Voix : depuis l'appareil,
   sinon téléchargées puis gardées. Le reste du site : appareil d'abord, réseau sinon. Le reste (polices Google,
   voix de secours en ligne) : réseau seulement. */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf("/voice/mp3/") >= 0){ e.respondWith(voix(req)); return; }
  if (req.mode === "navigate"){
    e.respondWith(caches.open(APP).then(c => c.match(abs("index.html"))).then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req)));
});

async function voixFichier(href){
  const c = await caches.open(VOIX);
  let r = await c.match(href);
  if (r) return r;
  const n = await fetch(href, {cache: "no-store"});
  if (n.ok && n.status === 200){ await c.put(href, n.clone()); }
  return n;
}
/* Safari lit l'audio par morceaux (en-tête Range) : on découpe le fichier gardé et on répond 206. */
async function voix(req){
  const u = new URL(req.url); u.search = ""; u.hash = "";
  let r;
  try { r = await voixFichier(u.href); } catch (err){ return new Response("", {status: 504}); }
  const range = req.headers.get("range");
  if (!range || r.status !== 200) return r;
  const buf = await r.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let a = m[1] ? +m[1] : 0, b = m[2] ? +m[2] : size - 1;
  if (!m[1] && m[2]){ a = Math.max(0, size - +m[2]); b = size - 1; }
  b = Math.min(b, size - 1);
  if (a >= size || a > b) return new Response(null, {status: 416, headers: {"Content-Range": "bytes */" + size}});
  return new Response(buf.slice(a, b + 1), {status: 206, headers: {
    "Content-Type": "audio/mpeg", "Content-Range": "bytes " + a + "-" + b + "/" + size,
    "Content-Length": String(b - a + 1), "Accept-Ranges": "bytes"}});
}

/* Enregistrement de toutes les voix, demandé par la page à chaque ouverture ; l'avancement lui est envoyé. */
let job = null;
async function etat(extra){
  const c = await caches.open(VOIX); let ok = 0;
  for (const f of FILES) if (await c.match(abs(f))) ok++;
  const msg = Object.assign({type: "voix-etat", ok: ok, total: FILES.length}, extra || {});
  (await self.clients.matchAll()).forEach(cl => cl.postMessage(msg));
  return ok;
}
async function toutGarder(){
  const c = await caches.open(VOIX);
  let last = 0;
  await etat();
  for (const f of FILES){
    const h = abs(f);
    if (await c.match(h)) continue;
    try {
      const r = await fetch(h, {cache: "no-store"});
      if (!r.ok) throw new Error(r.status);
      await c.put(h, r);
    } catch (err){ await etat({err: true}); return; }
    if (Date.now() - last > 400){ last = Date.now(); await etat(); }
  }
  await etat();
}
self.addEventListener("message", e => {
  if (!e.data || e.data.type !== "voix") return;
  if (!job) job = toutGarder().finally(() => { job = null; });
  e.waitUntil(job);
});
