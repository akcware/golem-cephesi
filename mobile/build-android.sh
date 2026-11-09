#!/usr/bin/env bash
# Defold projesini Android (APK) için derler: bundle/android/
# İmza: anahtar verilmezse Defold'un hata ayıklama anahtarı kullanılır (yalnızca test için;
# Play Store'a yüklemek için kendi anahtarını --keystore ile ver).
# Kullanım: ./build-android.sh [debug|release]
set -e
cd "$(dirname "$0")"
# müzik dosyaları depoda bir kez (public/music/) durur; Defold projesine kopyalanır
(cd .. && npx tsx tools/bake-music.ts)
JAVA="${DEFOLD_JAVA:-$HOME/Defold/editor/Defold/packages/jdk-25.0.4.1+1/bin/java}"
BOB="${DEFOLD_BOB:-$HOME/Defold/bob.jar}"
"$JAVA" -jar "$BOB" --root . --platform arm64-android --architectures arm64-android,armv7-android --variant "${1:-debug}" \
  --archive --texture-compression true --strip-executable --bundle-format apk --bundle-output bundle/android --build-server https://build.defold.com resolve build bundle
