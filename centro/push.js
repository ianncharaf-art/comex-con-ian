// Notificaciones del Centro: OneSignal de Comex con Ian + etiqueta "centro" para recibir solo los recordatorios de Ian.
(function(){
  const bell=document.getElementById('cbell');
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  let OS=null;
  const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),4200)};
  const on=()=>!!(OS&&OS.Notifications.permission&&OS.User.PushSubscription.optedIn);
  function paint(){const o=on();bell.classList.toggle('on',o);const l=o?'Notificaciones activadas':'Activar notificaciones';bell.setAttribute('aria-label',l);bell.title=l;if(o)try{OS.User.addTag('centro','1')}catch(e){}}
  bell.onclick=async()=>{
    if(on()){toast('Ya tenés las notificaciones activadas: te aviso todos los días a las 19.');return}
    if(ios&&!standalone){toast('En iPhone primero agregá el Centro a la pantalla de inicio (Compartir → Agregar a inicio) y activalas desde el ícono.');return}
    if(!OS){toast('Cargando… probá de nuevo en un segundo.');return}
    if(!OS.Notifications.isPushSupported()){toast('Este navegador no permite notificaciones.');return}
    try{
      if(!OS.Notifications.permission)await OS.Notifications.requestPermission();
      if(OS.Notifications.permission&&!OS.User.PushSubscription.optedIn)await OS.User.PushSubscription.optIn();
    }catch(e){}
    paint();
    if(on())toast('Listo. Te aviso todos los días a las 19 qué toca.');
    else if(typeof Notification!=='undefined'&&Notification.permission==='denied')toast('Bloqueaste las notificaciones. Activalas en Ajustes y volvé a tocar la campanita.');
  };
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  OneSignalDeferred.push(async function(OneSignal){
    try{
      await OneSignal.init({appId:'4a40e7fa-e1d9-43ea-844d-5e32fbfeb21c',serviceWorkerPath:'OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/'},allowLocalhostAsSecureOrigin:true});
      OS=OneSignal;
      OneSignal.Notifications.addEventListener('permissionChange',paint);
      OneSignal.User.PushSubscription.addEventListener('change',paint);
      paint();
    }catch(e){console.warn('OneSignal',e)}
  });
})();
