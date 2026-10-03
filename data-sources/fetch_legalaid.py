"""Fetch District Legal Aid Office contacts (phone numbers) for all 64 districts
from the official Bangladesh Judiciary district websites.

Output: data-sources/legalaid.json
"""
import json, re, html, time, urllib.request, urllib.error

UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'}

# district (seed NameEn) -> candidate subdomains
SLUGS = {
    'Dhaka': ['dhaka'], 'Gazipur': ['gazipur'], 'Kishoreganj': ['kishoreganj'],
    'Manikganj': ['manikganj'], 'Munshiganj': ['munshiganj'], 'Narayanganj': ['narayanganj'],
    'Narsingdi': ['narsingdi'], 'Tangail': ['tangail'], 'Faridpur': ['faridpur'],
    'Gopalganj': ['gopalganj'], 'Madaripur': ['madaripur'], 'Rajbari': ['rajbari'],
    'Shariatpur': ['shariatpur'], 'Chattogram': ['chattogram', 'chittagong'],
    "Cox's Bazar": ['coxsbazar', 'coxsbazar', 'coxs-bazar'],
    'Bandarban': ['bandarban'], 'Rangamati': ['rangamati'],
    'Khagrachhari': ['khagrachhari', 'khagrachha'],
    'Feni': ['feni'], 'Lakshmipur': ['lakshmipur'],
    'Cumilla': ['cumilla', 'comilla'], 'Noakhali': ['noakhali'],
    'Brahmanbaria': ['brahmanbaria'], 'Chandpur': ['chandpur'],
    'Rajshahi': ['rajshahi'], 'Bogura': ['bogura', 'bogra'], 'Naogaon': ['naogaon'],
    'Natore': ['natore'], 'Chapainawabganj': ['chapainawabganj', 'chapai', 'chapainawabganj'],
    'Pabna': ['pabna'], 'Sirajganj': ['sirajganj'], 'Joypurhat': ['joypurhat'],
    'Khulna': ['khulna'], 'Bagerhat': ['bagerhat'], 'Satkhira': ['satkhira'],
    'Jashore': ['jashore', 'jessore'], 'Jhenaidah': ['jhenaidah', 'jhinaidah'],
    'Magura': ['magura'], 'Narail': ['narail'], 'Kushtia': ['kushtia'],
    'Chuadanga': ['chuadanga'], 'Meherpur': ['meherpur'],
    'Barishal': ['barishal', 'barisal'], 'Patuakhali': ['patuakhali'],
    'Bhola': ['bhola'], 'Pirojpur': ['pirojpur'], 'Barguna': ['barguna'],
    'Jhalokati': ['jhalokati', 'jhalokathi'],
    'Sylhet': ['sylhet'], 'Moulvibazar': ['moulvibazar', 'maulvibazar'],
    'Habiganj': ['habiganj'], 'Sunamganj': ['sunamganj'],
    'Rangpur': ['rangpur'], 'Dinajpur': ['dinajpur'], 'Thakurgaon': ['thakurgaon'],
    'Panchagarh': ['panchagarh'], 'Nilphamari': ['nilphamari'],
    'Lalmonirhat': ['lalmonirhat'], 'Kurigram': ['kurigram'], 'Gaibandha': ['gaibandha'],
    'Mymensingh': ['mymensingh'], 'Jamalpur': ['jamalpur'], 'Netrokona': ['netrokona'],
    'Sherpur': ['sherpur'],
}

PATH = '/en/menu/page/district-legal-aid-office'
BANGLA_DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
SKIP_PHONES = {'01316154216', '01795373680'}


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode('utf-8', 'ignore')


def to_text(page):
    page = re.sub(r'<script.*?</script>', ' ', page, flags=re.S | re.I)
    page = re.sub(r'<style.*?</style>', ' ', page, flags=re.S | re.I)
    text = re.sub(r'<[^>]+>', ' ', page)
    text = html.unescape(text)
    text = text.translate(BANGLA_DIGITS)
    return re.sub(r'\s+', ' ', text)


def first_phone_after(text, idx, window=900):
    """First BD phone-like number (mobile/landline, dashes allowed) in the window."""
    chunk = text[idx:idx + window]
    for m in re.finditer(r'(?<!\d)0[\d\-\s]{8,16}(?!\d)', chunk):
        digits = re.sub(r'[\-\s]', '', m.group(0))
        if 10 <= len(digits) <= 12 and digits not in SKIP_PHONES:
            return digits
    return None


def extract(text):
    # Preferred: the office detail table — starts with the serial-number header
    # ("ক্রমিক নং"), which never appears in the site menu or banner.
    for anchor in ('ক্রমিক নং', 'অফিস কর্মকর্তা', 'Serial No'):
        idx = text.find(anchor)
        if idx != -1:
            phone = first_phone_after(text, idx)
            if phone:
                return phone
    # Fallback: officer title, then the generic phone-column header
    for marker in ('জেলা লিগ্যাল এইড অফিসার', 'District Legal Aid Officer',
                   'ফোন/মোবাইল নং', 'টেলিফোন/মোবাইল', 'Phone/Mobile'):
        i = text.find(marker)
        if i != -1:
            phone = first_phone_after(text, i + len(marker))
            if phone:
                return phone
    return None


def has_office_table(text):
    """The real office page always contains the officer detail block."""
    return any(m in text for m in ('ক্রমিক নং', 'অফিস কর্মকর্তা', 'Serial No',
                                   'Legal Aid Officer', 'লিগ্যাল এইড অফিসার',
                                   'Hotline number', 'Mobile-', 'মোবাইল'))


def discover_home_link(slug):
    """Some districts (e.g. Netrokona) 500 on the direct path — find the link."""
    try:
        home = fetch(f'https://{slug}.judiciary.gov.bd/en')
    except Exception:
        return None
    for href in re.findall(r'href="([^"]*legal-aid[^"]*)"', home, re.I):
        if 'helpline' not in href.lower() and 'act' not in href.lower():
            return href if href.startswith('http') else f'https://{slug}.judiciary.gov.bd{href}'
    return None


def main():
    results, failed = {}, []
    paths = [PATH, PATH.replace('/en/', '/bn/')]
    for district, slugs in SLUGS.items():
        best = None
        for slug in slugs:
            for path in paths:
                url = f'https://{slug}.judiciary.gov.bd{path}'
                try:
                    page = fetch(url)
                except Exception as e:
                    print(f'  ! {district} [{url}]: {e}', flush=True)
                    continue
                text = to_text(page)
                if not has_office_table(text):
                    continue
                phone = extract(text)
                record = {'district': district, 'slug': slug, 'phone': phone, 'url': url}
                if phone:
                    best = record
                    break
                if best is None:
                    best = record  # phone-less fallback, keep looking
            if best and best.get('phone'):
                break
            # Direct path failed or had no number — look for the real link on the home page
            extra = discover_home_link(slug)
            for url in ([extra, extra.replace('/en/', '/bn/')] if extra else []):
                try:
                    text = to_text(fetch(url))
                except Exception:
                    continue
                if not has_office_table(text):
                    continue
                phone = extract(text)
                record = {'district': district, 'slug': slug, 'phone': phone, 'url': url}
                if phone:
                    best = record
                    break
            if best and best.get('phone'):
                break
        if best:
            results[district] = best
            print(f'  ✓ {district} [{best["slug"]}]: phone={best["phone"]}', flush=True)
        else:
            failed.append(district)
            print(f'  ✗ {district}: nothing found', flush=True)
        time.sleep(0.4)
    with open('/Users/mdrafiullah/womens safety/data-sources/legalaid.json', 'w') as f:
        json.dump(results, f, ensure_ascii=False, indent=1)
    print(f'done: {len(results)} ok, {len(failed)} failed: {failed}', flush=True)


if __name__ == '__main__':
    main()