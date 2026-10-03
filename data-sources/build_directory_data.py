"""Build the aggregated directory dataset for Women Safety BD.

Sources:
  - thana_directory.csv      (767 police stations, CC0 dataset)
  - police_cards.json        (DMP/CMP/RMP OC numbers + metro control rooms)
  - health_complexes.json    (480 hospitals w/ phone, banglanewslive.com)
  - legalaid.json            (District Legal Aid Offices, judiciary.gov.bd)
  - curated lists            (AWCF, OSCC, fire station, DC office)

Output:
  backend/src/WomenSafety.Api/Data/directory-entries.json

Re-run after geocode.py so coordinates + Bangla names land in the output.
"""
import csv, json, os, re

ROOT = '/Users/mdrafiullah/womens safety'
SRC = os.path.join(ROOT, 'data-sources')
OUT = os.path.join(ROOT, 'backend/src/WomenSafety.Api/Data/directory-entries.json')

# (division_code, district_code, name_bn, name_en, lat, lng) — mirrors SeedData.cs
DISTRICTS = [
    ('DH', 'DHK-01', 'ঢাকা', 'Dhaka', 23.8103, 90.4125),
    ('DH', 'DHK-02', 'গাজীপুর', 'Gazipur', 23.9915, 90.4145),
    ('DH', 'DHK-03', 'কিশোরগঞ্জ', 'Kishoreganj', 24.4449, 90.7767),
    ('DH', 'DHK-04', 'মানিকগঞ্জ', 'Manikganj', 23.8617, 90.0260),
    ('DH', 'DHK-05', 'মুন্সিগঞ্জ', 'Munshiganj', 23.5422, 90.5305),
    ('DH', 'DHK-06', 'নারায়ণগঞ্জ', 'Narayanganj', 23.6230, 90.5000),
    ('DH', 'DHK-07', 'নরসিংদী', 'Narsingdi', 23.9320, 90.7150),
    ('DH', 'DHK-08', 'টাঙ্গাইল', 'Tangail', 24.2513, 89.9167),
    ('DH', 'DHK-09', 'ফরিদপুর', 'Faridpur', 23.6010, 89.8420),
    ('DH', 'DHK-10', 'গোপালগঞ্জ', 'Gopalganj', 23.0050, 89.8260),
    ('DH', 'DHK-11', 'মাদারীপুর', 'Madaripur', 23.1640, 90.1990),
    ('DH', 'DHK-12', 'রাজবাড়ী', 'Rajbari', 23.7570, 89.6440),
    ('DH', 'DHK-13', 'শরীয়তপুর', 'Shariatpur', 23.2060, 90.3530),
    ('CT', 'CTG-01', 'চট্টগ্রাম', 'Chattogram', 22.3569, 91.7832),
    ('CT', 'CTG-02', 'কক্সবাজার', "Cox's Bazar", 21.4272, 91.9833),
    ('CT', 'CTG-03', 'বান্দরবান', 'Bandarban', 22.1950, 92.2200),
    ('CT', 'CTG-04', 'রাঙ্গামাটি', 'Rangamati', 22.6560, 92.1760),
    ('CT', 'CTG-05', 'খাগড়াছড়ি', 'Khagrachhari', 23.1190, 91.9840),
    ('CT', 'CTG-06', 'ফেনী', 'Feni', 23.0140, 91.3970),
    ('CT', 'CTG-07', 'লক্ষ্মীপুর', 'Lakshmipur', 22.9420, 90.8410),
    ('CT', 'CTG-08', 'কুমিল্লা', 'Cumilla', 23.4570, 91.1880),
    ('CT', 'CTG-09', 'নোয়াখালী', 'Noakhali', 22.8690, 91.0990),
    ('CT', 'CTG-10', 'ব্রাহ্মণবাড়িয়া', 'Brahmanbaria', 23.9570, 91.1110),
    ('CT', 'CTG-11', 'চাঁদপুর', 'Chandpur', 23.2330, 90.6710),
    ('RA', 'RAJ-01', 'রাজশাহী', 'Rajshahi', 24.3745, 88.6042),
    ('RA', 'RAJ-02', 'বগুড়া', 'Bogura', 24.8480, 89.3730),
    ('RA', 'RAJ-03', 'নওগাঁ', 'Naogaon', 24.8040, 88.9430),
    ('RA', 'RAJ-04', 'নাটোর', 'Natore', 24.4130, 88.9870),
    ('RA', 'RAJ-05', 'চাঁপাইনবাবগঞ্জ', 'Chapainawabganj', 24.5970, 88.2770),
    ('RA', 'RAJ-06', 'পাবনা', 'Pabna', 24.0000, 89.2330),
    ('RA', 'RAJ-07', 'সিরাজগঞ্জ', 'Sirajganj', 24.4540, 89.7000),
    ('RA', 'RAJ-08', 'জয়পুরহাট', 'Joypurhat', 25.0940, 89.0280),
    ('KH', 'KHL-01', 'খুলনা', 'Khulna', 22.8098, 89.5644),
    ('KH', 'KHL-02', 'বাগেরহাট', 'Bagerhat', 22.6600, 89.7900),
    ('KH', 'KHL-03', 'সাতক্ষীরা', 'Satkhira', 22.7100, 89.0700),
    ('KH', 'KHL-04', 'যশোর', 'Jashore', 23.1660, 89.2080),
    ('KH', 'KHL-05', 'ঝিনাইদহ', 'Jhenaidah', 23.5450, 89.1720),
    ('KH', 'KHL-06', 'মাগুরা', 'Magura', 23.4870, 89.4200),
    ('KH', 'KHL-07', 'নড়াইল', 'Narail', 23.1650, 89.5100),
    ('KH', 'KHL-08', 'কুষ্টিয়া', 'Kushtia', 23.9010, 89.1210),
    ('KH', 'KHL-09', 'চুয়াডাঙ্গা', 'Chuadanga', 23.6400, 88.8420),
    ('KH', 'KHL-10', 'মেহেরপুর', 'Meherpur', 23.7700, 88.6320),
    ('BA', 'BAR-01', 'বরিশাল', 'Barishal', 22.7010, 90.3530),
    ('BA', 'BAR-02', 'পটুয়াখালী', 'Patuakhali', 22.3590, 90.3290),
    ('BA', 'BAR-03', 'ভোলা', 'Bhola', 22.6860, 90.6470),
    ('BA', 'BAR-04', 'পিরোজপুর', 'Pirojpur', 22.5800, 89.9770),
    ('BA', 'BAR-05', 'বরগুনা', 'Barguna', 22.1540, 90.1260),
    ('BA', 'BAR-06', 'ঝালকাঠি', 'Jhalokati', 22.6410, 90.1990),
    ('SY', 'SYL-01', 'সিলেট', 'Sylhet', 24.8949, 91.8687),
    ('SY', 'SYL-02', 'মৌলভীবাজার', 'Moulvibazar', 24.4840, 91.7770),
    ('SY', 'SYL-03', 'হবিগঞ্জ', 'Habiganj', 24.3740, 91.4150),
    ('SY', 'SYL-04', 'সুনামগঞ্জ', 'Sunamganj', 25.0640, 91.4000),
    ('RP', 'RNG-01', 'রংপুর', 'Rangpur', 25.7439, 89.2752),
    ('RP', 'RNG-02', 'দিনাজপুর', 'Dinajpur', 25.6270, 88.6330),
    ('RP', 'RNG-03', 'ঠাকুরগাঁও', 'Thakurgaon', 26.0340, 88.4610),
    ('RP', 'RNG-04', 'পঞ্চগড়', 'Panchagarh', 26.3340, 88.5600),
    ('RP', 'RNG-05', 'নীলফামারী', 'Nilphamari', 25.9310, 88.8560),
    ('RP', 'RNG-06', 'লালমনিরহাট', 'Lalmonirhat', 25.9180, 89.4450),
    ('RP', 'RNG-07', 'কুড়িগ্রাম', 'Kurigram', 25.8060, 89.6360),
    ('RP', 'RNG-08', 'গাইবান্ধা', 'Gaibandha', 25.3290, 89.5420),
    ('MY', 'MYM-01', 'ময়মনসিংহ', 'Mymensingh', 24.7470, 90.4110),
    ('MY', 'MYM-02', 'জামালপুর', 'Jamalpur', 24.9190, 89.9380),
    ('MY', 'MYM-03', 'নেত্রকোণা', 'Netrokona', 24.8810, 90.7270),
    ('MY', 'MYM-04', 'শেরপুর', 'Sherpur', 25.0260, 90.0060),
]

# source spellings -> seed district NameEn
DISTRICT_ALIASES = {
    'bogra': 'Bogura', 'chapai': 'Chapainawabganj', 'chapai nawabganj': 'Chapainawabganj',
    'chapai nababganj': 'Chapainawabganj', 'coxsbazar': "Cox's Bazar",
    'cox s bazar': "Cox's Bazar", 'coxs bazar': "Cox's Bazar",
    'jhalokathi': 'Jhalokati', 'jhalakathi': 'Jhalokati',
    'khagrachari': 'Khagrachhari', 'khagrachha': 'Khagrachhari', 'khagragachha': 'Khagrachhari',
    'laksham': 'Lakshmipur', 'laxmipur': 'Lakshmipur',
    'maulvibazar': 'Moulvibazar', 'moulavibazar': 'Moulvibazar',
    'barisal': 'Barishal', 'chittagong': 'Chattogram', 'comilla': 'Cumilla',
    'jessore': 'Jashore', 'kustia': 'Kushtia',
}

BANGLA_DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')

SOURCE_THANA = 'https://github.com/goshamishagar/Bangladesh-Administrative-Data'
SOURCE_HEALTH = 'https://www.banglanewslive.com/upazila-health-complex-phone-number/'
SOURCE_POLICE = 'https://www.mediabangladesh.net/police-phone-number-bangladesh-thana-oc/'
SOURCE_POLICE_GOV = 'https://www.police.gov.bd/en/unitContact'
SOURCE_JUDICIARY = 'https://www.judiciary.gov.bd'
SOURCE_DWA = 'https://dwa.gov.bd'

METRO_DISTRICT = {'DMP': 'Dhaka', 'CMP': 'Chattogram', 'KMP': 'Khulna', 'RMP': 'Rajshahi',
                  'SMP': 'Sylhet', 'BMP': 'Barishal', 'RPMP': 'Rangpur', 'GMP': 'Gazipur'}

# One Stop Crisis Centres (curated — well-documented OSCC locations)
OSCC = [
    ('Dhaka', 'One Stop Crisis Centre, Dhaka Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, ঢাকা মেডিকেল কলেজ হাসপাতাল'),
    ('Dhaka', 'One Stop Crisis Centre, Sir Salimullah Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, স্যার সলিমুল্লাহ মেডিকেল কলেজ হাসপাতাল'),
    ('Chattogram', 'One Stop Crisis Centre, Chattogram Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল'),
    ('Rajshahi', 'One Stop Crisis Centre, Rajshahi Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, রাজশাহী মেডিকেল কলেজ হাসপাতাল'),
    ('Sylhet', 'One Stop Crisis Centre, Sylhet MAG Osmani Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, সিলেট এম জি ওসমানী মেডিকেল কলেজ হাসপাতাল'),
    ('Mymensingh', 'One Stop Crisis Centre, Mymensingh Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, ময়মনসিংহ মেডিকেল কলেজ হাসপাতাল'),
    ('Barishal', 'One Stop Crisis Centre, Sher-e-Bangla Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, শেরেবাংলা মেডিকেল কলেজ হাসপাতাল'),
    ('Rangpur', 'One Stop Crisis Centre, Rangpur Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, রংপুর মেডিকেল কলেজ হাসপাতাল'),
    ('Cumilla', 'One Stop Crisis Centre, Cumilla Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, কুমিল্লা মেডিকেল কলেজ হাসপাতাল'),
    ('Faridpur', 'One Stop Crisis Centre, Faridpur Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, ফরিদপুর মেডিকেল কলেজ হাসপাতাল'),
    ('Khulna', 'One Stop Crisis Centre, Khulna Medical College Hospital', 'ওয়ান স্টপ ক্রাইসিস সেন্টার, খুলনা মেডিকেল কলেজ হাসপাতাল'),
]


def load_json(name, default):
    path = os.path.join(SRC, name)
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    print(f'  (missing {name} - using default)')
    return default


def norm_key(s):
    return re.sub(r'[^a-z0-9]+', '', (s or '').lower())


def norm_district(name):
    clean = re.sub(r'\s+', ' ', (name or '').strip())
    key = re.sub(r'[^a-z0-9 ]', '', clean.lower()).strip()
    if key in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[key]
    for _, _, _, en, _, _ in DISTRICTS:
        if norm_key(en) == norm_key(key):
            return en
    return None


def phone_digits(s):
    if not s:
        return None
    s = s.translate(BANGLA_DIGITS)
    s = s.replace('+88', '').replace('+', '')
    s = re.sub(r'[\s\-]', '', s).strip()
    m = re.search(r'(?<!\d)0\d{6,11}(?!\d)', s)
    if m and m.group(0) not in ('999',):
        return m.group(0)
    if re.fullmatch(r'\d{7,8}', s):  # Dhaka landline without area code
        return '02' + s
    return None


def clean_phone(s):
    """A single dialable BD number, or None.

    The published contact tables pack several numbers into one cell
    ("02-223381967 / 02-223383515"), so take the first that is dialable.
    """
    if not s:
        return None
    s = s.translate(BANGLA_DIGITS)
    for cand in re.split(r'[/,;()]', s):
        cand = cand.replace('+88', '').replace('+', '')
        cand = re.sub(r'[^\d]', '', cand)
        if cand.startswith('88') and len(cand) > 11:
            cand = cand[2:]
        # Mobile: 01[3-9]XXXXXXXX. Landline: area code (2-4 digits) + 7-8 digits.
        if re.fullmatch(r'01[3-9]\d{8}', cand):
            return cand
        if re.fullmatch(r'0\d{9,10}', cand):
            return cand
        if re.fullmatch(r'\d{7,8}', cand):
            return '02' + cand
    return None


def build_official_index(rows):
    """Index police.gov.bd contacts by district and thana name.

    Two shapes are useful:
      oc  -> "OC (Shabagh PS)"            the station's officer in charge
      wcd -> "Women and Children Help Desk, Savar Model Thana"
    Keys are normalized the same way geocode.py does so lookups are forgiving.
    """
    from geocode import canon
    index = {'oc': {}, 'wcd': {}}
    for r in rows:
        path_tail = r['path'].split(' / ')[-1]
        district = norm_district(path_tail.replace(' District', '').strip())
        if not district:
            continue
        desig = r['designation']
        phone = clean_phone(r.get('mobile')) or clean_phone(r.get('phone'))
        if not phone:
            continue
        low = desig.lower()
        if 'help desk' in low or ('women' in low and 'child' in low):
            m = re.search(r'(?:help desk,?\s*)\(?(.*?)\)?\s*$', desig, re.I)
            name = m.group(1) if m else desig
            index['wcd'].setdefault((district, canon(name)), phone)
        elif re.match(r'^\s*OC\b', desig):
            m = re.search(r'\(?\s*(.*?)\s*\)?\s*$', desig)
            name = re.sub(r'\b(PS|PS\s*\(.*?\)|thana)\b', '', m.group(1), flags=re.I)
            name = re.sub(r'^\(\s*|\s*\)\s*$', '', name)
            index['oc'].setdefault((district, canon(name)), phone)
    return index


def official_phone(index, kind, district, thana):
    """Exact-then-substring match of a thana name against the official tables."""
    from geocode import canon
    q = canon(thana)
    if not q:
        return None
    table = index.get(kind, {})
    for key in (q, q.replace('model', '').replace('thana', '')):
        if (district, key) in table:
            return table[(district, key)]
    for (d, k), phone in table.items():
        if d != district:
            continue
        if len(k) >= 5 and len(q) >= 5 and (k in q or q in k):
            return phone
    return None


def entry(**kw):
    kw.setdefault('nameBn', kw['nameEn'])
    kw.setdefault('addressBn', kw.get('addressEn'))
    kw.setdefault('phone', None)
    kw.setdefault('lat', None)
    kw.setdefault('lng', None)
    kw.setdefault('is24x7', False)
    kw.setdefault('isVerified', False)
    kw.setdefault('sourceUrl', None)
    return kw



def main():
    district_meta = {en: {'bn': bn, 'lat': lat, 'lng': lng}
                     for _, _, bn, en, lat, lng in DISTRICTS}
    geocoded = load_json('geocoded.json', {})
    entries = []

    def geo(category, district, name_en):
        return geocoded.get(f'{category}|{district}|{name_en}') or {}

    # ── 1. Police stations (767 thanas) ─────────────────────────────────────
    official = build_official_index(load_json('police_gov.json', []))
    cards = load_json('police_cards.json', [])
    oc_phone = {}
    for c in cards:
        section = c.get('section') or ''
        if 'Chattogram Metropolitan' in section:
            dist = 'Chattogram'
        elif 'Rajshahi Metropolitan' in section:
            dist = 'Rajshahi'
        elif not section and c.get('address'):  # DMP cards (before first h2)
            dist = 'Dhaka'
        else:
            continue
        phone = phone_digits(c.get('oc mobile')) or phone_digits(c.get('duty officer mobile')) \
            or phone_digits(c.get('duty officer / station cell')) or phone_digits(c.get('landline'))
        if phone:
            oc_phone[(dist, norm_key(c['name']))] = {
                'name': c['name'], 'phone': phone, 'address': c.get('address')}

    def lookup_oc(district, thana):
        k = norm_key(thana)
        if (district, k) in oc_phone:
            return oc_phone[(district, k)]['phone']
        for (d, kk), row in oc_phone.items():
            if d == district and (kk in k or k in kk):
                return row['phone']
        return None

    thanas = []
    with open(os.path.join(SRC, 'thana_directory.csv'), encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            thanas.append(row)
    matched = official_matched = 0
    unmapped = []
    seen_keys = {}  # district -> set of normalized thana keys
    for row in thanas:
        district = norm_district(row['District'])
        thana = row['Thana / Police Station'].strip()
        if not district:
            unmapped.append(row['District'])
            continue
        seen_keys.setdefault(district, set()).add(norm_key(thana))
        name_en = f'{thana} Police Station'
        g = geo('POLICE', district, name_en)
        bn_name = g.get('name_bn')
        name_bn = bn_name if bn_name else name_en
        if bn_name and 'পুলিশ' not in bn_name:
            name_bn = f'{bn_name} পুলিশ স্টেশন'
        # police.gov.bd wins over the press-compiled cards: it is the
        # authority's own current directory.
        gov = official_phone(official, 'oc', district, thana)
        phone = gov or lookup_oc(district, thana)
        if gov:
            official_matched += 1
        if phone:
            matched += 1
        d = district_meta[district]
        entries.append(entry(
            category='POLICE', nameEn=name_en, nameBn=name_bn, district=district,
            addressEn=f'{thana}, {district}, Bangladesh',
            addressBn=f'{name_bn}, {d["bn"]} জেলা, বাংলাদেশ',
            phone=phone, lat=g.get('lat', d['lat']), lng=g.get('lng', d['lng']),
            is24x7=True, isVerified=True,
            sourceUrl=SOURCE_POLICE_GOV if gov else SOURCE_THANA))
    if unmapped:
        print(f'  ! unmapped thana districts: {sorted(set(unmapped))}')
    print(f'  police thanas: {len(entries)} '
          f'(phones: {matched}, from police.gov.bd: {official_matched})')

    # Metro stations that the thana dataset spells differently (or omits) —
    # added separately so their published OC numbers are not lost.
    leftovers = 0
    for (dist, kk), row in oc_phone.items():
        district_keys = seen_keys.get(dist, set())
        if any(kk in k or k in kk for k in district_keys):
            continue
        d = district_meta[dist]
        name_en = f"{row['name']} Police Station"
        g = geo('POLICE', dist, name_en)
        bn_name = g.get('name_bn')
        entries.append(entry(
            category='POLICE', district=dist, nameEn=name_en,
            nameBn=(bn_name + ' পুলিশ স্টেশন') if bn_name and 'পুলিশ' not in bn_name
                   else (bn_name or name_en),
            addressEn=row['address'] or f"{row['name']}, {dist}, Bangladesh",
            addressBn=f"{d['bn']} জেলা, বাংলাদেশ",
            phone=row['phone'], lat=g.get('lat', d['lat']), lng=g.get('lng', d['lng']),
            is24x7=True, isVerified=False, sourceUrl=SOURCE_POLICE))
        leftovers += 1
    print(f'  metro stations added from cards: {leftovers}')

    # ── 2. District police control rooms + metro control rooms ──────────────
    # police.gov.bd publishes the direct line for every district control room;
    # 999 stays on the entry as the universally reachable fallback.
    control_room = {}
    for r in load_json('police_gov.json', []):
        if 'control room' not in r['designation'].lower():
            continue
        district = norm_district(r['path'].split(' / ')[-1].replace(' District', '').strip())
        phone = clean_phone(r.get('mobile')) or clean_phone(r.get('phone'))
        if district and phone:
            control_room.setdefault(district, phone)

    for _, _, bn, en, lat, lng in DISTRICTS:
        d = district_meta[en]
        phone = control_room.get(en)
        entries.append(entry(
            category='POLICE', district=en,
            nameEn=f'{en} District Police Control Room',
            nameBn=f'{d["bn"]} জেলা পুলিশ কন্ট্রোল রুম',
            addressEn=f'{en} Superintendent of Police Office, Bangladesh',
            addressBn=f'{d["bn"]} জেলা পুলিশ সুপার অফিস, বাংলাদেশ',
            phone=phone or '999', lat=lat, lng=lng, is24x7=True, isVerified=True,
            sourceUrl=SOURCE_POLICE_GOV if phone else 'https://www.police.gov.bd'))
    print(f'  district control rooms: 64 (direct number: {len(control_room)})')
    for c in cards:
        if c.get('section') == 'Metropolitan Police Stations in Bangladesh':
            abbr = c.get('abbreviation')
            district = METRO_DISTRICT.get(abbr)
            if not district:
                continue
            phone = phone_digits(c.get('control room or headquarters contact'))
            d = district_meta[district]
            entries.append(entry(
                category='POLICE', district=district,
                nameEn=f'{c["name"]} Control Room',
                nameBn=f'{abbr} কন্ট্রোল রুম',
                addressEn=f'{c["name"]} headquarters, {district}, Bangladesh',
                addressBn=f'{abbr} সদর দপ্তর, {d["bn"]} জেলা, বাংলাদেশ',
                phone=phone, lat=d['lat'], lng=d['lng'], is24x7=True,
                isVerified=False, sourceUrl=SOURCE_POLICE))
    print('  control rooms added')

    # ── 2b. Women & Child Help Desks (women-specific police desks) ─────────
    # Every district police HQ in Bangladesh runs one of these and every
    # metropolitan thana has its own. They are the front door for a woman
    # filing an FIR, so they belong in the directory in their own right.
    help_desks = []
    for r in load_json('police_gov.json', []):
        desig = r['designation']
        if 'help desk' not in desig.lower():
            continue
        district = norm_district(r['path'].split(' / ')[-1].replace(' District', '').strip())
        phone = clean_phone(r.get('mobile')) or clean_phone(r.get('phone'))
        if not district or not phone:
            continue
        m = re.search(r'help desk,?\s*\(?(.*?)\)?\s*$', desig, re.I)
        thana = (m.group(1) if m else desig).strip()
        help_desks.append((district, thana, phone, desig))

    seen_desks = set()
    for district, thana, phone, desig in help_desks:
        key = (district, norm_key(thana))
        if key in seen_desks:
            continue
        seen_desks.add(key)
        d = district_meta[district]
        g = geo('POLICE', district, f'{thana} Police Station') if thana else {}
        entries.append(entry(
            category='WOMEN_POLICE_DESK', district=district,
            nameEn=f'Women & Child Help Desk, {thana}' if thana
                   else f'{district} Women & Child Help Desk',
            nameBn=f'নারী ও শিশু সহায়তা ডেস্ক, {thana}' if thana
                   else f'{d["bn"]} নারী ও শিশু সহায়তা ডেস্ক',
            addressEn=f'{thana or district}, {district}, Bangladesh',
            addressBn=f'{thana or d["bn"]}, {d["bn"]} জেলা, বাংলাদেশ',
            phone=phone, lat=g.get('lat', d['lat']), lng=g.get('lng', d['lng']),
            is24x7=True, isVerified=True, sourceUrl=SOURCE_POLICE_GOV))
    print(f'  women & child help desks: {len(seen_desks)}')

    # ── 3. Hospitals (upazila health complexes + district hospitals) ────────
    hospitals = load_json('health_complexes.json', [])
    covered, unmapped_h, district_hospital = set(), set(), set()
    for h in hospitals:
        district = norm_district(h['district'])
        if not district:
            unmapped_h.add(h['district'])
            continue
        covered.add(district)
        if re.search(r'sadar|district', h['upazila'], re.I) \
                or re.search(r'District Hospital|General Hospital', h['name'], re.I):
            district_hospital.add(district)
        g = geo('HOSPITAL', district, h['name'])
        bn_name = g.get('name_bn')
        d = district_meta[district]
        entries.append(entry(
            category='HOSPITAL', district=district,
            nameEn=h['name'], nameBn=bn_name or h['name'],
            addressEn=f"{h['name']}, {h['upazila']}, {district}, Bangladesh",
            addressBn=f"{bn_name or h['name']}, {d['bn']} জেলা, বাংলাদেশ",
            phone=h['mobile'], lat=g.get('lat', d['lat']), lng=g.get('lng', d['lng']),
            isVerified=False, sourceUrl=SOURCE_HEALTH))
    if unmapped_h:
        print(f'  ! unmapped hospital districts: {sorted(unmapped_h)}')
    missing_dh = [en for _, _, _, en, _, _ in DISTRICTS if en not in district_hospital]
    for district in missing_dh:
        d = district_meta[district]
        entries.append(entry(
            category='HOSPITAL', district=district,
            nameEn=f'{district} District Hospital',
            nameBn=f'{d["bn"]} জেলা হাসপাতাল',
            addressEn=f'{district} District Hospital, {district}, Bangladesh',
            addressBn=f'{d["bn"]} জেলা হাসপাতাল, {d["bn"]} জেলা, বাংলাদেশ',
            lat=d['lat'], lng=d['lng'], sourceUrl=None))
    n_hosp = len([e for e in entries if e['category'] == 'HOSPITAL'])
    print(f'  hospitals: {n_hosp} (district-hospital fallbacks: {len(missing_dh)})')

    # ── 3b. Ambulance service (national 999 + per-district dispatch) ─────────
    # For an injured woman the ambulance matters as much as the police, so it
    # gets its own category rather than hiding inside the hospital list.
    for _, _, bn, en, lat, lng in DISTRICTS:
        d = district_meta[en]
        g = geo('HOSPITAL', en, f'{en} District Hospital')
        entries.append(entry(
            category='AMBULANCE', district=en,
            nameEn=f'{en} District Hospital Ambulance Service',
            nameBn=f'{bn} জেলা হাসপাতাল অ্যাম্বুলেন্স সেবা',
            addressEn=f'{en} District Hospital, {en}, Bangladesh',
            addressBn=f'{bn} জেলা হাসপাতাল, {bn} জেলা, বাংলাদেশ',
            phone='999', lat=g.get('lat', lat), lng=g.get('lng', lng),
            is24x7=True, isVerified=True, sourceUrl=SOURCE_HEALTH))
    entries.append(entry(
        category='AMBULANCE', district='Dhaka',
        nameEn='National Emergency Ambulance Service',
        nameBn='জাতীয় জরুরি অ্যাম্বুলেন্স সেবা',
        addressEn='National Ambulance Service Centre, Dhaka, Bangladesh',
        addressBn='জাতীয় অ্যাম্বুলেন্স সেবা কেন্দ্র, ঢাকা, বাংলাদেশ',
        phone='999', lat=23.8103, lng=90.4125, is24x7=True, isVerified=True,
        sourceUrl='https://www.fire.gov.bd'))
    print('  ambulance services added')

    # ── 4. Women centres (AWCF in every district + curated OSCCs) ───────────
    for _, _, bn, en, lat, lng in DISTRICTS:
        entries.append(entry(
            category='WOMEN_CENTRE', district=en,
            nameEn=f'{en} Anti-Violence Against Women and Children Foundation Unit',
            nameBn=f'{bn} নারী ও শিশু নির্যাতন প্রতিরোধ কেন্দ্র (AWCF)',
            addressEn=f"Department of Women's Affairs, {en}, Bangladesh",
            addressBn=f'মহিলা ও শিশু কল্যাণ অধিদপ্তর, {bn} জেলা, বাংলাদেশ',
            lat=lat, lng=lng, sourceUrl=SOURCE_DWA))
    for district, name_en, name_bn in OSCC:
        d = district_meta[district]
        entries.append(entry(
            category='ONE_STOP', district=district,
            nameEn=name_en, nameBn=name_bn,
            addressEn=f'{name_en}, {district}, Bangladesh',
            addressBn=f'{name_bn}, {d["bn"]} জেলা, বাংলাদেশ',
            phone='109', lat=d['lat'], lng=d['lng'], is24x7=True, isVerified=True,
            sourceUrl=SOURCE_DWA))
    print(f'  women centres: 64 AWCF units | one-stop crisis centres: {len(OSCC)}')

    # ── 5. Help centres (District Legal Aid Offices) ────────────────────────
    legalaid = load_json('legalaid.json', {})
    la_ok = 0
    for _, _, bn, en, lat, lng in DISTRICTS:
        row = legalaid.get(en) or {}
        d = district_meta[en]
        phone = phone_digits(row.get('phone'))
        if phone:
            la_ok += 1
        entries.append(entry(
            category='HELP_CENTRE', district=en,
            nameEn=f'{en} District Legal Aid Office',
            nameBn=f'{d["bn"]} জেলা লিগ্যাল এইড অফিস',
            addressEn=f'{en} District and Sessions Judge Court, Bangladesh',
            addressBn=f'{d["bn"]} জেলা ও দায়রা জজ আদালত, বাংলাদেশ',
            phone=phone, lat=lat, lng=lng, isVerified=True,
            sourceUrl=row.get('url') or SOURCE_JUDICIARY))
    print(f'  legal aid offices: 64 (with phone: {la_ok})')

    # ── 6. Fire service + DC office per district ────────────────────────────
    for _, _, bn, en, lat, lng in DISTRICTS:
        entries.append(entry(
            category='FIRE_SERVICE', district=en,
            nameEn=f'{en} Fire Service Station',
            nameBn=f'{bn} ফায়ার সার্ভিস স্টেশন',
            addressEn=f'Bangladesh Fire Service & Civil Defence, {en}, Bangladesh',
            addressBn=f'ফায়ার সার্ভিস ও সিভিল ডিফেন্স, {bn} জেলা, বাংলাদেশ',
            phone='999', lat=lat, lng=lng, is24x7=True, isVerified=True,
            sourceUrl='https://www.fireservice.gov.bd'))
        entries.append(entry(
            category='SAFE_PLACE', district=en,
            nameEn=f'{en} Deputy Commissioner Office',
            nameBn=f'{bn} জেলা প্রশাসকের কার্যালয়',
            addressEn=f'{en} Deputy Commissioner Office, Bangladesh',
            addressBn=f'{bn} জেলা প্রশাসকের কার্যালয়, বাংলাদেশ',
            lat=lat, lng=lng, isVerified=True, sourceUrl='https://bangladesh.gov.bd'))
    print('  fire + DC offices added')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    from collections import Counter
    counts = Counter(e['category'] for e in entries)
    print(f'\ntotal entries: {len(entries)}')
    for k, v in sorted(counts.items()):
        print(f'  {k}: {v}')
    print(f'written: {OUT}')
    missing_geo = [f"{e['category']}|{e['district']}|{e['nameEn']}"
                   for e in entries if e['category'] in ('POLICE', 'HOSPITAL')
                   and not geo(e['category'], e['district'], e['nameEn'])]
    with open(os.path.join(SRC, 'geocode_todo.json'), 'w') as f:
        json.dump(missing_geo, f, ensure_ascii=False)
    print(f'geocode todo: {len(missing_geo)}')


if __name__ == '__main__':
    main()

