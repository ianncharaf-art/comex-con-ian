/* Portal comex: barra de indicadores y calendario, escritorio de links, glosario, asistente NCM,
   checklist documental y casos prácticos. Todo corre en el navegador; el asistente usa /api/ncm
   si está configurado (GEMINI_API_KEY en Vercel) y si no, el nomenclador local (ncm.json). */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const TZ='America/Argentina/Buenos_Aires';
const ymdAR=d=>d.toLocaleDateString('en-CA',{timeZone:TZ});
const money=v=>v==null||isNaN(v)?'—':'$ '+Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
const usd=v=>'US$ '+Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
const go=t=>{if(window.cciShowTab)window.cciShowTab(t);else{const b=document.querySelector('.tab[data-tab="'+t+'"]');if(b)b.click()}};
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* =====================================================================
   1. Barra de indicadores: mayorista (A3500), BNA billete, feriados
   ===================================================================== */
function paintFx(by){
  if(!by)return;
  [['ind-may','mayorista'],['ind-bna','oficial']].forEach(([id,c])=>{const el=$(id);if(!el||!by[c])return;el.querySelector('b').textContent=money(by[c].venta);el.title=(window.__fxRespaldo?'Último valor guardado · ':'')+'Venta. Tocá para ver todos los tipos de cambio'});
}
window.addEventListener('cci-fx',e=>paintFx(e.detail));
if(window.__fx)paintFx(window.__fx);
document.querySelectorAll('.ind[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
// Hora de Buenos Aires, estilo terminal
(function clock(){const el=$('ind-hora');if(!el)return;const t=()=>{el.textContent='BUE '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:TZ})};t();setInterval(t,30000)})();

/* Feriados: ArgentinaDatos en vivo; si no responde, la copia de fx.json (workflow fx.yml); si tampoco, esta lista. */
const FER_RESPALDO=[
  {fecha:'2026-11-23',tipo:'trasladable',nombre:'Día de la Soberanía Nacional'},
  {fecha:'2026-12-07',tipo:'puente',nombre:'Día no laborable con fines turísticos'},
  {fecha:'2026-12-08',tipo:'inamovible',nombre:'Inmaculada Concepción de María'},
  {fecha:'2026-12-25',tipo:'inamovible',nombre:'Navidad'},
  {fecha:'2027-01-01',tipo:'inamovible',nombre:'Año nuevo'}
];
let FER=[];
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIA=['dom','lun','mar','mié','jue','vie','sáb'];
const fd=s=>{const d=new Date(s+'T12:00:00Z');return DIA[d.getUTCDay()]+' '+d.getUTCDate()+' '+MES[d.getUTCMonth()]};
function nextHolidays(){const hoy=ymdAR(new Date());return FER.filter(f=>f.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha))}
function deadlines(){
  // Fechas clave que trae el radar: si una noticia tiene "vence" (AAAA-MM-DD) se muestra acá.
  const items=(window.__news&&window.__news.items)||[];const hoy=ymdAR(new Date());
  return items.filter(n=>/^\d{4}-\d{2}-\d{2}$/.test(n.vence||'')&&n.vence>=hoy).map(n=>({fecha:n.vence,nombre:n.titulo})).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,4);
}
function paintCal(){
  const nx=nextHolidays();const el=$('ind-fer');
  if(el)el.textContent=nx[0]?fd(nx[0].fecha)+' · '+nx[0].nombre.replace('Día de la ','').replace('Día no laborable con fines turísticos','No laborable'):'—';
  const pop=$('calpop');if(!pop)return;
  const tipo=t=>t==='puente'?'No laborable: los bancos pueden abrir, confirmá con el tuyo':t==='inamovible'?'Feriado nacional: sin bancos ni mercado de cambios':'Feriado nacional trasladable: sin bancos ni mercado de cambios';
  const dl=deadlines();
  pop.innerHTML='<h5>Próximos feriados en Argentina</h5><ul>'+nx.slice(0,5).map(f=>`<li><time datetime="${f.fecha}">${fd(f.fecha)}</time><span>${esc(f.nombre)}<small>${tipo(f.tipo)}</small></span></li>`).join('')+'</ul>'+
    (dl.length?'<h5>Fechas clave del radar</h5><ul>'+dl.map(f=>`<li><time datetime="${f.fecha}">${fd(f.fecha)}</time><span>${esc(f.nombre)}</span></li>`).join('')+'</ul>':'')+
    '<p class="note">Sin bancos no hay mercado de cambios: programá giros al exterior y liquidaciones antes del feriado. En aduana, los plazos que se cuentan en días hábiles se corren.</p>';
}
async function loadFer(){
  const y=+ymdAR(new Date()).slice(0,4);
  try{
    const rs=await Promise.all([y,y+1].map(yy=>fetch('https://api.argentinadatos.com/v1/feriados/'+yy).then(r=>r.ok?r.json():[]).catch(()=>[])));
    FER=rs.flat().filter(f=>f&&f.fecha);
  }catch(e){}
  if(!FER.length){try{const j=await fetch('fx.json',{cache:'no-store'}).then(r=>r.json());if(Array.isArray(j.feriados))FER=j.feriados}catch(e){}}
  if(!FER.length)FER=FER_RESPALDO;
  paintCal();
}
loadFer();
(function(){
  const b=$('ind-cal'),pop=$('calpop');if(!b||!pop)return;
  const close=()=>{pop.hidden=true;b.setAttribute('aria-expanded','false')};
  b.addEventListener('click',e=>{e.stopPropagation();paintCal();pop.hidden=!pop.hidden;b.setAttribute('aria-expanded',String(!pop.hidden))});
  document.addEventListener('click',e=>{if(!pop.hidden&&!pop.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
})();
// Copia del radar para las fechas clave
fetch('news.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(j){window.__news=j;paintCal()}}).catch(()=>{});

/* =====================================================================
   2. Escritorio comex: links en 1 clic
   ===================================================================== */
const DESK=[
  ['Organismos',[
    ['ARCA · Clave fiscal','Entrá al SIM (Malvina), SEDI y tus trámites aduaneros','https://auth.afip.gob.ar/contribuyente_/login.xhtml'],
    ['ARCA · Aduana','Normativa, regímenes y novedades aduaneras','https://www.arca.gob.ar/aduana/'],
    ['VUCE','Ventanilla Única: certificados, licencias e intervenciones','https://www.vuce.gob.ar/'],
    ['Boletín Oficial · Primera sección','Decretos y resoluciones del día','https://www.boletinoficial.gob.ar/seccion/primera'],
    ['BCRA · Com. "A" 3500','Tipo de cambio mayorista de referencia (planilla)','https://www.bcra.gob.ar/PublicacionesEstadisticas/Tipos_de_cambios.asp'],
    ['Consulta NCM y aranceles','Nomenclador con derechos, tasas e intervenciones (Tarifar)','https://www.tarifar.com/'],
    ['INDEC · Intercambio comercial','Datos oficiales de importación y exportación','https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-2-40']
  ]],
  ['Tracking marítimo',[
    ['Maersk','Seguimiento por contenedor o B/L','https://www.maersk.com/tracking/'],
    ['MSC','Track a shipment','https://www.msc.com/en/track-a-shipment'],
    ['CMA CGM','Tracking de contenedores','https://www.cma-cgm.com/ebusiness/tracking'],
    ['Hapag-Lloyd','Track & Trace','https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html'],
    ['COSCO','Cargo tracking','https://elines.coscoshipping.com/ebusiness/cargoTracking'],
    ['ONE','Ocean Network Express','https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking'],
    ['Evergreen','ShipmentLink','https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do']
  ]],
  ['Tracking aéreo',[
    ['Guía aérea (AWB) · cualquier aerolínea','Buscá por los 11 dígitos de la AWB','https://www.track-trace.com/aircargo'],
    ['LATAM Cargo','Seguimiento de envíos','https://www.latamcargo.com/en/trackshipment'],
    ['Aerolíneas Argentinas Cargas','Seguimiento de guías','https://www.aerolineas.com.ar/es-ar/cargas']
  ]],
  ['Courier',[
    ['DHL Express','Rastreo de envíos','https://www.dhl.com/ar-es/home/rastreo.html'],
    ['FedEx','Rastreo','https://www.fedex.com/es-ar/tracking.html'],
    ['UPS','Rastreo','https://www.ups.com/track?loc=es_AR'],
    ['Correo Argentino','Seguimiento de envíos internacionales','https://www.correoargentino.com.ar/formularios/e-commerce']
  ]]
];
function renderDesk(){
  const el=$('desk');if(!el)return;
  el.innerHTML='<div class="desk">'+DESK.map(([g,ls])=>`<section class="desk-g"><h4>${esc(g)}</h4>${ls.map(([n,d,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener"><div><b>${esc(n)}</b><span>${esc(d)}</span></div></a>`).join('')}</section>`).join('')+
  `<section class="desk-g courier"><h4>Topes del régimen courier</h4><dl>
    <div><dt>Courier o correo · uso personal</dt><dd>Franquicia de US$ 400 FOB por envío (Decreto 604/2026). Lo que excede paga IVA, derechos y tasa de estadística. Hasta US$ 3.000 y 50 kg por envío, 5 envíos por año y 3 unidades iguales por envío. No sirve para revender.</dd></div>
    <div><dt>Courier comercial</dt><dd>Para traer mercadería para vender necesitás CUIT inscripto como importador y despachar como importación comercial (pequeños envíos o carga común, según valor y peso).</dd></div>
    <div><dt>Exportación por courier</dt><dd>Exporta Simple: régimen simplificado para vender al exterior en envíos chicos, con CUIT inscripto y factura E.</dd></div>
  </dl><p class="note" style="color:inherit;opacity:.75">Valores orientativos. Confirmalos en el micrositio de envíos internacionales de ARCA antes de comprar.</p></section></div>`;
}
renderDesk();

/* =====================================================================
   3. Glosario & siglas
   ===================================================================== */
let GLO=null,gq='',gl='';
function renderGlo(){
  const el=$('glosario');if(!el)return;
  if(!el.dataset.ready){
    el.dataset.ready='1';
    el.innerHTML=`<div class="pt-h"><span class="eyebrow">Glosario y siglas</span><h3>Las siglas del comex, <em>en criollo</em></h3><p>Definición técnica, cómo se usa en la operación real y un ejemplo. Buscá por sigla o por palabra.</p></div>
      <input class="pt-in" id="gq" type="search" placeholder="Buscar: SEDI, B/L, canal rojo, DDP…" autocomplete="off" aria-label="Buscar en el glosario">
      <div class="glo-letters" id="glet" role="group" aria-label="Filtrar por letra"></div>
      <p class="note" id="gcount"></p><div class="glo-list" id="glist"><p class="note">Cargando glosario…</p></div>`;
    $('gq').addEventListener('input',e=>{gq=e.target.value;gl='';paintGlo()});
  }
  if(GLO)paintGlo();
}
function paintGlo(){
  const ws=norm(gq).split(/\s+/).filter(Boolean);
  const letters=[...new Set(GLO.map(g=>norm(g.t)[0].toUpperCase()))].sort();
  $('glet').innerHTML=['Todas',...letters].map(l=>`<button type="button" data-l="${l}" aria-pressed="${(gl||'Todas')===l}" ${l==='Todas'?'style="width:auto;padding:0 10px"':''}>${l}</button>`).join('');
  $('glet').querySelectorAll('button').forEach(b=>b.onclick=()=>{gl=b.dataset.l==='Todas'?'':b.dataset.l;gq='';$('gq').value='';paintGlo()});
  const list=GLO.filter(g=>(!gl||norm(g.t)[0].toUpperCase()===gl)&&(!ws.length||ws.every(w=>norm(g.t+' '+g.n+' '+g.d+' '+g.u+' '+(g.k||'')).includes(w))))
    .sort((a,b)=>{if(!ws.length)return a.t.localeCompare(b.t,'es');const q=norm(gq.trim());const sa=norm(a.t)===q?0:norm(a.t).startsWith(q)?1:2,sb=norm(b.t)===q?0:norm(b.t).startsWith(q)?1:2;return sa-sb||a.t.localeCompare(b.t,'es')});
  $('gcount').textContent=list.length+' de '+GLO.length+' términos';
  $('glist').innerHTML=list.length?list.map((g,i)=>`<details class="glo-it"${ws.length&&i===0?' open':''}><summary><b>${esc(g.t)}</b><span>${esc(g.n)}</span></summary><div class="glo-body"><div><i>Definición</i>${esc(g.d)}</div><div><i>En la práctica</i>${esc(g.u)}</div><div><i>Ejemplo</i>${esc(g.e)}</div></div></details>`).join(''):'<p class="note" style="padding:16px 0">No está en el glosario todavía. Probá con otra palabra.</p>';
}
renderGlo();
fetch('/data/glosario.json').then(r=>r.json()).then(d=>{GLO=d;renderGlo()}).catch(()=>{const l=$('glist');if(l)l.innerHTML='<p class="note">No se pudo cargar el glosario.</p>'});

/* =====================================================================
   4. Asistente NCM
   ===================================================================== */
const CAP={1:'Animales vivos',2:'Carne y despojos',3:'Pescados y crustáceos',4:'Leche, lácteos, huevos y miel',5:'Otros productos de origen animal',6:'Plantas vivas y floricultura',7:'Hortalizas',8:'Frutas',9:'Café, té, yerba mate y especias',10:'Cereales',11:'Productos de molinería',12:'Semillas y frutos oleaginosos',13:'Gomas y resinas',14:'Materias trenzables',15:'Grasas y aceites',16:'Preparaciones de carne o pescado',17:'Azúcares y artículos de confitería',18:'Cacao y sus preparaciones',19:'Preparaciones a base de cereales',20:'Preparaciones de hortalizas y frutas',21:'Preparaciones alimenticias diversas',22:'Bebidas y vinagre',23:'Residuos de la industria alimentaria',24:'Tabaco',25:'Sal, azufre, tierras y piedras',26:'Minerales metalíferos',27:'Combustibles minerales',28:'Productos químicos inorgánicos',29:'Productos químicos orgánicos',30:'Productos farmacéuticos',31:'Abonos',32:'Extractos curtientes, tintas y pinturas',33:'Aceites esenciales, perfumería y cosmética',34:'Jabones y preparaciones para lavar',35:'Materias albuminoideas y colas',36:'Pólvoras y explosivos',37:'Productos fotográficos',38:'Productos diversos de la industria química',39:'Plástico y sus manufacturas',40:'Caucho y sus manufacturas',41:'Pieles y cueros',42:'Manufacturas de cuero y marroquinería',43:'Peletería',44:'Madera y sus manufacturas',45:'Corcho',46:'Cestería',47:'Pasta de madera',48:'Papel y cartón',49:'Productos editoriales',50:'Seda',51:'Lana',52:'Algodón',53:'Otras fibras vegetales',54:'Filamentos sintéticos',55:'Fibras sintéticas discontinuas',56:'Guata, fieltro y cordelería',57:'Alfombras',58:'Tejidos especiales',59:'Telas impregnadas',60:'Tejidos de punto',61:'Prendas de vestir de punto',62:'Prendas de vestir, excepto de punto',63:'Los demás artículos textiles',64:'Calzado',65:'Sombreros',66:'Paraguas y bastones',67:'Plumas y flores artificiales',68:'Manufacturas de piedra y cemento',69:'Productos cerámicos',70:'Vidrio',71:'Piedras y metales preciosos, bijouterie',72:'Fundición, hierro y acero',73:'Manufacturas de hierro o acero',74:'Cobre',75:'Níquel',76:'Aluminio',78:'Plomo',79:'Cinc',80:'Estaño',81:'Los demás metales comunes',82:'Herramientas y cuchillería',83:'Manufacturas diversas de metal',84:'Máquinas y aparatos mecánicos',85:'Máquinas y aparatos eléctricos',86:'Material ferroviario',87:'Vehículos automóviles',88:'Aeronaves',89:'Barcos',90:'Óptica, medición y medicina',91:'Relojería',92:'Instrumentos musicales',93:'Armas y municiones',94:'Muebles e iluminación',95:'Juguetes y artículos de deporte',96:'Manufacturas diversas',97:'Objetos de arte y antigüedades'};
const INT=[
  [/^0[1-5]/,'SENASA','Productos de origen animal: certificado sanitario del país de origen e intervención de SENASA.'],
  [/^(0[6-9]|1[0-4])/,'SENASA','Vegetales, semillas y granos: certificado fitosanitario e intervención de SENASA.'],
  [/^(1[5-9]|2[01]|220[1-2])/,'INAL · ANMAT','Alimentos: el importador (RNE) y el producto (RNPA) tienen que estar inscriptos ante la autoridad sanitaria.'],
  [/^220[4-6]/,'INV','Vinos y derivados: análisis e intervención del Instituto Nacional de Vitivinicultura.'],
  [/^220[3-8]/,'Autoridad alimentaria','Bebidas alcohólicas: registro como alimento y, según el caso, impuestos internos.'],
  [/^24/,'Impuestos internos','Tabaco: paga impuestos internos y lleva estampillado.'],
  [/^30/,'ANMAT','Medicamentos: registro del producto y habilitación de la empresa en ANMAT.'],
  [/^330[3-7]/,'ANMAT','Cosméticos, perfumes e higiene personal: producto y empresa registrados en ANMAT.'],
  [/^3808/,'SENASA','Agroquímicos: registro en SENASA.'],
  [/^(28|29|38)/,'RENPRE','Algunos químicos son precursores controlados: revisá si figura en las listas del RENPRE (SEDRONAR).'],
  [/^401[1-3]/,'Certificación de neumáticos','Neumáticos y cámaras: certificación de seguridad.'],
  [/^(5\d|6[0-4])/,'Etiquetado','Textiles y calzado: etiquetado con composición y país de origen; revisá las exigencias vigentes de la Secretaría de Comercio.'],
  [/^85(1[6-9]|0[1-9]|1[0-5]|2[0-9]|3[0-9]|4[0-4])|^84(1[4-9]|5[01]|6[7]|7[0-3])|^94(05)/,'Seguridad eléctrica','Productos eléctricos de baja tensión: pueden requerir certificación de seguridad eléctrica. Verificá el régimen vigente antes de embarcar.'],
  [/^85(17|25|26|27|28)/,'ENACOM','Equipos con radio, wifi, bluetooth o telecomunicaciones: homologación de ENACOM.'],
  [/^87(0[1-9]|1[01])/,'Seguridad vial','Vehículos y motos: Licencia para Configuración de Modelo (LCM) y requisitos de seguridad.'],
  [/^90(18|19|20|21|22)/,'ANMAT','Productos médicos: registro en ANMAT.'],
  [/^93/,'ANMaC','Armas y municiones: autorización de la agencia nacional de control de armas.'],
  [/^950[3-5]/,'Seguridad de juguetes','Juguetes: certificación de seguridad de juguetes.'],
  [/^44/,'SENASA','Madera: puede requerir intervención fitosanitaria.']
];
function interventions(code,q){
  const c=code.replace(/\./g,'');const out=[];const seen=new Set();
  INT.forEach(([rx,who,txt])=>{if(rx.test(c)&&!seen.has(who)){seen.add(who);out.push([who,txt])}});
  if(/bluetooth|wifi|wi-fi|inalambric|radio|5g|4g|nfc/.test(norm(q))&&!seen.has('ENACOM'))out.push(['ENACOM','Tiene conexión inalámbrica: los equipos con bluetooth o wifi necesitan homologación de ENACOM.']);
  return out;
}
const STOP=new Set('de del la las el los un una unos unas con sin para por en y o a al que se su sus es tipo marca modelo uso color colores cm mm kg ml mas muy etc'.split(' '));
// Palabras de todos los días → término del nomenclador
const SYN={celular:['telefonos','celulares'],celulares:['telefonos'],smartphone:['telefonos'],bluetooth:['inalambricos'],parlante:['altavoces'],parlantes:['altavoces'],notebook:['portatiles'],laptop:['portatiles'],tablet:['portatiles'],zapatilla:['calzado','deporte'],zapatillas:['calzado','deporte'],remera:['camisetas'],remeras:['camisetas'],buzo:['sueteres'],jean:['pantalones'],jeans:['pantalones'],termo:['termos','isotermicos'],tele:['televisores'],tv:['televisores'],heladera:['refrigeradores'],lavarropas:['lavar','ropa'],drone:['aeronaves'],dron:['aeronaves'],peluche:['juguetes','rellenos'],mochila:['mochilas'],cartera:['bolsos'],bici:['bicicletas'],vino:['vinos'],malbec:['vinos'],cargador:['cargadores','acumuladores'],perfume:['perfumes'],lampara:['lamparas'],led:['diodos'],reloj:['relojes'],cafetera:['cafe'],impresora:['impresoras'],camara:['camaras'],anteojos:['gafas'],lentes:['gafas'],crema:['belleza','piel'],hidratante:['piel','belleza'],facial:['piel','belleza'],shampoo:['champues'],goma:['caucho'],tela:['textil','materia textil'],suela:['suela'],cuero:['cuero'],acero:['acero'],plastico:['plastico']};
// Productos frecuentes → posición directa (se usa solo si existe en el nomenclador)
const PROD={auricular:['8518.30.00'],auriculares:['8518.30.00'],cargador:['8504.40.10','8504.40.90'],cargadores:['8504.40.10'],peluche:['9503.00.31'],peluches:['9503.00.31'],perfume:['3303.00.10'],perfumes:['3303.00.10'],termo:['9617.00.10'],termos:['9617.00.10'],parlante:['8518.22.00','8518.21.00'],parlantes:['8518.22.00'],lampara:['8539.50.00'],lamparas:['8539.50.00'],vino:['2204.21.00'],vinos:['2204.21.00'],crema:['3304.99.90'],shampoo:['3305.10.00'],champu:['3305.10.00'],licuadora:['8509.40.10'],secador:['8516.31.00']};
const stem=w=>w.length>5?w.replace(/(es|s)$/,''):w.length>4?w.replace(/s$/,''):w;
let DF=null;
function df(IDX){
  if(DF)return DF;DF=new Map();
  IDX.forEach(o=>{o.all=o.all||norm(o.d+' '+o.p+' '+o.h);new Set(o.all.split(/[^a-z0-9ñ]+/).filter(w=>w.length>2).map(stem)).forEach(w=>DF.set(w,(DF.get(w)||0)+1))});
  return DF;
}
function rank(q){
  const IDX=(window.cciNCM&&window.cciNCM.idx)||[];if(!IDX.length)return [];
  const raw=norm(q).replace(/[^a-z0-9ñ\s.]/g,' ');
  const digits=raw.replace(/[.\s]/g,'');
  if(/^\d{4,8}$/.test(digits))return IDX.filter(o=>o.cd.startsWith(digits)).slice(0,8).map(o=>({o,s:1}));
  const base=raw.split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)&&!/^\d+$/.test(w));
  if(!base.length)return [];
  const N=IDX.length,D=df(IDX);
  const terms=[];const seen=new Set();
  const add=(w,wt)=>{const st=stem(w);if(seen.has(st))return;seen.add(st);const f=D.get(st)||0;if(!f)return;terms.push({rx:new RegExp('(^|[^a-z0-9ñ])'+st.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+(st.length<=4?'($|[^a-z0-9ñ])':'')),idf:Math.log(N/f)*wt})};
  base.forEach(w=>{add(w,1);(SYN[w]||[]).forEach(x=>x.split(' ').forEach(y=>add(y,.9)))});
  const direct=new Map();base.forEach((w,i)=>(PROD[w]||(window.cciNCM.alias||{})[w]||[]).forEach((c,j)=>{if(!direct.has(c))direct.set(c,30-i*2-j)}));
  const res=[];
  IDX.forEach(o=>{
    const d=o.nd||(o.nd=norm(o.d)),p=o.np||(o.np=norm(o.p)),h=o.nh||(o.nh=norm(o.h));
    let s=direct.get(o.c)||0,hit=0;
    terms.forEach(t=>{let m=0;if(t.rx.test(d))m=1.15;else if(t.rx.test(p))m=1;else if(t.rx.test(h))m=.85;if(m){hit++;s+=m*t.idf}});
    if(!hit&&!s)return;
    if(/^(los|las) dem[aá]s/i.test(o.d))s-=.4;
    res.push({o,s,hit});
  });
  res.sort((a,b)=>b.s-a.s||a.o.c.localeCompare(b.o.c));
  const top=res.length?res[0].s:0;const out=res.filter(r=>r.s>=top*.45).slice(0,8);
  out.weak=!direct.size&&res.length>0&&res[0].hit<Math.min(2,base.length);
  return out;
}
const teCap=cif=>cif<=10000?180:cif<=100000?3000:cif<=1000000?30000:150000;
function rgiSteps(o){
  const cap=+o.c.slice(0,2),p4=o.c.slice(0,4),generic=/^(los|las) dem[aá]s|^otros|^otras/i.test(o.d);
  return [
    `<b>RGI 1 · Capítulo ${String(cap).padStart(2,'0')}</b>: ${esc(CAP[cap]||'')}. La clasificación se decide por el texto de las partidas y las notas de sección y capítulo, no por el título.`,
    `<b>Partida ${p4}</b>: ${esc(o.h||'')}. Es la que describe la mercadería de forma más específica (si dos encajan, manda la más específica: RGI 3 a).`,
    `<b>RGI 6 · Subpartida ${o.c}</b>: ${esc(o.p?o.p+' › ':'')}${esc(o.d)}. Dentro de la partida se compara solo con subpartidas del mismo nivel.${generic?' Es una posición residual ("los demás"): solo corresponde si no encaja en ninguna más específica.':''}`,
    `<b>Completá en el SIM</b>: a los 8 dígitos se les suma la apertura de 3 dígitos y la letra de control. Verificala en el Arancel Integrado antes de oficializar.`
  ];
}
function detailHTML(o,q,ai){
  const bit=o.m==='BK'||o.m==='BIT',iva=bit?10.5:21,ints=interventions(o.c,q);
  const ex=1000,te=Math.min(ex*.03,teCap(ex)),die=ex*o.a/100,base=ex+die+te;
  return `<div class="ncm-res">
    <div class="card"><span class="ncm-mode">${ai?'Sugerida por IA · verificada en el NCM':'Posición sugerida · NCM 2017 local'}</span><div class="ncm-big">${esc(o.c)}</div>
      <p style="margin:0">${esc(o.p?o.p+' › ':'')}${esc(o.d)}</p>
      <div class="pt-row"><span class="pt-tag gold">AEC ${o.a}%</span><span class="pt-tag">IVA ${String(iva).replace('.',',')}%</span>${o.m?`<span class="pt-tag">${o.m==='BK'?'Bien de capital':'Informática y telecom.'}</span>`:''}<span class="pt-tag">Reintegro export. ${o.r==null?'—':String(o.r).replace('.',',')+'%'}</span></div>
      <div class="pt-row"><button class="btn" type="button" data-sim="${esc(o.c)}">Simular costos de esta mercadería</button></div>
      <p class="pt-warn">Clasificación orientativa con fines educativos. La posición definitiva la confirma tu despachante de aduana; si hay dudas, se puede pedir una clasificación arancelaria a ARCA.</p>
    </div>
    <div class="card"><h3 style="margin:0">Cómo se llega (RGI)</h3><ol class="ncm-steps">${(ai&&ai.rgi&&ai.rgi.length?ai.rgi.map(esc):rgiSteps(o)).map(s=>`<li><span>${s}</span></li>`).join('')}</ol></div>
    <div class="card"><h3 style="margin:0">Intervenciones posibles</h3><div class="ncm-int">${ints.length?ints.map(([w,t])=>`<div><b>${esc(w)}</b><span>${esc(t)}</span></div>`).join(''):'<div><b>Sin intervenciones típicas por capítulo</b><span>No aparece ninguna habitual para esta posición, pero revisalo con tu despachante: algunas dependen del uso o del material.</span></div>'}${ai&&ai.intervenciones&&ai.intervenciones.length?ai.intervenciones.filter(x=>!ints.some(([w])=>norm(x).includes(norm(w)))).map(x=>`<div><b>Según la IA</b><span>${esc(x)}</span></div>`).join(''):''}<div><b>Embalaje de madera</b><span>Pallets y cajones de madera necesitan sello NIMF 15, para cualquier producto.</span></div></div></div>
    <div class="card"><h3 style="margin:0">Tributos habituales</h3>
      <table class="ncm-tbl"><tr><td>Derecho de importación extrazona (AEC)</td><td>${o.a}%</td></tr><tr><td>Tasa de estadística (con tope)</td><td>3%</td></tr><tr><td>IVA</td><td>${String(iva).replace('.',',')}%</td></tr><tr><td>Percepción de IVA</td><td>${bit?'10%':'20%'}</td></tr><tr><td>Percepción de Ganancias</td><td>6%</td></tr><tr><td>Percepción de IIBB (según provincia)</td><td>≈ 2,5%</td></tr></table>
      <p class="note">Ejemplo por cada US$ 1.000 CIF: derecho ${usd(die)}, tasa ${usd(te)} e IVA ${usd(base*iva/100)}. Desde Mercosur con certificado de origen, derecho y tasa suelen ser 0%. Argentina puede aplicar un derecho distinto del AEC por excepciones: confirmalo antes de cotizar.</p></div>
  </div>`;
}
let ncmBusy=false;
function renderNcmApp(){
  const el=$('ncmapp');if(!el)return;
  const EX=['auriculares inalámbricos bluetooth con estuche de carga','zapatillas deportivas de tela con suela de goma','termo de acero inoxidable de 1 litro','vino tinto malbec en botella de 750 ml','juguete de peluche para bebés','cargador de celular USB-C de 20 W','crema hidratante facial'];
  el.innerHTML=`<div class="ncm-a">
    <div class="card"><label for="ncmdesc" class="note" style="font-weight:600">Descripción técnica de la mercadería</label>
      <textarea id="ncmdesc" class="pt-ta" placeholder="Ej.: auriculares inalámbricos bluetooth con estuche de carga"></textarea>
      <div class="ncm-ex" aria-label="Ejemplos">${EX.map(x=>`<button type="button">${esc(x)}</button>`).join('')}</div>
      <div class="pt-row"><button class="btn" id="ncmgo" type="button">Clasificar</button><span class="note" id="ncmst" role="status"></span></div>
    </div>
    <div id="ncmout"></div></div>`;
  el.querySelectorAll('.ncm-ex button').forEach(b=>b.onclick=()=>{$('ncmdesc').value=b.textContent;classify()});
  $('ncmgo').onclick=classify;
  $('ncmdesc').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))classify()});
  el.addEventListener('click',e=>{const b=e.target.closest('[data-sim]');if(!b)return;const o=window.cciNCM.byCode(b.dataset.sim);window.cciCalc&&window.cciCalc.pick(b.dataset.sim,o?{die:o.a,te:3}:{te:3})});
}
async function classify(){
  if(ncmBusy)return;const q=$('ncmdesc').value.trim(),st=$('ncmst'),out=$('ncmout');
  if(q.length<3){st.textContent='Escribí qué es el producto.';return}
  ncmBusy=true;st.textContent='Clasificando…';out.innerHTML='';
  let ai=null,note='';
  try{
    const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),20000);
    const r=await fetch('/api/ncm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q}),signal:ctl.signal});clearTimeout(t);
    if(r.ok){const j=await r.json();if(j&&j.ncm)ai=j}
    else if(r.status===429)note='Llegaste a las 10 consultas con IA de hoy. Te mostramos el resultado del buscador del nomenclador.';
  }catch(e){}
  try{await window.cciNCM.ready}catch(e){}
  const cands=rank(q);
  let first=null;
  if(ai){const code=String(ai.ncm).replace(/[^\d]/g,'').slice(0,8).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1.$2.$3');first=window.cciNCM.byCode(code);
    if(!first)note='La IA sugirió '+esc(ai.ncm)+', que no está en el NCM 2017 de la base. Te mostramos las posiciones que sí existen.';
    else{const i=cands.findIndex(c=>c.o.c===first.c);if(i>=0)cands.splice(i,1);cands.unshift({o:first,s:99})}}
  ncmBusy=false;
  if(!cands.length){st.textContent='';out.innerHTML='<p class="pt-warn">No encontramos posiciones con esa descripción. Probá con palabras técnicas: qué es, de qué material y para qué sirve (por ejemplo "calzado con suela de caucho").</p>';return}
  if(cands.weak&&!ai)note=note||'No estamos seguros con esta descripción: sumá qué es, de qué material está hecho y para qué se usa. Mientras, estas son las posiciones más cercanas.';
  st.textContent=ai&&first?'Listo':'Listo · buscador del nomenclador';
  out.innerHTML=(note?`<p class="pt-warn">${note}</p>`:'')+(ai&&first&&ai.explicacion?`<p class="pt-warn" style="border-color:var(--accent)">${esc(ai.explicacion)}</p>`:'')+
    `<div class="pt-h" style="margin:8px 0 10px"><span class="eyebrow">${cands.length>1?'Elegí la que mejor describe tu producto':'Resultado'}</span></div>
    <div class="ncm-cands" role="group" aria-label="Posiciones posibles">${cands.map((c,i)=>`<button type="button" class="ncm-c" data-c="${c.o.c}" aria-pressed="${i===0}"><code>${c.o.c}</code><span>${esc(window.cciNCM.label(c.o))}<small>${esc(String(+c.o.c.slice(0,2)).padStart(2,'0')+' · '+(CAP[+c.o.c.slice(0,2)]||'')+' › '+c.o.h)}</small></span><span class="pt-tag">AEC ${c.o.a}%</span></button>`).join('')}</div>
    <div id="ncmdet" style="margin-top:16px"></div>`;
  const show=code=>{const c=cands.find(x=>x.o.c===code);out.querySelectorAll('.ncm-c').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===code)));$('ncmdet').innerHTML=detailHTML(c.o,q,ai&&first&&first.c===code?ai:null)};
  out.querySelectorAll('.ncm-c').forEach(b=>b.onclick=()=>{show(b.dataset.c);$('ncmdet').scrollIntoView({behavior:'smooth',block:'start'})});
  show(cands[0].o.c);
}
renderNcmApp();

/* =====================================================================
   5. Checklist documental por operación (descarga en PDF)
   ===================================================================== */
const CK={
  base:{imp:[
    ['Factura comercial','Original del proveedor: descripción precisa, Incoterm, cantidades, precio unitario y total, origen. Tiene que coincidir con lo que declarás.','antes'],
    ['Packing list','Bultos, pesos neto y bruto, medidas y contenido de cada bulto.','antes'],
    ['Inscripción como importador','CUIT con alta en el Registro de Importadores y Exportadores de ARCA.','antes'],
    ['SEDI','Declaración de importación en el Sistema Estadístico de Importaciones, antes de embarcar.','antes'],
    ['Seguro de la carga','Póliza o certificado si el Incoterm te deja el riesgo del viaje (FOB, FCA, EXW, CFR, CPT).','antes'],
    ['Certificado de origen','Si el origen tiene acuerdo (Mercosur, Chile, etc.) para pagar menos derecho, o si el producto tiene antidumping.','durante'],
    ['Declaración de valor','Respaldo del precio (orden de compra, transferencia) por si aduana duda del valor.','durante'],
    ['Despacho de importación','Lo oficializa tu despachante en el SIM; ahí se pagan los tributos y se asigna el canal.','durante']
  ],exp:[
    ['Factura E','Factura de exportación electrónica con Incoterm, moneda y descripción en el idioma del comprador si hace falta.','antes'],
    ['Packing list','Bultos, pesos y medidas; es lo que mira el puerto o el depósito.','antes'],
    ['Inscripción como exportador','CUIT con alta en el Registro de Importadores y Exportadores de ARCA.','antes'],
    ['Permiso de embarque','Destinación de exportación que oficializa el despachante en el SIM.','durante'],
    ['Certificado de origen','Lo pide el comprador para pagar menos arancel en destino si hay acuerdo (Mercosur, Chile, México, UE).','antes'],
    ['Liquidación de divisas','Ingresá y liquidá el cobro en los plazos del BCRA vigentes para tu producto.','después']
  ]},
  via:{
    maritima:[['Conocimiento de embarque (B/L)','Lo emite la naviera o el forwarder. Revisá consignatario, puertos, contenedores y precintos antes de que se emita el original.','durante'],['Reserva (booking) y cut-off','Fecha límite para entregar el contenedor en terminal. Si se pasa, el barco sale sin tu carga.','antes']],
    aerea:[['Guía aérea (AWB)','11 dígitos: los 3 primeros identifican la aerolínea. Revisá peso bruto y volumétrico.','durante']],
    terrestre:[['Carta de porte (CRT)','Contrato de transporte internacional por carretera.','durante'],['MIC/DTA','Manifiesto de carga y tránsito aduanero: permite cruzar fronteras en tránsito.','durante']],
    courier:[['Guía del courier','Número de envío del courier (DHL, FedEx, UPS).','durante'],['Régimen correcto','Uso personal (franquicia US$ 400) o comercial con CUIT inscripto. Para revender, siempre comercial.','antes']]
  },
  rubro:{
    general:[],
    alimentos:[['RNE y RNPA','Establecimiento y producto inscriptos ante la autoridad alimentaria (INAL / provincia).','antes'],['Certificado sanitario o fitosanitario','Emitido en origen; interviene SENASA según el producto.','antes'],['Rotulado en español','Etiqueta conforme al Código Alimentario Argentino antes de comercializar.','después']],
    electronica:[['Seguridad eléctrica','Certificación o declaración según el régimen vigente para productos de baja tensión.','antes'],['ENACOM','Homologación si tiene wifi, bluetooth o radiofrecuencia.','antes'],['Manual y etiquetado','Datos eléctricos (tensión, potencia) en el producto o el envase.','después']],
    textil:[['Etiquetado de composición','Composición de fibras, talle y país de origen en cada prenda o par.','antes'],['Valor de referencia','Textiles y calzado suelen tener controles de valor: tené respaldo del precio.','durante']],
    quimicos:[['ANMAT','Registro de producto y empresa si es cosmético, médico o medicamento.','antes'],['RENPRE','Si es precursor químico, inscripción y autorización previa.','antes'],['Hoja de seguridad (MSDS)','Obligatoria para cargas peligrosas y la pide el transportista.','antes']]
  },
  rubroExp:{alimentos:[['Certificado sanitario de exportación','Lo emite SENASA según el destino.','antes']],quimicos:[['Hoja de seguridad (MSDS)','La pide la naviera o aerolínea para cargas peligrosas.','antes']]},
  tips:{
    imp:['La descripción de la factura tiene que coincidir con la del despacho: una diferencia es motivo de multa o canal rojo.','Declará el NCM correcto: una clasificación mal hecha puede cambiar el derecho y traer multas.','Contratá el seguro si el riesgo del viaje es tuyo: el flete no cubre la mercadería.','Pedí los documentos originales o el B/L liberado antes de que llegue la carga: cada día en puerto suma depósito y demoras.'],
    exp:['Revisá la posición NCM en el permiso: de ella dependen el derecho de exportación y el reintegro.','Cumplí los plazos de ingreso y liquidación de divisas para evitar sanciones cambiarias.','Pedile al comprador qué documentos exige su aduana antes de despachar (origen, sanitarios, legalizaciones).']
  }
};
const LBL={imp:'Importación',exp:'Exportación',maritima:'Marítima',aerea:'Aérea',terrestre:'Terrestre',courier:'Courier',general:'General',alimentos:'Alimentos y bebidas',electronica:'Electrónica',textil:'Textil y calzado',quimicos:'Químicos / salud'};
function ckItems(op,via,rub){
  let L=[...CK.base[op]];
  if(op==='imp'&&via==='courier')L=L.filter(x=>x[0]!=='SEDI');
  L.push(...(CK.via[via]||[]));
  L.push(...(op==='imp'?(CK.rubro[rub]||[]):(CK.rubroExp[rub]||[])));
  return L;
}
function renderChecklist(){
  const el=$('checklist');if(!el)return;
  const s=store.get('ck-sel')||{op:'imp',via:'maritima',rub:'general'};
  el.innerHTML=`<div class="pt-h"><span class="eyebrow">Checklist documental</span><h3>Qué papeles necesitás <em>para tu operación</em></h3><p>Elegí operación, vía y rubro, y armá la lista de lo que tenés que tener antes y durante el embarque. La podés tildar y descargar en PDF.</p></div>
  <div class="card"><div class="pt-sel">
    <label>Operación<select id="ck-op"><option value="imp">Importación</option><option value="exp">Exportación</option></select></label>
    <label>Vía de transporte<select id="ck-via"><option value="maritima">Marítima</option><option value="aerea">Aérea</option><option value="terrestre">Terrestre</option><option value="courier">Courier</option></select></label>
    <label>Rubro<select id="ck-rub"><option value="general">General</option><option value="alimentos">Alimentos y bebidas</option><option value="electronica">Electrónica</option><option value="textil">Textil y calzado</option><option value="quimicos">Químicos / salud</option></select></label>
  </div><div id="ck-out"></div><div class="pt-row"><button class="btn" id="ck-pdf" type="button">Descargar PDF</button><span class="note">Se abre la vista de impresión: elegí "Guardar como PDF".</span></div></div>`;
  $('ck-op').value=s.op;$('ck-via').value=s.via;$('ck-rub').value=s.rub;
  const paint=()=>{
    const op=$('ck-op').value,via=$('ck-via').value,rub=$('ck-rub').value;store.set('ck-sel',{op,via,rub});
    const L=ckItems(op,via,rub);const grp={antes:'Antes del embarque',durante:'Durante el embarque y el despacho',después:'Después del despacho'};
    $('ck-out').innerHTML='<div class="ck-list">'+Object.keys(grp).map(k=>{const xs=L.filter(x=>x[2]===k);return xs.length?`<div class="ck-sec"><h4>${grp[k]}</h4><ul>${xs.map(([t,d])=>`<li><label><input type="checkbox"><div><b>${esc(t)}</b><span>${esc(d)}</span></div></label></li>`).join('')}</ul></div>`:''}).join('')+
      `<div class="ck-sec"><h4>Tips para evitar multas</h4><ul class="ck-tips">${CK.tips[op].map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div></div><p class="pt-warn">Lista orientativa. Las intervenciones exactas dependen de la posición NCM: revisala en el Asistente NCM y confirmala con tu despachante.</p>`;
  };
  ['ck-op','ck-via','ck-rub'].forEach(id=>$(id).addEventListener('change',paint));paint();
  $('ck-pdf').onclick=()=>{
    const op=$('ck-op').value,via=$('ck-via').value,rub=$('ck-rub').value,L=ckItems(op,via,rub);
    const checked=[...$('ck-out').querySelectorAll('li input')].map(i=>i.checked);
    const grp={antes:'Antes del embarque',durante:'Durante el embarque y el despacho',después:'Después del despacho'};let k=0;
    const body=Object.keys(grp).map(g=>{const xs=L.filter(x=>x[2]===g);return xs.length?`<h2>${grp[g]}</h2><ul>${xs.map(([t,d])=>`<li><span class="bx">${checked[k++]?'✓':''}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join('')}</ul>`:''}).join('');
    const w=window.open('','_blank');if(!w){alert('Permití las ventanas emergentes para descargar el PDF.');return}
    w.document.write(`<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><title>Checklist ${LBL[op]} ${LBL[via]} · Comex con Ian</title><style>
      @page{size:A4;margin:16mm}body{font:13px/1.45 Arial,Helvetica,sans-serif;color:#0A0D14;margin:0}
      header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #D4AF37;padding-bottom:10px;margin-bottom:14px}
      header b{font-size:22px;letter-spacing:-.02em}header b span{color:#B8921F}header small{color:#555}
      h1{font-size:18px;margin:0 0 4px}.sub{color:#444;margin:0 0 10px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#0E2A6B;margin:16px 0 6px}
      ul{list-style:none;margin:0;padding:0}li{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #e5e5e5;break-inside:avoid}
      .bx{flex:none;width:14px;height:14px;border:1.5px solid #0E2A6B;border-radius:3px;font-size:11px;line-height:14px;text-align:center;margin-top:2px}
      li p{margin:2px 0 0;color:#444}footer{margin-top:18px;font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:8px}
      .tips li{display:list-item;margin-left:18px;list-style:disc;border:0;padding:3px 0}</style></head><body>
      <header><b>Comex <span>con Ian</span></b><small>comex-con-ian.vercel.app · @iancharaf7</small></header>
      <h1>Checklist documental</h1><p class="sub">${LBL[op]} · Vía ${LBL[via].toLowerCase()} · Rubro ${LBL[rub].toLowerCase()} · ${new Date().toLocaleDateString('es-AR')}</p>
      ${body}<h2>Tips para evitar multas</h2><ul class="tips">${CK.tips[op].map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
      <footer>Herramienta educativa. Lista orientativa: las intervenciones exactas dependen de la posición NCM y deben confirmarse con un despachante de aduana.</footer>
      <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
  };
}
renderChecklist();

/* =====================================================================
   6. Casos prácticos ("modo facultad")
   ===================================================================== */
const INCOS=['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];
const DOCS=['Factura comercial','Factura E','Packing list','B/L','AWB','CRT','MIC/DTA','Guía courier','Certificado de origen','Certificado INV','Permiso de embarque','Despacho de importación','SEDI','Homologación ENACOM'];
const CASOS=[
  {id:'shenzhen',t:'Importación aérea desde Shenzhen',s:'Auriculares bluetooth "CIF Ezeiza"',
   ctx:'Tu proveedor de Shenzhen te cotiza 500 auriculares bluetooth (NCM 8518.30.00) "CIF Ezeiza": precio FOB US$ 7.000, flete aéreo US$ 900 y seguro US$ 100, todo a cargo del vendedor hasta Ezeiza. Vos pagás los tributos.',
   inco:'CIP',incoWhy:'CIF y CFR son solo para transporte marítimo o fluvial. Si la carga viaja en avión y el vendedor paga flete y seguro hasta destino, el correcto es CIP Ezeiza. Es un error muy común en las cotizaciones.',
   q:'¿Cuál es el valor en aduana (CIF) en US$?',ans:8000,ncm:'8518.30.00',ansWhy:'Valor en aduana = FOB 7.000 + flete 900 + seguro 100 = US$ 8.000. Sobre esa base se calcula el derecho (AEC 20% = US$ 1.600) y la tasa de estadística (3% = US$ 240, con tope de US$ 180 para valores de hasta US$ 10.000).',
   docs:['Factura comercial','Packing list','AWB','SEDI','Despacho de importación','Homologación ENACOM'],docsWhy:'Viaja en avión, así que va guía aérea (AWB), no B/L. Por tener bluetooth necesita homologación de ENACOM. El certificado de origen no aporta: China no tiene acuerdo con Argentina.'},
  {id:'vino',t:'Exportación de vino FOB Buenos Aires',s:'Malbec embotellado a Estados Unidos',
   ctx:'Una bodega de Mendoza vende 1.200 cajas de Malbec a un importador de Miami. El precio en bodega (EXW) es US$ 18.000; el camión hasta el puerto de Buenos Aires cuesta US$ 600 y los gastos de terminal y despacho US$ 400. El importador contrata el flete marítimo.',
   inco:'FOB',incoWhy:'Viaja en barco y el vendedor entrega la carga a bordo en Buenos Aires; desde ahí el flete y el riesgo son del comprador. FOB Buenos Aires es correcto (con contenedor, FCA también sería válido).',
   q:'¿Cuál es el valor FOB de la exportación en US$?',ans:19000,ansWhy:'FOB = EXW 18.000 + flete interno 600 + gastos de terminal y despacho 400 = US$ 19.000. Es la base del permiso de embarque.',
   docs:['Factura E','Packing list','B/L','Permiso de embarque','Certificado INV'],docsWhy:'Factura E, permiso de embarque y B/L marítimo. El vino necesita análisis del Instituto Nacional de Vitivinicultura (INV) para exportar. El certificado de origen solo si el destino da preferencia arancelaria, y con Estados Unidos no hay acuerdo.'},
  {id:'courier',t:'Importación por courier comercial',s:'Repuestos para revender',
   ctx:'Tenés una tienda online y traés repuestos de Estados Unidos para revender: US$ 2.000 FOB, 30 kg. El proveedor despacha por courier y paga el envío hasta tu puerta (US$ 250); vos pagás los impuestos. Seguro: 1% sobre FOB + flete.',
   inco:'DAP',incoWhy:'El vendedor paga el transporte hasta tu dirección pero no los tributos de importación: eso es DAP. Si también pagara los impuestos sería DDP.',
   q:'¿Cuál es el valor en aduana (CIF) en US$?',ans:2272.5,ansWhy:'Seguro = 1% de (2.000 + 250) = US$ 22,50. CIF = 2.000 + 250 + 22,50 = US$ 2.272,50.',
   docs:['Factura comercial','Guía courier','Despacho de importación'],docsWhy:'Como es para revender, va como courier comercial con CUIT inscripto: factura comercial y guía del courier, y el despacho lo hace el courier. No es uso personal, así que no aplica la franquicia de US$ 400.'},
  {id:'ningbo',t:'Contenedor marítimo desde Ningbo',s:'Zapatillas FOB Ningbo',
   ctx:'Importás un contenedor de 40 pies con zapatillas deportivas (NCM 6404.11.00) desde Ningbo. Precio FOB US$ 40.000. Vos contratás el flete marítimo (US$ 3.500) y el seguro (1% sobre FOB + flete).',
   inco:'FOB',incoWhy:'El proveedor carga a bordo en Ningbo y vos contratás flete y seguro: FOB Ningbo. Dato de nivel: para contenedores la ICC recomienda FCA, porque el riesgo pasa cuando entregás el contenedor en terminal y no cuando sube al barco.',
   q:'¿Cuál es el valor en aduana (CIF) en US$?',ans:43935,ncm:'6404.11.00',ansWhy:'Seguro = 1% de (40.000 + 3.500) = US$ 435. CIF = 40.000 + 3.500 + 435 = US$ 43.935. Con AEC de 35%, el derecho es US$ 15.377,25.',
   docs:['Factura comercial','Packing list','B/L','SEDI','Despacho de importación'],docsWhy:'Marítimo, así que B/L. SEDI antes de embarcar, factura y packing con pares por talle y despacho. Revisá también el etiquetado del calzado. Certificado de origen: solo si hay antidumping o acuerdo, y con China no hay acuerdo.'},
  {id:'chile',t:'Exportación en camión a Chile',s:'Maquinaria liviana CPT Santiago',
   ctx:'Vendés equipos de envasado a un cliente de Santiago de Chile por US$ 12.000 CPT Santiago. El flete en camión que contratás vos cuesta US$ 800. El riesgo pasa al comprador cuando entregás al transportista en tu planta.',
   inco:'CPT',incoWhy:'Pagás el flete hasta Santiago, pero el riesgo pasa al comprador al entregar al primer transportista y no contratás seguro: CPT. Si contrataras seguro, sería CIP.',
   q:'¿Cuál es el valor FCA / FOB equivalente en US$ (precio menos el flete internacional)?',ans:11200,ansWhy:'Para el valor de exportación se descuenta el flete internacional: 12.000 − 800 = US$ 11.200.',
   docs:['Factura E','Packing list','CRT','MIC/DTA','Permiso de embarque','Certificado de origen'],docsWhy:'Por camión van CRT (carta de porte) y MIC/DTA (manifiesto y tránsito). Con Chile hay acuerdo (ACE 35), así que el certificado de origen le permite al comprador pagar menos arancel.'}
];
function renderCasos(){
  const el=$('casos');if(!el)return;
  const done=store.get('casos-ok')||{};
  el.innerHTML=`<div class="pt-h"><span class="eyebrow">Práctica comex · modo facultad</span><h3>Resolvé casos <em>reales</em> paso a paso</h3><p>Elegí el Incoterm, calculá el valor y marcá la documentación. Al final te mostramos la solución explicada.</p></div>
  <div class="cs-pick" role="group" aria-label="Casos">${CASOS.map((c,i)=>`<button type="button" data-i="${i}" aria-pressed="${i===0}">${esc(c.t)}<small>${esc(c.s)}</small>${done[c.id]!=null?`<span class="ok">✓ Resuelto · ${done[c.id]}/3</span>`:''}</button>`).join('')}</div><div class="card" id="cs-body"></div>`;
  el.querySelectorAll('.cs-pick button').forEach(b=>b.onclick=()=>{el.querySelectorAll('.cs-pick button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));caso(+b.dataset.i)});
  caso(0);
}
function caso(i){
  const c=CASOS[i],B=$('cs-body');const st={inco:null};
  B.innerHTML=`<p style="margin:0;font-size:16px;line-height:1.55">${esc(c.ctx)}</p>
    <div class="cs-step"><h4><i>1</i>¿Qué Incoterm corresponde?</h4><div class="cs-opts" id="cs-inco">${INCOS.map(x=>`<button type="button" data-x="${x}">${x}</button>`).join('')}</div></div>
    <div class="cs-step"><h4><i>2</i>${esc(c.q)}</h4><div class="pt-row"><input class="pt-in" id="cs-val" type="number" step="any" inputmode="decimal" placeholder="US$" style="max-width:220px">${c.ncm?`<button class="btn ghost" type="button" id="cs-calc">Abrir la calculadora con ${c.ncm}</button>`:''}</div></div>
    <div class="cs-step"><h4><i>3</i>¿Qué documentos necesitás?</h4><div class="cs-docs" id="cs-docs">${DOCS.map(d=>`<label><input type="checkbox" value="${esc(d)}">${esc(d)}</label>`).join('')}</div></div>
    <div class="pt-row"><button class="btn" type="button" id="cs-check">Ver si está bien</button></div><div id="cs-res"></div>`;
  B.querySelectorAll('#cs-inco button').forEach(b=>b.onclick=()=>{st.inco=b.dataset.x;B.querySelectorAll('#cs-inco button').forEach(x=>{x.setAttribute('aria-pressed',String(x===b));x.classList.remove('right','wrong')})});
  const cb=$('cs-calc');if(cb)cb.onclick=()=>{const o=window.cciNCM&&window.cciNCM.byCode(c.ncm);window.cciCalc&&window.cciCalc.pick(c.ncm,o?{die:o.a,te:3}:{te:3})};
  $('cs-check').onclick=()=>{
    let pts=0;
    const okI=st.inco===c.inco;if(okI)pts++;
    B.querySelectorAll('#cs-inco button').forEach(x=>{x.classList.toggle('right',x.dataset.x===c.inco);x.classList.toggle('wrong',x.dataset.x===st.inco&&!okI)});
    const v=parseFloat($('cs-val').value);const okV=isFinite(v)&&Math.abs(v-c.ans)<=Math.max(1,c.ans*.005);if(okV)pts++;
    const sel=[...B.querySelectorAll('#cs-docs input')].filter(x=>x.checked).map(x=>x.value);
    const okD=sel.length===c.docs.length&&c.docs.every(d=>sel.includes(d));if(okD)pts++;
    B.querySelectorAll('#cs-docs label').forEach(l=>{const val=l.querySelector('input').value,need=c.docs.includes(val),on=sel.includes(val);l.classList.toggle('right',need&&on);l.classList.toggle('wrong',!need&&on);l.classList.toggle('miss',need&&!on)});
    $('cs-res').innerHTML=`<div class="cs-step"><span class="cs-score">${pts}/3</span>
      <p class="cs-fb ${okI?'ok':'ko'}"><b>Incoterm: ${c.inco}.</b> ${esc(c.incoWhy)}</p>
      <p class="cs-fb ${okV?'ok':'ko'}"><b>Valor: ${usd(c.ans)}.</b> ${esc(c.ansWhy)}</p>
      <p class="cs-fb ${okD?'ok':'ko'}"><b>Documentos: ${c.docs.join(', ')}.</b> ${esc(c.docsWhy)}</p>
      <p class="note">En verde lo correcto, en rojo lo que sobra y en amarillo lo que faltó.</p></div>`;
    const d=store.get('casos-ok')||{};d[c.id]=Math.max(pts,d[c.id]||0);store.set('casos-ok',d);
    const pb=document.querySelector('.cs-pick button[data-i="'+i+'"]');if(pb&&!pb.querySelector('.ok')){const s=document.createElement('span');s.className='ok';pb.append(s)}if(pb)pb.querySelector('.ok').textContent='✓ Resuelto · '+d[c.id]+'/3';
  };
}
renderCasos();
})();
