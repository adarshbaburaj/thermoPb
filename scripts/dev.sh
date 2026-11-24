#!/usr/bin/env bash
# Run the local demo without changing or deleting existing state.
set -euo pipefail

THERMOPB_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$THERMOPB_ROOT"

if [[ -f "$THERMOPB_ROOT/.env" ]]; then
  set -a
  # This is the user's local shell-style configuration, never a downloaded file.
  source "$THERMOPB_ROOT/.env"
  set +a
fi

export DEMO_MODE="${DEMO_MODE:-1}"
export API_URL="${API_URL:-http://127.0.0.1:8000}"
export THERMOPB_DB_PATH="${THERMOPB_DB_PATH:-$THERMOPB_ROOT/api/data/thermopb.sqlite3}"

if [[ -x "$THERMOPB_ROOT/.venv/bin/python" ]]; then
  THERMOPB_PYTHON="$THERMOPB_ROOT/.venv/bin/python"
else
  THERMOPB_PYTHON="python3"
fi

if ! "$THERMOPB_PYTHON" -c 'import fastapi, uvicorn' >/dev/null 2>&1; then
  echo 'Install API dependencies first: .venv/bin/pip install -r api/requirements.txt' >&2
  exit 1
fi
if [[ ! -f "$THERMOPB_ROOT/web/node_modules/next/dist/bin/next" ]]; then
  echo 'Install web dependencies first: npm --prefix web ci' >&2
  exit 1
fi

THERMOPB_API_PID=''
THERMOPB_WEB_PID=''
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$THERMOPB_WEB_PID" ]]; then kill "$THERMOPB_WEB_PID" 2>/dev/null || true; fi
  if [[ -n "$THERMOPB_API_PID" ]]; then kill "$THERMOPB_API_PID" 2>/dev/null || true; fi
  if [[ -n "$THERMOPB_WEB_PID" ]]; then wait "$THERMOPB_WEB_PID" 2>/dev/null || true; fi
  if [[ -n "$THERMOPB_API_PID" ]]; then wait "$THERMOPB_API_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

"$THERMOPB_PYTHON" -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000 &
THERMOPB_API_PID=$!
(
  cd "$THERMOPB_ROOT/web"
  exec node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
) &
THERMOPB_WEB_PID=$!

echo "thermopb · RTM — Route To Meeting"
echo "Web: http://127.0.0.1:3000 | API: http://127.0.0.1:8000/docs"
echo "Persistent demo database: $THERMOPB_DB_PATH"
echo 'Press Ctrl+C to stop both servers.'

# Compatible with the Bash 3.2 shipped by macOS (which does not support wait -n).
while kill -0 "$THERMOPB_API_PID" 2>/dev/null && kill -0 "$THERMOPB_WEB_PID" 2>/dev/null; do
  sleep 1
done
if ! kill -0 "$THERMOPB_API_PID" 2>/dev/null; then
  wait "$THERMOPB_API_PID"
else
  wait "$THERMOPB_WEB_PID"
fi
