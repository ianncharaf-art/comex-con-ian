// Un solo service worker para todo el sitio: notificaciones de OneSignal + la app sin conexión (sw.js).
try{importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js")}catch(e){}
importScripts("/sw.js");
