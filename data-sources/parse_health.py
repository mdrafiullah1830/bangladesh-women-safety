import re, html, json

raw = open('/Users/mdrafiullah/womens safety/data-sources/health_complexes.html', encoding='utf-8', errors='ignore').read()
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', raw, re.S | re.I)
parsed = []
for r in rows:
    cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S | re.I)
    cells = [html.unescape(re.sub(r'<[^>]+>', '', c)).strip() for c in cells]
    cells = [c for c in cells if c]  # drop empty padding cells
    if len(cells) >= 4:
        district, upazila, name, mobile = cells[0], cells[1], cells[2], cells[3]
        if district.lower() == 'district':
            continue
        if re.match(r'^01\d{9}$', mobile.replace(' ', '').replace('-', '')):
            parsed.append({'district': district, 'upazila': upazila, 'name': name,
                           'mobile': mobile.replace(' ', '').replace('-', '')})

print('parsed rows:', len(parsed))
districts = sorted(set(p['district'] for p in parsed))
print('districts covered:', len(districts))
print('sample:', json.dumps(parsed[:5], ensure_ascii=False, indent=1))
dh = [p for p in parsed if 'Sadar' in p['upazila'] or 'District' in p['upazila']]
print('district/sadar hospital rows:', len(dh))
# report districts present in thana csv but missing here
import csv
thana_districts = set()
with open('/Users/mdrafiullah/womens safety/data-sources/thana_directory.csv', encoding='utf-8-sig') as f:
    for row in csv.DictReader(f):
        thana_districts.add(row['District'])
missing = sorted(thana_districts - set(districts))
print('districts missing from health list:', len(missing), missing)
json.dump(parsed, open('/Users/mdrafiullah/womens safety/data-sources/health_complexes.json', 'w'), ensure_ascii=False, indent=1)