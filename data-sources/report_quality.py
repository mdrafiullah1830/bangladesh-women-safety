"""Report dataset quality for backend/src/WomenSafety.Api/Data/directory-entries.json.

Checks the three things that decide whether the map is actually useful:
coordinate accuracy (is this a real position or just the district centre?),
Bangladeshi naming, and phone coverage.
"""
import importlib.util, json, math, os, sys
from collections import Counter, defaultdict

ROOT = '/Users/mdrafiullah/womens safety'
SRC = os.path.join(ROOT, 'data-sources')
OUT = os.path.join(ROOT, 'backend/src/WomenSafety.Api/Data/directory-entries.json')

spec = importlib.util.spec_from_file_location('b', os.path.join(SRC, 'build_directory_data.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)
centers = {en: (lat, lng) for _, _, _, en, lat, lng in b.DISTRICTS}

entries = json.load(open(OUT, encoding='utf-8'))
print(f'total entries: {len(entries)}')
for k, v in sorted(Counter(e['category'] for e in entries).items()):
    print(f'  {k:<13} {v}')

# Coordinate accuracy: a hit within ~500 m of the district centre is the
# placeholder, not a real position.
def km(lat1, lng1, lat2, lng2):
    r, p1, p2 = 6371.0, math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


placeable = [e for e in entries if e['category'] in ('POLICE', 'HOSPITAL')]
real = [e for e in placeable if km(*centers[e['district']], e['lat'], e['lng']) > 0.5]

print(f'\ncoordinates (police + hospital, {len(placeable)} total):')
print(f'  exact position : {len(real)} ({len(real) * 100 // len(placeable)}%)')
print(f'  district centre: {len(placeable) - len(real)}')

bengali = [e for e in entries if any('ঀ' <= c <= '৿' for c in e['nameBn'])]
phones = [e for e in entries if e['phone']]
print(f'\nBangladeshi name : {len(bengali)} / {len(entries)}')
print(f'phone number     : {len(phones)} / {len(entries)}')
for cat in sorted({e['category'] for e in entries}):
    rows = [e for e in entries if e['category'] == cat]
    print(f'  {cat:<13} phone {sum(1 for e in rows if e["phone"]):>4} / {len(rows)}')

# Every district must have at least the core safety services.
print('\nper-district gaps:')
need = {'POLICE', 'HOSPITAL', 'WOMEN_CENTRE', 'HELP_CENTRE', 'FIRE_SERVICE'}
per = defaultdict(set)
for e in entries:
    per[e['district']].add(e['category'])
for d in sorted(centers):
    missing = need - per[d]
    if missing:
        print(f'  {d}: missing {sorted(missing)}')
else:
    covered = sum(1 for d in centers if need <= per[d])
    print(f'  {covered}/{len(centers)} districts have all five core categories')