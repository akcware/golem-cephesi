#!/usr/bin/env bash
# Defold projesini web (HTML5) için derler: bundle/web/Golem Forge/
# Kullanım: ./build-web.sh [debug|release]
set -e
cd "$(dirname "$0")"
# müzik dosyaları depoda bir kez (public/music/) durur; Defold projesine kopyalanır
(cd .. && npx tsx tools/bake-music.ts)
JAVA="${DEFOLD_JAVA:-$HOME/Defold/editor/Defold/packages/jdk-25.0.4.1+1/bin/java}"
BOB="${DEFOLD_BOB:-$HOME/Defold/bob.jar}"
"$JAVA" -jar "$BOB" --root . --platform wasm-web --architectures wasm-web --variant "${1:-debug}" \
  --archive --texture-compression true --bundle-output bundle/web --build-server https://build.defold.com resolve build bundle
