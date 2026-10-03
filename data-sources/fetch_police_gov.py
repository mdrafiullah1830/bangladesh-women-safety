"""Crawl police.gov.bd's official unit-contact directory.

The site exposes its whole organisational chart over a JSON endpoint used by
the "Unit Contact" page:

    GET https://www.police.gov.bd/en/units          -> top level (organograms)
    GET https://www.police.gov.bd/en/units/{id}     -> children, or an
                                                        organogramContact HTML
                                                        table at the leaves

Walking it yields the authoritative published numbers for every district
police office, every metropolitan control room and every Women & Child Help
Desk - all of them far more current than the press-compiled lists used
elsewhere in this pipeline.

Writes data-sources/police_gov.json  -> [{path, designation, mobile, phone, fax, email}]
"""
import html, json, os, re, time, urllib.request

ROOT = '/Users/mdrafiullah/womens safety'
SRC = os.path.join(ROOT, 'data-sources')
OUT = os.path.join(SRC, 'police_gov.json')
BASE = 'https://www.police.gov.bd/en/units'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://www.police.gov.bd/en/unitContact',
    'Accept': 'application/json',
}

ROOTS = [1, 2, 36, 130, 155, 156, 157, 158, 175, 176, 182, 185, 191,
         215, 216, 221, 228, 233, 145]


def get(node_id):
    req = urllib.request.Request(f'{BASE}/{node_id}', headers=HEADERS)
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode('utf-8'))


def strip_tags(s):
    s = re.sub(r'<br\s*/?>', ' / ', s, flags=re.I)
    return html.unescape(re.sub(r'<[^>]+>', '', s)).replace('\xa0', ' ').strip()


def parse_table(table_html, path):
    """Turn one organogram table into contact rows."""
    rows = []
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, flags=re.S | re.I):
        cells = [strip_tags(c) for c in re.findall(r'<td[^>]*>(.*?)</td>', tr, flags=re.S | re.I)]
        if len(cells) < 2:
            continue
        designation, mobile, phone = cells[0], cells[1], cells[2] if len(cells) > 2 else ''
        fax = cells[3] if len(cells) > 3 else ''
        mail = cells[4] if len(cells) > 4 else ''
        if designation.lower() in ('designation', '') or not designation:
            continue
        rows.append({
            'path': path, 'designation': designation,
            'mobile': mobile if re.search(r'\d', mobile) else None,
            'phone': phone if re.search(r'\d', phone) else None,
            'fax': fax if re.search(r'\d', fax) else None,
            'email': mail if '@' in mail else None,
        })
    return rows


def walk(node_id, path, depth=0, seen=None, out=None):
    """Depth-first walk; leaves return an HTML table, branches return children."""
    seen = seen if seen is not None else set()
    out = out if out is not None else []
    if node_id in seen or depth > 6:
        return out
    seen.add(node_id)
    try:
        data = get(node_id)
    except Exception as e:                                   # noqa: BLE001
        print(f'  ! {path}: {e}', flush=True)
        return out
    time.sleep(0.4)

    kids = data.get('units') or {}
    if kids:
        print(f'  {"  " * depth}{path} -> {len(kids)} sub-units', flush=True)
        for child in kids.values():
            walk(child['id'], f'{path} / {child["name"]}', depth + 1, seen, out)
        return out

    table = data.get('unitContact')
    if table:
        rows = parse_table(table, path)
        out.extend(rows)
        print(f'  {"  " * depth}{path} -> {len(rows)} contacts', flush=True)
    return out


def main():
    print('crawling police.gov.bd unit contacts ...', flush=True)
    rows = []
    seen = set()
    for root in ROOTS:
        try:
            name = get(root).get('units', {}).get(str(root))
        except Exception:                                     # noqa: BLE001
            name = None
        label = name['name'] if name else f'root-{root}'
        walk(root, label, 0, seen, rows)

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    with_phone = sum(1 for r in rows if r['mobile'] or r['phone'])
    print(f'\ncontacts: {len(rows)} ({with_phone} with a number)')
    print(f'written: {OUT}')


if __name__ == '__main__':
    main()