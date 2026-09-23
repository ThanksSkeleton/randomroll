#!/usr/bin/env bash

npm run dev &
SERVER_PID=$!

# Give the dev server a moment to start.
sleep 2

"/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --new-window \
  --window-size=1440,900 \
  "http://localhost:5173"

# When you Ctrl+C this script, stop the dev server too.
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

wait $SERVER_PID