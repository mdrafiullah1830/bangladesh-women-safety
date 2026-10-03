import re, html, json

raw = open('/Users/mdrafiullah/womens safety/data-sources/police_dmp.html', encoding='utf-8', errors='ignore').read()
raw = re.sub(r'<script.*?</script>', ' ', raw, flags=re.S | re.I)
raw = re.sub(r'<style.*?</style>', ' ', raw, flags=re.S | re.I)

# Track h2 sections to know which force each station belongs to
sections = []
pos = 0
current_section = None
cards = []
for m in re.finditer(r'<h2[^>]*>(.*?)</h2>|<article[^>]*>(.*?)</article>', raw, re.S | re.I):
    if m.group(1) is not None:
        current_section = html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
    else:
        block = m.group(2)
        h3 = re.search(r'<h3[^>]*>(.*?)</h3>', block, re.S | re.I)
        if not h3:
            continue
        name = html.unescape(re.sub(r'<[^>]+>', '', h3.group(1))).strip()
        fields = {}
        for fm in re.finditer(r'<strong>([^<]+):</strong>\s*([^<]*)', block):
            key = html.unescape(fm.group(1)).strip().lower()
            val = html.unescape(fm.group(2)).strip()
            fields[key] = val
        cards.append({'section': current_section, 'name': name, **fields})

print('cards:', len(cards))
from collections import Counter
print('sections:', Counter(c['section'] for c in cards))
print(json.dumps(cards[:4], ensure_ascii=False, indent=1))
# unique keys
keys = Counter()
for c in cards:
    for k in c:
        keys[k] += 1
print('keys:', keys)
json.dump(cards, open('/Users/mdrafiullah/womens safety/data-sources/police_cards.json', 'w'), ensure_ascii=False, indent=1)