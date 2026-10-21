// Keeps /centro (Ian's private hub) behind a password; the rest of the site stays public.
// Only hashes live here. Set CENTRO_CLAVE in Vercel to change the password.
export const config = { matcher: ['/centro', '/centro/:path*'] };

const CLAVE_HASH = '544c57f8b9055c7d8a55f3cf4dce2740dc6cc90dc6ff94916b1c43e95004af00';
const COOKIE_HASH = '83c4379ad4e1ed704859e68f98a058de4eeb9963cd46c5c3268b019c801a516c';
const PUBLIC = /^\/centro\/(manifest\.webmanifest|icons\/[\w.-]+\.png)$/;

const enc = new TextEncoder();
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const token = (clave) => sha('centro-ian|' + clave);
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

function login(error) {
  const html = `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Centro Ian</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#050608">
<link rel="manifest" href="/centro/manifest.webmanifest"><link rel="apple-touch-icon" href="/centro/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Centro Ian">
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:radial-gradient(900px 500px at 90% -10%,rgba(61,123,255,.18),transparent 60%),#050608;color:#F4F1E8;font:16px/1.5 system-ui,-apple-system,sans-serif}
form{width:min(380px,100%);display:flex;flex-direction:column;gap:14px;background:#0C1019;border:1px solid #1B2232;border-radius:20px;padding:28px}
img{width:64px;height:64px;border-radius:16px}h1{margin:0;font-size:28px;letter-spacing:-.02em}h1 span{color:#D4AF37}
p{margin:0;color:#8890A3;font-size:14px}.err{color:#FF6B6B}
input{height:48px;border-radius:12px;border:1px solid #2A3450;background:#121826;color:#F4F1E8;font:600 17px ui-monospace,Menlo,monospace;padding:0 14px;letter-spacing:.06em;text-transform:uppercase}
input:focus{outline:none;border-color:#D4AF37}
button{height:48px;border:0;border-radius:999px;background:#D4AF37;color:#0A0906;font:600 16px system-ui,sans-serif;cursor:pointer}
</style></head><body><form method="post" action="/centro/entrar">
<img src="/centro/icons/icon-192.png" alt=""><h1>Centro <span>Ian</span></h1><p>Entrá con tu clave. Este celu la recuerda por un año.</p>
${error ? '<p class="err">Esa clave no es. Probá de nuevo.</p>' : ''}
<input name="clave" type="password" autocomplete="current-password" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" required autofocus>
<button>Entrar</button></form></body></html>`;
  return new Response(html, { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export default async function middleware(req) {
  const url = new URL(req.url);
  if (PUBLIC.test(url.pathname)) return next();

  const env = (typeof process !== 'undefined' && process.env && process.env.CENTRO_CLAVE) || '';
  const claveHash = env ? await sha(env.trim().toUpperCase()) : CLAVE_HASH;
  const cookieHash = env ? await sha(await token(env.trim().toUpperCase())) : COOKIE_HASH;

  if (url.pathname === '/centro/entrar' && req.method === 'POST') {
    let clave = '';
    try { clave = String((await req.formData()).get('clave') || '').trim().toUpperCase(); } catch (e) {}
    if (clave && same(await sha(clave), claveHash)) {
      return new Response(null, {
        status: 303,
        headers: {
          location: '/centro/',
          'set-cookie': `ci=${await token(clave)}; Path=/centro; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
          'cache-control': 'no-store',
        },
      });
    }
    await new Promise((r) => setTimeout(r, 1000));
    return login(true);
  }

  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)ci=([a-f0-9]{64})/);
  if (m && same(await sha(m[1]), cookieHash)) return next();
  const accept = req.headers.get('accept') || '';
  if (req.method === 'GET' && (accept.includes('text/html') || url.pathname === '/centro' || url.pathname.endsWith('/'))) return login(false);
  return new Response('No autorizado', { status: 401, headers: { 'cache-control': 'no-store' } });
}
