// Offline shell: cache the app; news.json always tries the network first.
const CACHE='cci-v5';
const SHELL=['/','/index.html','/manifest.webmanifest','/icons/icon-192.png','/ncm.json','/portal.js','/portal.css','/data/glosario.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname==='/news.json'||u.pathname==='/'||u.pathname==='/index.html'||u.pathname==='/portal.js'||u.pathname==='/portal.css'||u.pathname==='/fx.json'){
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(u.pathname==='/'||u.pathname==='/index.html'?e.request:u.pathname,c));return r}).catch(()=>caches.match(u.pathname==='/'||u.pathname==='/index.html'?e.request:u.pathname)));
    return;
  }
  e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request)));
});
