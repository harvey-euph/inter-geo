#!/usr/bin/env python3
"""
Fetch and prepare worldwide Level 3 (Admin-2) datasets for sufficiently large countries.
Sources:
- Natural Earth Admin 2 for United States
- GADM 4.1 Level 2 for other major countries
"""
import os
import sys
import io
import json
import zipfile
import urllib.request

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_SOURCE_L3 = os.path.join(ROOT_DIR, "data-source", "l3")
os.makedirs(DATA_SOURCE_L3, exist_ok=True)

GADM_COUNTRIES = {
    "FR": ("FRA", "省 (Département)"),
    "DE": ("DEU", "郡/非縣轄市 (Landkreis)"),
    "GB": ("GBR", "區/單一管理區 (District)"),
    "IT": ("ITA", "省/廣域市 (Provincia)"),
    "ES": ("ESP", "省 (Provincia)"),
    "CA": ("CAN", "普查區/郡 (Census Division)"),
    "AU": ("AUS", "地方政府區 (LGA)"),
    "PL": ("POL", "縣 (Powiat)"),
    "KR": ("KOR", "市/郡/區 (Si/Gun/Gu)"),
    "SE": ("SWE", "市鎮 (Kommun)"),
    "NO": ("NOR", "市鎮 (Kommune)"),
    "AR": ("ARG", "省轄區 (Departamento)"),
    "NZ": ("NZL", "地區主管機構 (District)"),
    "ZA": ("ZAF", "區自治市 (District Municipality)"),
    "MX": ("MEX", "市鎮 (Município)"),
    "BR": ("BRA", "市鎮 (Município)"),
}

def fetch_us():
    dest = os.path.join(DATA_SOURCE_L3, "US.geojson")
    if os.path.exists(dest) and os.path.getsize(dest) > 100000:
        print("[US] US.geojson already exists, skipping download.")
        return
    print("[US] Downloading Natural Earth Admin-2 Counties GeoJSON...")
    url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_2_counties.geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
        with open(dest, "wb") as f:
            f.write(content)
    print(f"[US] Saved US.geojson ({len(content) / 1024:.1f} KB)")

def fetch_gadm(iso2, iso3, unit_name):
    dest = os.path.join(DATA_SOURCE_L3, f"{iso2}.geojson")
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        print(f"[{iso2}] {iso2}.geojson already exists, skipping download.")
        return

    url = f"https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_{iso3}_2.json.zip"
    print(f"[{iso2}] Downloading GADM 4.1 ADM_2 for {iso3} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            zip_bytes = resp.read()
            z = zipfile.ZipFile(io.BytesIO(zip_bytes))
            json_filename = z.namelist()[0]
            geojson_data = z.read(json_filename)
            with open(dest, "wb") as f:
                f.write(geojson_data)
        print(f"[{iso2}] Saved {iso2}.geojson ({len(geojson_data) / 1024:.1f} KB)")
    except Exception as e:
        print(f"[{iso2}] Error downloading {iso3}: {e}")

def main():
    print("=== Fetching Worldwide L3 Source Data ===")
    fetch_us()
    for iso2, (iso3, unit_name) in GADM_COUNTRIES.items():
        fetch_gadm(iso2, iso3, unit_name)
    print("=== All L3 source downloads finished ===")

if __name__ == "__main__":
    main()
