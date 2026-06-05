#!/usr/bin/env bash
#
# BuildMyOS boot smoke test.
#
# Boots the freshly built kernel on QEMU, captures the serial console, and
# asserts that the expected banner and boot messages appear. Exits non-zero
# on any failure so it can be used in CI or `make test`.
#
# The kernel idles forever, so we run QEMU in the background and POLL the
# serial log until the final expected line shows up (or DEADLINE is hit),
# then stop QEMU. Polling avoids the flakiness of betting on a fixed timeout
# racing against QEMU startup.
#
# Usage: tests/boot_test.sh [path-to-kernel.elf]
# Env:   QEMU=<binary>  DEADLINE=<seconds>

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KERNEL="${1:-$ROOT/build/kernel.elf}"
QEMU="${QEMU:-qemu-system-aarch64}"
DEADLINE="${DEADLINE:-20}"

# Strings that must appear in the boot output. The last one marks the end of
# boot, so once we see it we can stop waiting.
EXPECT=(
    "BuildMyOS Kernel v0.1.0"
    "[INFO] ARM64 Bootstrap Complete"
    "[INFO] UART initialized for console output"
    "[KERNEL] Entering main loop..."
)
DONE_MARKER="${EXPECT[${#EXPECT[@]}-1]}"

echo "🧪 BuildMyOS boot smoke test"
echo "============================"

if [ ! -f "$KERNEL" ]; then
    echo "  ❌ kernel not found: $KERNEL (run 'make' first)"
    exit 1
fi
if ! command -v "$QEMU" >/dev/null 2>&1; then
    echo "  ❌ $QEMU not found"
    exit 1
fi

LOG="$(mktemp)"
QEMU_PID=""
cleanup() {
    [ -n "$QEMU_PID" ] && kill "$QEMU_PID" 2>/dev/null
    [ -n "$QEMU_PID" ] && wait "$QEMU_PID" 2>/dev/null
    rm -f "$LOG"
}
trap cleanup EXIT

echo "  ▶ booting $KERNEL on $QEMU (deadline ${DEADLINE}s)..."
# -nographic muxes the UART onto stdio; </dev/null keeps it non-interactive.
# Keep stderr so QEMU startup errors are visible in the captured log.
"$QEMU" -machine virt -cpu cortex-a72 -m 256M -nographic \
    -kernel "$KERNEL" </dev/null >"$LOG" 2>&1 &
QEMU_PID=$!

# Poll until the boot-complete marker appears or we hit the deadline.
waited=0
while [ "$waited" -lt "$DEADLINE" ]; do
    if ! kill -0 "$QEMU_PID" 2>/dev/null; then
        echo "  ⚠ QEMU exited early"
        break
    fi
    if grep -qF "$DONE_MARKER" "$LOG"; then
        break
    fi
    sleep 1
    waited=$((waited + 1))
done

fail=0
for s in "${EXPECT[@]}"; do
    if grep -qF "$s" "$LOG"; then
        echo "  ✅ saw: $s"
    else
        echo "  ❌ missing: $s"
        fail=1
    fi
done

echo "============================"
if [ "$fail" -ne 0 ]; then
    echo "❌ TEST FAILED — captured output (${waited}s) was:"
    sed 's/^/    | /' "$LOG"
    exit 1
fi
echo "✅ TEST PASSED (boot output seen in ${waited}s)"
