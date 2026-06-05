#!/usr/bin/env bash
#
# BuildMyOS boot smoke test.
#
# Boots the freshly built kernel on QEMU, captures the serial console, and
# asserts that the expected banner and boot messages appear. Exits non-zero
# on any failure so it can be used in CI or `make test`.
#
# Usage: tests/boot_test.sh [path-to-kernel.elf]

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KERNEL="${1:-$ROOT/build/kernel.elf}"
QEMU="${QEMU:-qemu-system-aarch64}"
TIMEOUT="${TIMEOUT:-5}"

# Strings that must appear in the boot output for the test to pass.
EXPECT=(
    "BuildMyOS Kernel v0.1.0"
    "[INFO] ARM64 Bootstrap Complete"
    "[INFO] UART initialized for console output"
    "[KERNEL] Entering main loop..."
)

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
trap 'rm -f "$LOG"' EXIT

echo "  ▶ booting $KERNEL on $QEMU (${TIMEOUT}s)..."
# The kernel idles forever, so QEMU is expected to be stopped by the timeout.
# -nographic muxes the UART onto stdio; </dev/null keeps it non-interactive.
timeout "$TIMEOUT" "$QEMU" \
    -machine virt -cpu cortex-a72 -m 256M -nographic \
    -kernel "$KERNEL" </dev/null >"$LOG" 2>/dev/null

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
    echo "❌ TEST FAILED — captured output was:"
    sed 's/^/    | /' "$LOG"
    exit 1
fi
echo "✅ TEST PASSED"
