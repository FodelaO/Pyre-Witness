#!/bin/bash
# Recut the demo for the latest port 4120 build, with a shared ten-minute cooldown.
set -u

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" || exit 1
cd "$DEMO_DIR/.." || exit 1
export PATH="/opt/homebrew/bin:$PATH"
unset DEMO_URL DEMO_DRY_CAPTURE
MARKER=".agents/demo-build-live"
OUT="demo/out"
STATE="$OUT/.loop-state"
LOCK="$OUT/.loop-render"
LOG="$OUT/loop.log"
COOLDOWN=600

once=false
make_args=()
case "${1:-}" in
  "") ;;
  --once) once=true; shift ;;
  *) echo "Usage: bash demo/loop.sh [--once [--with-capture|--no-record]]" >&2; exit 2 ;;
esac
if $once && { [ "${1:-}" = "--with-capture" ] || [ "${1:-}" = "--no-record" ]; }; then
  make_args=("$1")
  shift
fi
if [ "$#" -ne 0 ]; then
  echo "Usage: bash demo/loop.sh [--once [--with-capture|--no-record]]" >&2
  exit 2
fi
mkdir -p "$OUT" || exit 1

read_state() {
  last_start=0
  last_marker=""
  if [ -s "$STATE" ]; then
    IFS=$'\t' read -r last_start last_marker < "$STATE"
    case "$last_start" in ""|*[!0-9]*) last_start=0 ;; esac
  fi
}

render() (
  marker="$1"
  # A second watcher or --once process cannot overwrite a render in flight.
  mkdir "$LOCK" 2>/dev/null || exit 75
  output="$LOCK/process.log"
  trap 'rm -f "$output" "$LOCK/state"; rmdir "$LOCK"' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  read_state
  started="$(date +%s)"
  if [ "$((started - last_start))" -lt "$COOLDOWN" ]; then exit 75; fi
  if ! $once && [ "$marker" = "$last_marker" ]; then exit 75; fi
  printf '%s\t%s\n' "$started" "$marker" > "$LOCK/state" || exit 1
  mv "$LOCK/state" "$STATE" || exit 1

  stamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  node demo/make.mjs ${make_args[@]+"${make_args[@]}"} > "$output" 2>&1
  status=$?
  elapsed="$(( $(date +%s) - started ))"
  if [ "$status" -eq 0 ]; then
    duration="$(awk '$1 == "duration" { print $2; exit }' "$output")"
    printf '%s\tbuild=%s\trender=%ss\tok\tvideo=%ss\n' "$stamp" "$marker" "$elapsed" "$duration" >> "$LOG"
  else
    why="$(awk 'NF { last = $0 } END { print substr(last, 1, 260) }' "$output")"
    printf '%s\tbuild=%s\trender=%ss\tfailed\t%s\n' "$stamp" "$marker" "$elapsed" "${why:-exit $status}" >> "$LOG"
  fi
  [ ! -f "$output" ] || cat "$output"
  exit "$status"
)

while :; do
  marker=""
  if [ -r "$MARKER" ]; then
    marker="$(tr '\t\r\n' '   ' < "$MARKER" | sed 's/ *$//')"
  fi
  if [ -n "$marker" ]; then
    read_state
    if $once || [ "$marker" != "$last_marker" ]; then
      render "$marker"
      result=$?
      if $once && [ "$result" -ne 75 ]; then exit "$result"; fi
    fi
  elif $once; then
    echo "Build marker is missing or empty: $MARKER" >&2
    exit 1
  fi
  sleep 5
done
