# BuildMyOS

A small, from-scratch operating system kernel written in C and **ARM64 /
AArch64** assembly, booting on the QEMU `virt` machine.

## Status

- ✅ Bootloader: stack setup + `.bss` clear, jumps to C
- ✅ Kernel: PL011 UART console, banner, idle loop
- 🚧 Drivers: planned
- 🚧 Memory management: planned

## Prerequisites

This is **AArch64** code, so it needs an AArch64 cross toolchain and QEMU.

**Linux (Debian/Ubuntu):**

```bash
sudo apt-get install gcc-aarch64-linux-gnu qemu-system-arm
```

**macOS (Homebrew):**

```bash
brew install aarch64-elf-gcc qemu        # then build with:
make CROSS_COMPILE=aarch64-elf-
```

> ⚠️ The `arm-none-eabi-` toolchain targets **32-bit** ARM (AArch32) and
> cannot build this 64-bit kernel. Use an `aarch64-*` toolchain. Override the
> prefix with `make CROSS_COMPILE=<prefix->` if yours differs.

## Build

```bash
make clean
make
```

Expected output:

```
🔧 Assembling bootloader...
  ✅ Bootloader assembled
🔧 Compiling kernel...
  ✅ Kernel compiled
🔗 Linking kernel...
  ✅ Kernel linked
📦 Generating binary...
  ✅ Binary generated: build/kernel.bin (... bytes)
```

## Run

```bash
make run
```

Expected output (exit QEMU with **Ctrl-A** then **X**):

```
╔════════════════════════════════════════╗
║       BuildMyOS Kernel v0.1.0          ║
║   Professional OS Development System    ║
╚════════════════════════════════════════╝

[INFO] ARM64 Bootstrap Complete
[INFO] Processor: Cortex-A72
[INFO] Architecture: ARMv8 (64-bit)
[INFO] UART initialized for console output
[INFO] Kernel is ready

[KERNEL] Entering main loop...
```

## Project Structure

```
src/
  bootloader/   - CPU bootstrap (boot.s)
  kernel/       - Core kernel (main.c)
  drivers/      - Hardware drivers (planned)
  ui/           - User interface (planned)
  apps/         - Built-in apps (planned)
build/
  linker.ld     - Memory layout (committed; everything else is generated)
docs/           - Documentation
tests/          - Test suite
```

## Make Targets

| Target        | Description                       |
|---------------|-----------------------------------|
| `make`        | Build the kernel                  |
| `make run`    | Boot on QEMU                      |
| `make debug`  | Boot halted with a GDB stub :1234 |
| `make dis`    | Generate disassembly              |
| `make clean`  | Remove build artifacts            |
| `make verify` | Check the build environment       |
| `make info`   | Show build configuration          |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [DEVELOPMENT.md](DEVELOPMENT.md).

## License

MIT — see [LICENSE](LICENSE).

## Resources

- [OSDev Wiki](https://wiki.osdev.org/)
- [ARM Developer Documentation](https://developer.arm.com/)
- [QEMU `virt` machine](https://www.qemu.org/docs/master/system/arm/virt.html)
