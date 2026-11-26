#!/bin/bash
# Regenerates the Figma Community listing images from render.html.
# Run `npm run build` first; the images are drawn by dist/core.iife.js.
set -euo pipefail
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Headless Chrome on macOS can hang after writing its screenshot, so each shot
# runs in the background and is killed once the PNG lands (30s cap).
shot() { # <asset> <out.png> <width> <height>
  local profile pid
  profile="$(mktemp -d)"
  rm -f "$2"
  "$CHROME" --headless=new --user-data-dir="$profile" --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --allow-file-access-from-files --virtual-time-budget=4000 \
    --window-size="$3,$4" --screenshot="$PWD/$2" "file://$PWD/render.html?asset=$1" >/dev/null 2>&1 &
  pid=$!
  for _ in $(seq 1 60); do
    if [ -s "$2" ]; then sleep 1; break; fi
    sleep 0.5
  done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  # Chrome helpers can still be writing to the profile; clean up best-effort.
  rm -rf "$profile" 2>/dev/null || { sleep 1; rm -rf "$profile" 2>/dev/null || true; }
  [ -s "$2" ] || { echo "failed to render $2" >&2; exit 1; }
}

shot thumbnail thumbnail.png 1920 1080
shot styles carousel-1-styles.png 1920 1080
shot patterns carousel-2-patterns.png 1920 1080
shot themes carousel-3-themes.png 1920 1080
shot panel carousel-4-editing.png 1920 1080
shot icon icon-1024.png 1024 1024
sips -z 128 128 icon-1024.png --out icon.png >/dev/null
rm icon-1024.png

sips -g pixelWidth -g pixelHeight ./*.png
