#!/usr/bin/env bash
# Defold projesini Android için derler.
#
#   ./build-android.sh          → bundle/android/: hata ayıklama APK'sı (Defold'un test anahtarıyla; USB ile kurulur)
#   ./build-android.sh release  → bundle/android/: Google Play için AAB, yükleme anahtarıyla imzalı
#
# release için yükleme anahtarı: ANDROID_KEYSTORE (varsayılan ~/.golemforge/upload-keystore.jks, takma ad "upload").
# Şifre ANDROID_KEYSTORE_PASS'tan, yoksa macOS Anahtar Zinciri'nden ("Golem Forge Android upload key") okunur.
# Play App Signing açık olduğu için bu anahtar yalnızca yüklemeyi imzalar; kaybolursa Play Console'dan sıfırlanabilir.
# Sürüm kodu (versionCode) git commit sayısıdır: her yeni yüklemeden önce en az bir commit olmalı.
set -euo pipefail
cd "$(dirname "$0")"
VARIANT="${1:-debug}"
# müzik dosyaları depoda bir kez (public/music/) durur; Defold projesine kopyalanır
(cd .. && npx tsx tools/bake-music.ts)
JAVA="${DEFOLD_JAVA:-$HOME/Defold/editor/Defold/packages/jdk-25.0.4.1+1/bin/java}"
[ -x "$JAVA" ] || JAVA=/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home/bin/java
BOB="${DEFOLD_BOB:-$HOME/Defold/bob.jar}"

ARGS=(--root . --platform arm64-android --architectures arm64-android,armv7-android --variant "$VARIANT"
  --archive --texture-compression true --strip-executable --build-server https://build.defold.com)

if [ "$VARIANT" = release ]; then
  KEYSTORE="${ANDROID_KEYSTORE:-$HOME/.golemforge/upload-keystore.jks}"
  [ -f "$KEYSTORE" ] || { echo "Yükleme anahtarı yok: $KEYSTORE"; exit 1; }
  PASS="${ANDROID_KEYSTORE_PASS:-$(security find-generic-password -s 'Golem Forge Android upload key' -w 2>/dev/null || true)}"
  [ -n "$PASS" ] || { echo "Anahtar şifresi bulunamadı (ANDROID_KEYSTORE_PASS ya da Anahtar Zinciri)."; exit 1; }
  TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
  printf '%s' "$PASS" > "$TMP/pass"; chmod 600 "$TMP/pass"
  VERSION_CODE="${VERSION_CODE:-$(git rev-list --count HEAD)}"
  printf '[android]\nversion_code = %s\n' "$VERSION_CODE" > "$TMP/version.ini"
  echo "Sürüm kodu $VERSION_CODE"
  rm -rf bundle/android
  "$JAVA" -jar "$BOB" "${ARGS[@]}" --settings "$TMP/version.ini" --bundle-format aab --bundle-output bundle/android \
    --keystore "$KEYSTORE" --keystore-alias upload --keystore-pass "$TMP/pass" resolve build bundle
  find bundle/android -name '*.aab' -print
else
  "$JAVA" -jar "$BOB" "${ARGS[@]}" --bundle-format apk --bundle-output bundle/android resolve build bundle
fi
