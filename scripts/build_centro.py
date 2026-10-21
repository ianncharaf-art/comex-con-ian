"""Build the installable web version of Centro Ian from the Claude artifact source.

Usage: python3 scripts/build_centro.py <artifact index.html> [carrera.json]
Writes centro/index.html (and copies carrera.json if given). The web version keeps
everything on the phone (localStorage) and sends Claude-only features to the artifact.
"""
import shutil, sys

ART = 'https://claude.ai/artifact/CnPQfhqZ2DfXgamXmvmKxA'
src, out = sys.argv[1], 'centro/index.html'
s = open(src, encoding='utf8').read()

def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)

HEAD = f'''<!doctype html><html lang="es-AR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#050608"><meta name="robots" content="noindex,nofollow">
<link rel="manifest" href="/centro/manifest.webmanifest">
<link rel="icon" href="/centro/icons/icon-192.png"><link rel="apple-touch-icon" href="/centro/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Centro Ian">
<style>html,body{{margin:0;background:#050608}}header.top{{padding-top:env(safe-area-inset-top,0px)}}</style>
</head><body>
'''
s = HEAD + s.lstrip() + '\n</body></html>\n'

# Claude-only features open the artifact.
rep('<p class="empty" id="ianone" hidden>La IA funciona cuando abrís el Centro desde Claude con tu cuenta.</p>',
    f'<div class="card" id="ianone" hidden><p style="margin:0">El chat con la IA, el análisis de métricas y la lectura de capturas funcionan en tu Centro dentro de Claude.</p><a class="btn" href="{ART}" target="_blank" rel="noopener" style="align-self:flex-start">Abrir el Centro en Claude</a></div>')
rep("'El análisis con IA funciona cuando abrís el Centro desde Claude con tu cuenta.'",
    f"'El análisis con IA está en tu Centro dentro de Claude: <a href=\"{ART}\" target=\"_blank\" rel=\"noopener\" style=\"color:var(--gold-2)\">abrilo acá</a>. Para que vea tus números, cargalos allá también.'")
rep("$('m-an').hidden=!sample;", "$('m-an').hidden=!sample;$('m-imp').hidden=!sample;")
rep("setSync(false,'Solo en este dispositivo')", "setSync(true,'Guardado en este celu')", 2)

# Install steps for this website, plus backup.
a = s.index('<div class="card hero" id="install">'); b = s.index('</div>\n  <div class="lede"><span class="eyebrow">Herramientas', a)
s = s[:a] + '''<div class="card hero" id="install"><span class="eyebrow">Tenelo como app</span><h2 style="font-size:clamp(22px,4vw,30px)">Centro Ian en tu pantalla de inicio</h2>
    <div class="grid g2"><div><b>iPhone (Safari)</b><ol class="steps"><li>Entrá a comex-con-ian.vercel.app/centro en Safari y poné tu clave.</li><li>Tocá Compartir (el cuadrado con la flecha para arriba).</li><li>Elegí "Agregar a inicio".</li></ol></div><div><b>Android (Chrome)</b><ol class="steps"><li>Entrá a comex-con-ian.vercel.app/centro en Chrome y poné tu clave.</li><li>Tocá los tres puntos ⋮.</li><li>Elegí "Instalar app" o "Agregar a la pantalla principal".</li></ol></div></div>
    <p class="note">Tus datos quedan guardados en este celu. Hacé una copia de vez en cuando para no perderlos si cambiás de teléfono.</p>
    <div class="row"><button class="btn sm" id="bk-out">Descargar copia</button><label class="btn ghost sm" style="cursor:pointer">Restaurar copia<input type="file" id="bk-in" accept="application/json,.json" hidden></label></div>''' + s[b:]

rep('href="https://claude.ai/artifact/HTNvj4BCqK8YdLGv3gDWzb" target="_blank" rel="noopener"', 'href="/"', 4)
rep('<p>Abren en Comex con Ian, tu app pública.</p>', '<p>Abren en Comex con Ian, tu web pública.</p>')

# Boot: hide the install banner inside the installed app, backup, service worker.
rep("$('instx').onclick=", """if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)$('instban').hidden=true;
$('bk-out').onclick=()=>{const d={app:'centro-ian',v:1,at:new Date().toISOString(),items:Object.fromEntries(items),progress,chat,analisis};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download='centro-ian-copia-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)};
$('bk-in').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const d=JSON.parse(await f.text());if(d.app!=='centro-ian'||!d.items)throw 0;if(!confirm('¿Restaurar la copia del '+String(d.at||'').slice(0,10)+'? Reemplaza lo que hay en este celu.'))return;items=new Map(Object.entries(d.items));progress=d.progress||{done:{}};chat=d.chat||[];analisis=d.analisis||null;lsSave();try{localStorage.setItem('centro-ian-chat',JSON.stringify(chat));localStorage.setItem('centro-ian-analisis',JSON.stringify(analisis))}catch(_){}render();drawChat();renderAnalisis();toast('Copia restaurada')}catch(_){toast('Ese archivo no es una copia del Centro')}};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/centro/sw.js',{scope:'/centro/'}).catch(()=>{}));
$('instx').onclick=""")

open(out, 'w', encoding='utf8').write(s)
if len(sys.argv) > 2:
    shutil.copyfile(sys.argv[2], 'centro/carrera.json')
print('ok', out, len(s))
