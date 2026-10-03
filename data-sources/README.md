# Data sources

Scripts that collect the district safety directory and emit
`backend/src/WomenSafety.Api/Data/directory-entries.json`, which the API
seeds on first run.

## Pipeline

```bash
python3 fetch_police_gov.py       # police.gov.bd official contact tree -> police_gov.json
python3 fetch_legalaid.py         # judiciary.gov.bd -> legalaid.json
python3 parse_health.py           # published upazila health complexes -> health_complexes.json
python3 parse_police.py           # press-compiled OC cards -> police_cards.json
python3 geocode.py                # OpenStreetMap coordinates -> geocoded.json
python3 build_directory_data.py   # joins everything -> directory-entries.json
python3 report_quality.py         # coverage report
```

`geocode.py` caches its OpenStreetMap pull in `osm_cache_*.json`, so re-runs
are instant. `build_directory_data.py` must run **after** `geocode.py`; it
writes `geocode_todo.json`, the list of entries still lacking a real position.

## What comes from where

| Data | Source | Notes |
|---|---|---|
| Police stations (767 thanas) | [Bangladesh-Administrative-Data](https://github.com/goshamishagar/Bangladesh-Administrative-Data) | CC0; the thana list itself |
| Police phones (OC) | [police.gov.bd](https://www.police.gov.bd/en/unitContact) | **official**, crawled live — preferred over press lists |
| District control rooms | police.gov.bd | direct line; falls back to 999 |
| Women & Child Help Desks (124) | police.gov.bd | women-specific police desks |
| Hospitals (486) | published upazila health complex contact list | phone per facility |
| District legal aid (64) | [judiciary.gov.bd](https://dhaka.judiciary.gov.bd/en) | district & sessions court offices |
| Coordinates | [OpenStreetMap](https://www.openstreetmap.org/) via Overpass | ODbL; police nodes, hospital/clinic ways, settlements |
| AWCF units, OSCC | Department of Women's Affairs | one per district / major hospitals |
| Fire, DC offices | fireservice.gov.bd, bangladesh.gov.bd | 999 / district headquarters |

## Known gaps

- **472 of 1,344 police stations and hospitals** have no OSM match and fall
  back to the district centre. They are listed in `geocode_todo.json`. They are
  remote riverine thanas (`Char Fasson`, `Nalchira`) that OSM has not mapped.
- **DC offices and AWCF units have no published phone number.** Contact them
  through the district commissioner's office instead.
- **445 thanas have no phone number.** police.gov.bd publishes OC numbers for
  roughly half of them; the rest are only reachable through the district
  control room.
- Coordinates are **approximate** — never treat a pin as a navigation target.
  In an emergency, call 999 first.

## Refreshing

The API seeds `directory-entries.json` once and keys the guard on its SHA-256,
so replacing the file and restarting the backend is enough to pick up new data —
no database migration needed.