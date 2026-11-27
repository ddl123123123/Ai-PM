#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source_tree="$(cd "${1:?Pass the desktop repository checkout with its dependencies installed}" && pwd)"
commit=13317d5c9e6a497bcaed13b4d925a89ef23d1748
if [[ "$(git -C "$source_tree" rev-parse HEAD)" != "$commit" ]] || ! git -C "$source_tree" diff --quiet HEAD; then
  echo "Use an unmodified tabletop checkout at $commit." >&2
  exit 1
fi

web="$source_tree/apps/web"
stage="$(mktemp -d "$web/.portfolio-avalon.XXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
cp "$here"/{index.html,main.tsx,session.ts,account.ts,vite.config.mjs} "$stage/"
mkdir "$stage/public"
cp -R "$web/public"/{avalon-card-back.webp,avalon-card-thumbnails,avalon-characters,avalon-characters-style-1,avalon-pig,avalon-roles,citadels-cards,court-night-cards,glassworks-cards,grey-tide,ninja-cards,street-stall} "$stage/public/"
"$web/node_modules/.bin/vite" build --config "$stage/vite.config.mjs" --outDir "$stage/output"
output="$here/../../dist/avalon-mobile"
python3 - "$stage/output" "$output" <<'PYTHON'
from pathlib import Path
import shutil
import sys

source, output = map(Path, sys.argv[1:])
if output.exists():
    shutil.rmtree(output)
shutil.copytree(source, output)
PYTHON
