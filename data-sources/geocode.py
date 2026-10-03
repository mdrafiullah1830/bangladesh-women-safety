"""Fill geocoded.json from OpenStreetMap via the Overpass API.

Why Overpass and not Nominatim: Nominatim rate-limits to ~1 req/s and started
returning HTTP 429 after a few dozen lookups, which is hopeless for ~1,300
entries. Overpass returns every police station / hospital / clinic in
Bangladesh in a handful of bulk queries, and each result already carries the
Bangladeshi name tag (`name:bn`) when OSM contributors have added it.

Reads  data-sources/geocode_todo.json   ("CATEGORY|District|Name")
Writes data-sources/geocoded.json       ({key: {lat, lng, name_bn}})

Matching is name-first, position-second: a candidate only wins if its
normalized name matches the entry's thana/hospital name, and the result must
land within 50 km of the district centre. Data (c) OpenStreetMap (ODbL).
"""
import json, math, os, re, time, unicodedata, urllib.parse, urllib.request
from difflib import SequenceMatcher

ROOT = '/Users/mdrafiullah/womens safety'
SRC = os.path.join(ROOT, 'data-sources')
OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]
UA = {'User-Agent': 'WomenSafetyBD/1.0 (educational non-commercial project; local dev)'}

# Wording that carries no location information - stripped before matching so
# "Sadar Police Station" and "Sadar Thana" collapse to the same key.
DROP_WORDS = {
    'police', 'station', 'thana', 'thanaposh', 'thanapor', 'upazila', 'union',
    'health', 'complex', 'hospital', 'medical', 'college', 'generl', 'general',
    'sadar', 'district', 'sub', 'center', 'centre', 'maternity', 'child',
    'children', 'institute', 'clinic', 'healthcenter', 'eye', 'ent', 'bari',
    'railway', 'rail', 'bus', 'jail', 'mental', 'branch', 'new', 'old', 'city',
}

CATEGORY_QUERY = {
    'POLICE': '(node["amenity"="police"](area.a);way["amenity"="police"](area.a);)',
    'HOSPITAL': '(node["amenity"~"^(hospital|clinic|doctors)$"](area.a);'
                'way["amenity"~"^(hospital|clinic|doctors)$"](area.a);)',
    # Settlements are the fallback: a thana or upazila health complex almost
    # always shares its name with the town it serves, and Bangladesh has ~6,000
    # named settlements mapped in OSM (most with a `name` in Bangla).
    'PLACE': '(node["place"~"^(city|town|village|suburb|quarter|neighbourhood|'
             'hamlet|locality)$"](area.a);)',
}
# How far from the district centre a hit may land before it is rejected.
MAX_KM = {'POLICE': 35, 'HOSPITAL': 35, 'PLACE': 45}


def haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def district_centers():
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        'build_directory_data', os.path.join(SRC, 'build_directory_data.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return {en: (lat, lng) for _, _, _, en, lat, lng in mod.DISTRICTS}


def overpass(query):
    body = urllib.parse.urlencode({'data': query})
    last = None
    for endpoint in OVERPASS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(endpoint, data=body.encode(), headers=UA)
                with urllib.request.urlopen(req, timeout=180) as r:
                    return json.loads(r.read().decode('utf-8'))
            except Exception as e:                      # noqa: BLE001
                last = e
                print(f'    ! {endpoint} attempt {attempt + 1}: {e}', flush=True)
                time.sleep(6 * (attempt + 1))
    raise last


def fetch(category):
    """Every OSM feature for a category inside Bangladesh, keyed by name.

    Hospitals are frequently mapped as ways (building footprints), so both
    nodes and ways are requested and ways fall back to their centroid.
    Results are cached in data-sources/osm_cache_<category>.json because the
    country-wide pull is slow and the data does not change between runs.
    """
    cache = os.path.join(SRC, f'osm_cache_{category.lower()}.json')
    if os.path.exists(cache):
        with open(cache, encoding='utf-8') as f:
            raw = json.load(f)
        print(f'  {category}: {len(raw)} features (cached)', flush=True)
        return raw
    q = (f'[out:json][timeout:180];area["ISO3166-1"="BD"][admin_level=2]->.a;'
         f'{CATEGORY_QUERY[category]};out center tags;')
    data = overpass(q)
    out = {}
    for el in data.get('elements', []):
        lat = el.get('lat') or (el.get('center') or {}).get('lat')
        lon = el.get('lon') or (el.get('center') or {}).get('lon')
        if lat is None or lon is None:
            continue
        tags = el.get('tags') or {}
        name = tags.get('name:en') or tags.get('name') or ''
        if not name.strip():
            continue
        out.setdefault(name.strip(), []).append({
            'lat': float(lat), 'lng': float(lon),
            'name': tags.get('name', ''), 'name_en': tags.get('name:en', ''),
        })
    with open(cache, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    print(f'  {category}: {len(out)} names fetched', flush=True)
    return out


def tokens(s):
    """Normalized name tokens with administrative noise removed."""
    s = unicodedata.normalize('NFKD', s or '').lower()
    s = s.replace('\u2019', "'").replace('’', "'")
    parts = re.split(r'[^a-z0-9]+', s)
    return [p for p in parts if p and p not in DROP_WORDS and len(p) > 2]


def stem(tok):
    """Light stemming so thana/Sadar and spelling variants collide."""
    for suf in ('sadar', 'kot', 'ganj', 'pur', 'hat', 'bari', 'nagar', 'khali'):
        if len(tok) > len(suf) + 3 and tok.endswith(suf):
            return tok[: -len(suf)]
    return tok


def canon(name):
    toks = {stem(t) for t in tokens(name)}
    return ''.join(sorted(toks))


def match(name, canon_map, center, max_km):
    """Best OSM hit for a thana/hospital name, or None.

    Scores candidates in three tiers - exact canonical name, containment, then
    token overlap - and returns the highest-tier candidate that also sits
    within `max_km` of the district centre.
    """
    q = canon(name)
    q_tokens = set(tokens(name))
    if not q and not q_tokens:
        return None

    def ok(h):
        if not center:
            return True
        return haversine_km(center[0], center[1], h['lat'], h['lng']) <= max_km

    for tier in ('exact', 'contains', 'overlap'):
        for key, hits in canon_map.items():
            if tier == 'exact' and key != q:
                continue
            if tier == 'contains':
                # Reject a bare prefix match: "Mathbaria" must not resolve to
                # "Mathbaria North", which is a different station.
                if len(q) < 5 or len(key) < 5:
                    continue
                if q in key and len(key) > len(q) + 2:
                    continue
                if key in q and len(q) > len(key) + 2:
                    continue
                if not (q in key or key in q):
                    continue
            if tier == 'overlap':
                t = set(re.findall(r'[a-z]{3,}', key))
                if not t or len(q_tokens & t) / len(q_tokens | t) < 0.5:
                    continue
            for h in hits:
                if ok(h):
                    return h
    return fuzzy_match(q, canon_map, ok)


def clean_bangla(s):
    """Keep only the Bangladeshi half of a mixed-script OSM name.

    OSM tags are often "Patiya Crossing Highway Police Station পটিয়া ক্রসিং
    হাইওয়ে পুলিশ ফাঁড়ি", and the Latin prefix would otherwise be rendered as
    "Name English Nameবাংলা" in the Bangla UI.
    """
    if not s:
        return None
    bangla = re.sub(r'[A-Za-z0-9/.,:()\-_]+', ' ', s)
    bangla = re.sub(r'\s+', ' ', bangla).strip(' -/')
    return bangla or None


def fuzzy_match(q, canon_map, ok):
    """Last resort for transliteration drift (Hizla vs Hijla, Kalapul vs Kallapul).

    Only fires when a candidate is within a couple of edits *and* the same
    length, so it cannot pull in a genuinely different place name.
    """
    if len(q) < 5:
        return None
    best, best_score = None, 0.0
    for key, hits in canon_map.items():
        if not key or abs(len(key) - len(q)) > 2:
            continue
        score = SequenceMatcher(None, q, key).ratio()
        if score > best_score:
            best, best_score = hits, score
    if best and best_score >= 0.88:
        for h in best:
            if ok(h):
                return h
    return None


def main():
    centers = district_centers()
    todo_path = os.path.join(SRC, 'geocode_todo.json')
    todo = json.load(open(todo_path))
    geo_path = os.path.join(SRC, 'geocoded.json')
    done = json.load(open(geo_path)) if os.path.exists(geo_path) else {}

    print('  loading OpenStreetMap data ...', flush=True)
    sources = {}
    for category in ('POLICE', 'HOSPITAL', 'PLACE'):
        if not any(k.startswith(category + '|') for k in todo) and category != 'PLACE':
            continue
        canon_map = {}
        for name, hits in fetch(category).items():
            canon_map.setdefault(canon(name), []).extend(hits)
        sources[category] = canon_map
        print(f'  {category}: {len(canon_map)} canonical names', flush=True)

    # Try the exact category first, then the opposite one (a health complex is
    # sometimes mapped as a clinic and vice versa), then the settlement itself.
    added = kept = miss = 0
    by_source = {'POLICE': 0, 'HOSPITAL': 0, 'PLACE': 0}
    still = []
    for key in todo:
        if key in done:
            kept += 1
            continue
        category, district, name = key.split('|', 2)
        center = centers.get(district)
        hit, src = None, None
        for candidate in (category, 'HOSPITAL' if category == 'POLICE' else 'POLICE', 'PLACE'):
            found = match(name, sources.get(candidate, {}), center, MAX_KM[candidate])
            if found:
                hit, src = found, candidate
                break
        if hit:
            out = {'lat': hit['lat'], 'lng': hit['lng'], 'source': src}
            bn = clean_bangla(hit.get('name'))
            if bn and re.search('[\u0980-\u09ff]', bn):
                out['name_bn'] = bn
            done[key] = out
            added += 1
            by_source[src] += 1
        else:
            miss += 1
            still.append(key)

    json.dump(done, open(geo_path, 'w'), ensure_ascii=False)
    print(f'\nresolved: +{added} (kept {kept}, unresolved {miss}, total {len(done)})')
    for src, n in by_source.items():
        print(f'  via {src}: {n}')

    # Keep the todo list honest: these entries fall back to district centres.
    json.dump(still, open(todo_path, 'w'), ensure_ascii=False)
    print(f'remaining without exact coordinates: {len(still)}')
    for key in still[:15]:
        print('   -', key)


if __name__ == '__main__':
    main()