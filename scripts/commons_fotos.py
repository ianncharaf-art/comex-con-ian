# Baja fotos de Wikimedia Commons (con licencia y autor) para carruseles.
# Lee scripts/commons-fotos.txt: una línea por búsqueda ("search: texto" o "cat: Categoría" o "file: Nombre.jpg").
import json, os, re, sys, urllib.parse, urllib.request
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "carruseles-bot/1.0 (github actions)"}
out = "tmp-fotos"; os.makedirs(out, exist_ok=True)
def get(params):
    params.update(format="json", formatversion=2)
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=60))
common = dict(action="query", prop="imageinfo", iiprop="url|extmetadata|size|mime", iiurlwidth=1800)
meta = {}
for line in open("scripts/commons-fotos.txt", encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#"): continue
    kind, q = [s.strip() for s in line.split(":", 1)]
    if kind == "search": p = dict(common, generator="search", gsrsearch=q + " filetype:bitmap", gsrnamespace=6, gsrlimit=10)
    elif kind == "cat": p = dict(common, generator="categorymembers", gcmtitle="Category:" + q, gcmtype="file", gcmlimit=25)
    else: p = dict(common, titles="File:" + q)
    try: pages = get(p).get("query", {}).get("pages", [])
    except Exception as e: print("ERR", line, e); continue
    for pg in pages:
        ii = (pg.get("imageinfo") or [{}])[0]
        if ii.get("mime") not in ("image/jpeg", "image/png"): continue
        if ii.get("width", 0) < 1200: continue
        em = ii.get("extmetadata", {})
        lic = em.get("LicenseShortName", {}).get("value", "")
        if not re.search(r"public domain|CC0|CC BY|PD", lic, re.I): continue
        if re.search(r"NC|ND", lic): continue
        name = re.sub(r"[^A-Za-z0-9]+", "-", pg["title"][5:])[:70].strip("-").lower() + ".jpg"
        if name in meta: continue
        try:
            req = urllib.request.Request(ii.get("thumburl") or ii["url"], headers=UA)
            open(os.path.join(out, name), "wb").write(urllib.request.urlopen(req, timeout=120).read())
        except Exception as e: print("ERR img", name, e); continue
        strip = lambda s: re.sub(r"<[^>]+>", "", s or "").strip()
        meta[name] = dict(titulo=pg["title"], pagina=ii.get("descriptionurl"), licencia=lic,
            autor=strip(em.get("Artist", {}).get("value")), credito=strip(em.get("Credit", {}).get("value")),
            fecha=strip(em.get("DateTimeOriginal", {}).get("value")), descripcion=strip(em.get("ImageDescription", {}).get("value"))[:400],
            busqueda=line, tam=[ii.get("width"), ii.get("height")])
        print("OK", name, lic)
json.dump(meta, open(os.path.join(out, "fuentes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
