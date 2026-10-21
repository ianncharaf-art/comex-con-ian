"""Recordatorio diario del Centro Ian: solo a los dispositivos con la etiqueta centro=1 (los de Ian)."""
import json, os, sys, urllib.request
from datetime import datetime, timedelta, timezone

APP_ID = "4a40e7fa-e1d9-43ea-844d-5e32fbfeb21c"
CENTRO = "https://comex-con-ian.vercel.app/centro/"
PLAN = "https://claude.ai/artifact/CnPQfhqZ2DfXgamXmvmKxA"

# Lunes = 0. Cada día, una tarea concreta del plan de contenido y estudio.
DIAS = [
    ("📊 Cargá tus métricas", "Anotá los números de la semana en Redes y fijate qué video funcionó mejor.", CENTRO),
    ("🎬 Día de grabar", "Elegí 2 ideas del tablero y grabalas en tanda.", CENTRO),
    ("📚 Una unidad hoy", "15 minutos de estudio y la autoevaluación. La carrera avanza de a una.", CENTRO),
    ("✂️ Editá lo grabado", "Pasá un video de Grabado a Editado en el tablero.", CENTRO),
    ("🚀 Publicá", "Subí lo que tengas listo y respondé los comentarios con preguntas técnicas.", CENTRO),
    ("🗓️ Tu plan de la semana", "Claude te dejó videos y carruseles para la semana que viene.", PLAN),
    ("📚 Repaso tranqui", "Una unidad corta o el final de una materia para cerrar la semana.", CENTRO),
]

if os.environ.get("TITULO"):
    title, body, url = os.environ["TITULO"], os.environ.get("MENSAJE", ""), CENTRO
else:
    title, body, url = DIAS[datetime.now(timezone(timedelta(hours=-3))).weekday()]

key = os.environ.get("ONESIGNAL_API_KEY")
if not key:
    sys.exit("Falta el secreto ONESIGNAL_API_KEY en el repositorio.")
payload = {
    "app_id": APP_ID,
    "target_channel": "push",
    "filters": [{"field": "tag", "key": "centro", "relation": "=", "value": "1"}],
    "headings": {"en": title, "es": title},
    "contents": {"en": body, "es": body},
    "url": url,
    "chrome_web_icon": CENTRO + "icons/icon-192.png",
}
req = urllib.request.Request(
    "https://api.onesignal.com/notifications?c=push",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "Authorization": "Key " + key},
)
try:
    with urllib.request.urlopen(req) as r:
        res = json.load(r)
except urllib.error.HTTPError as e:
    sys.exit(f"OneSignal respondió {e.code}: {e.read().decode()}")
print("Enviada:", title, "|", body, "|", res)
errs = res.get("errors")
if errs and errs != ["All included players are not subscribed"]:
    sys.exit(f"OneSignal devolvió errores: {errs}")
