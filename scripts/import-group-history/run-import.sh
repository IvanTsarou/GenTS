#!/usr/bin/env bash
# Загружает переменные из корня проекта (.env.local) и запускает импорт.
# Использование:
#   chmod +x run-import.sh
#   ./run-import.sh 0f2aca21-9b45-4c69-92d0-103086e83baf
#   ./run-import.sh 0f2aca21-9b45-4c69-92d0-103086e83baf --limit 5

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"

if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env.local"
  set +a
fi

if [[ ! -d .venv ]]; then
  echo "Сначала: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

exec .venv/bin/python import_group_history.py --trip-id "$@"
