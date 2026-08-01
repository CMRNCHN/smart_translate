#!/usr/bin/env bash
set -euo pipefail
KEY="${1:-${DEEPL_API_KEY:-}}"
if [[ -z "$KEY" ]]; then
  echo "Usage: DEEPL_API_KEY=... ./tools/check-deepl.sh"
  echo "   or: ./tools/check-deepl.sh YOUR_KEY"
  exit 1
fi

if [[ "$KEY" == *:fx ]]; then
  HOST="https://api-free.deepl.com"
  KIND="Free (:fx)"
else
  HOST="https://api.deepl.com"
  KIND="Pro/Developer"
fi

echo "Key type: $KIND"
echo "Host:     $HOST"
echo "Key len:  ${#KEY}  ends: ${KEY: -4}"
echo

echo "1) Usage"
curl -sS -w "\nHTTP %{http_code}\n" \
  -H "Authorization: DeepL-Auth-Key $KEY" \
  "$HOST/v2/usage"
echo

echo "2) Translate Hello -> ES (JSON)"
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST "$HOST/v2/translate" \
  -H "Authorization: DeepL-Auth-Key $KEY" \
  -H "Content-Type: application/json" \
  -H "User-Agent: SmartTranslate/1.1 (check-deepl)" \
  -d '{"text":["Hello, world!"],"target_lang":"ES"}'
echo

echo "3) Translate Hola -> EN-US"
curl -sS -w "\nHTTP %{http_code}\n" \
  -X POST "$HOST/v2/translate" \
  -H "Authorization: DeepL-Auth-Key $KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":["Hola"],"target_lang":"EN-US"}'
echo
