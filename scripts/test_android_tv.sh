#!/usr/bin/env bash
# Destructive test fixtures belong on a disposable TV emulator, never a real box.
set -euo pipefail
if [ "$(adb shell getprop ro.kernel.qemu | tr -d '\r')" != 1 ]; then
  echo 'Run TV instrumentation only on a disposable emulator.' >&2
  exit 1
fi
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root/android/addon-host"
show_failure() {
  result=$?
  if [ "$result" -ne 0 ]; then timeout 10s adb logcat -d -v brief AndroidRuntime:E '*:S' || true; fi
}
trap show_failure EXIT
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest --console=plain
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
timeout 120s adb shell am instrument -w -r local.animesama.host.test/androidx.test.runner.AndroidJUnitRunner | tee app/build/tv-instrumentation.txt
python3 -c "from pathlib import Path; data=Path('app/build/tv-instrumentation.txt').read_text(); assert 'OK (5 tests)' in data and 'FAILURES' not in data, 'TV instrumentation did not pass'"
adb exec-out run-as local.animesama.host cat files/tv-ui.png > app/build/tv-ui.png
