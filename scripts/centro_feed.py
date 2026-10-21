"""Write centro/feed.json: the radar scripts and weekly plans Claude saves in the Centro Ian artifact.

Usage: python3 scripts/centro_feed.py <folder with exported items/*.json>
Export the docs first with ArtifactData (query items where kind in [guion, semana], out_dir=<folder>).
The web app at /centro reads this file (behind the password) and adds what's new to the phone.
"""
import datetime, glob, json, os, sys

folder = sys.argv[1]
files = glob.glob(os.path.join(folder, '**', '*.json'), recursive=True)
cut = (datetime.date.today() - datetime.timedelta(days=60)).isoformat()
items = {}
for f in sorted(files):
    d = json.load(open(f, encoding='utf8'))
    if d.get('kind') not in ('guion', 'semana'):
        continue
    if (d.get('fecha') or d.get('hasta') or '9') < cut:
        continue
    items[os.path.splitext(os.path.basename(f))[0]] = d
out = {'actualizado': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'items': items}
os.makedirs('centro', exist_ok=True)
with open('centro/feed.json', 'w', encoding='utf8') as fh:
    json.dump(out, fh, ensure_ascii=False, indent=1)
print('ok centro/feed.json', len(items), 'items')
