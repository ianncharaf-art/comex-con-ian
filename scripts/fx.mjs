// Guarda en fx.json las cotizaciones del dólar (DolarApi) y el cierre del día hábil anterior (ArgentinaDatos).
// Lo usa la miniapp de Claude, que no puede consultar APIs externas en vivo.
import {writeFileSync} from 'node:fs';
const API='https://dolarapi.com/v1/', HIST='https://api.argentinadatos.com/v1/cotizaciones/dolares/';
const get=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(u+' '+r.status);return r.json()};
const ymdAR=d=>d.toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
const dolares=await get(API+'dolares');
let cotizaciones=[];try{cotizaciones=await get(API+'cotizaciones')}catch(e){}
const cierre={};
for(const x of dolares){
  const d=new Date(ymdAR(new Date(x.fechaActualizacion))+'T12:00:00Z');
  for(let i=1;i<=6;i++){
    d.setUTCDate(d.getUTCDate()-1);
    try{const j=await get(HIST+x.casa+'/'+d.toISOString().slice(0,10).replace(/-/g,'/'));if(j&&j.venta){cierre[x.casa]=j.venta;break}}catch(e){}
  }
}
writeFileSync('fx.json',JSON.stringify({consultado:new Date().toISOString(),dolares,cotizaciones,cierre})+'\n');
console.log('fx.json:',dolares.length,'dólares,',cotizaciones.length,'monedas,',Object.keys(cierre).length,'cierres');
