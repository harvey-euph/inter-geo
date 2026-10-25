#!/usr/bin/env bash

set -euo pipefail

URL1='https://harvey-euph.github.io/inter-geo/assets/texts-DvW4PRSD.md'
URL2='https://raw.githubusercontent.com/harvey-euph/inter-geo/refs/heads/main/public/info/texts.md'

for name in pages raw; do
  if [[ "$name" == "pages" ]]; then
    url="$URL1"
  else
    url="$URL2"
  fi

  for i in $(seq 1 30); do
    curl -sS \
      -o /dev/null \
      -w "$name,$i,%{http_code},%{time_namelookup},%{time_connect},%{time_appconnect},%{time_starttransfer},%{time_total},%{size_download}\n" \
      "$url"
  done
done