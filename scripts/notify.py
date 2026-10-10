"""Envía una notificación push a todos los suscriptos de Comex con Ian vía OneSignal."""
import json, os, subprocess, sys, urllib.request

APP_ID = "4a40e7fa-e1d9-43ea-844d-5e32fbfeb21c"
SITE = "https://comex-con-ian.vercel.app"


def changed(path):
    if os.environ.get("EVENT") == "workflow_dispatch":
        return path == "notify.json"
    out = subprocess.run(["git", "diff", "--name-only", "HEAD~1", "HEAD"], capture_output=True, text=True).stdout
    return path in out.split()


def previous(path):
    r = subprocess.run(["git", "show", f"HEAD~1:{path}"], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None


def build():
    if changed("notify.json"):
        n = json.load(open("notify.json"))
        return n["titulo"], n["mensaje"], n.get("url") or SITE
    if changed("news.json"):
        items = json.load(open("news.json")).get("items", [])
        old = previous("news.json") or {}
        old_titles = {i.get("titulo") for i in old.get("items", [])}
        new = [i for i in items if i.get("titulo") not in old_titles]
        if not new:
            return None
        top = new[0]
        extra = f" (+{len(new) - 1} novedades más)" if len(new) > 1 else ""
        return "Radar comex · " + top.get("categoria", "Novedad"), top["titulo"] + extra, SITE
    return None


msg = build()
if not msg:
    print("Nada nuevo para avisar.")
    sys.exit(0)
key = os.environ.get("ONESIGNAL_API_KEY")
if not key:
    sys.exit("Falta el secreto ONESIGNAL_API_KEY en el repositorio.")
title, body, url = msg
payload = {
    "app_id": APP_ID,
    "target_channel": "push",
    "included_segments": ["Total Subscriptions"],
    "headings": {"en": title, "es": title},
    "contents": {"en": body, "es": body},
    "url": url,
    "chrome_web_icon": SITE + "/icons/icon-192.png",
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
if res.get("errors"):
    sys.exit(f"OneSignal devolvió errores: {res['errors']}")
