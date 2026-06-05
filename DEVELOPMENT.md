# Development Guide

## Prerequisites

You need an **AArch64** cross toolchain and `qemu-system-aarch64`.

- Debian/Ubuntu: `sudo apt-get install gcc-aarch64-linux-gnu qemu-system-arm`
- macOS (Homebrew): `brew install aarch64-elf-gcc qemu`
  (then build with `make CROSS_COMPILE=aarch64-elf-`)

The default toolchain prefix is `aarch64-linux-gnu-`. Override it with
`make CROSS_COMPILE=<your-prefix->`.

> The `arm-none-eabi-` toolchain is for **32-bit** ARM and will not build
> this 64-bit kernel.

## Build System

```bash
make            # Build kernel (build/kernel.elf, build/kernel.bin)
make run        # Run on QEMU (exit with Ctrl-A then X)
make debug      # Run halted with a GDB stub on :1234
make dis        # Disassemble the ELF to build/kernel.dis
make clean      # Remove build artifacts
make verify     # Check that the toolchain and QEMU are present
make info       # Print the current build configuration
```

## How It Boots

1. QEMU loads `build/kernel.elf` at `0x40080000` on the `virt` machine and
   jumps to `_start` (see `src/bootloader/boot.s`).
2. The bootloader sets up the stack (`_stack_top`), zeroes `.bss`, then calls
   `main()`.
3. `main()` (in `src/kernel/main.c`) initializes the PL011 UART at
   `0x09000000`, prints the banner, and idles in a `wfe` loop.

## Memory Layout

The layout is defined in `build/linker.ld`. RAM on the `virt` board starts at
`0x40000000`; the kernel is linked at `0x40080000`. Sections are page-aligned
so the bootloader's `.bss` clear loop is exact.

## Debugging

```bash
make debug
# in another terminal:
aarch64-linux-gnu-gdb build/kernel.elf
(gdb) target remote localhost:1234
(gdb) break main
(gdb) continue
```

## Code Organization

```
src/
├── bootloader/   # CPU bootstrap (boot.s)
├── kernel/       # Core kernel (main.c)
├── drivers/      # Hardware drivers (planned)
├── ui/           # User interface (planned)
└── apps/         # Built-in applications (planned)

build/
└── linker.ld     # Memory layout (the rest of build/ is generated)
```
