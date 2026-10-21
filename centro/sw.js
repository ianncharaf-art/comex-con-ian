// Centro Ian offline shell. The page always tries the network first so updates and the login check win.
const CACHE='centro-v1';
const SHELL=['/centro/','/centro/carrera.json','/centro/icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>fetch(u,{credentials:'include'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('centro-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith('/centro/'))return;
  const page=e.request.mode==='navigate'||u.pathname==='/centro/'||u.pathname==='/centro/index.html';
  if(page){e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put('/centro/',c))}return r}).catch(()=>caches.match('/centro/')));return}
  e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok&&u.pathname==='/centro/carrera.json'){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r})));
});
