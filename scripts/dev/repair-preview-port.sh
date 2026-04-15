#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-4173}"
MODE="${1:-inspect}"
FORCE_RESTART="${2:-}"

port_line="$(lsof -i :"$PORT" 2>/dev/null | awk 'NR==2 {print $2":"$1}')"

case "$MODE" in
  inspect)
    if [[ -n "$port_line" ]]; then
      pid="${port_line%%:*}"
      cmd="${port_line##*:}"
      echo "PORT_IN_USE=yes"
      echo "PID=$pid"
      echo "COMMAND=$cmd"
    else
      echo "PORT_IN_USE=no"
      echo "PID="
      echo "COMMAND="
    fi
    ;;
  release)
    if [[ -z "$port_line" ]]; then
      echo "repair-preview-port: port $PORT is free; no action needed"
      exit 0
    fi
    pid="${port_line%%:*}"
    cmd="${port_line##*:}"
    if [[ "$FORCE_RESTART" == "--force-restart" ]]; then
      echo "repair-preview-port: stopping PID $pid ($cmd) on port $PORT"
      kill "$pid" || kill -9 "$pid" || true
      sleep 1
      echo "repair-preview-port: port $PORT released"
    else
      echo "repair-preview-port: port $PORT already in use by PID $pid ($cmd); no action taken"
    fi
    ;;
  *)
    echo "usage: bash scripts/dev/repair-preview-port.sh [inspect|release --force-restart]" >&2
    exit 1
    ;;
esac
