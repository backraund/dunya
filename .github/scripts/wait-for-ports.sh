#!/usr/bin/env bash
set -euo pipefail
host="${1:?host}"
shift
for port in "$@"; do
  echo "Waiting for ${host}:${port} ..."
  for i in $(seq 1 60); do
    if (echo >/dev/tcp/"${host}"/"${port}") 2>/dev/null; then
      echo "${host}:${port} is up"
      break
    fi
    if [[ "$i" -eq 60 ]]; then
      echo "Timeout waiting for ${host}:${port}" >&2
      exit 1
    fi
    sleep 1
  done
done
