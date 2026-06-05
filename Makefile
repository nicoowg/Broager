# BuildMyOS - Professional Makefile
# Handles compilation, linking, running, and validation.
#
# NOTE ON TOOLCHAIN:
# This kernel is ARM64 / AArch64 (ARMv8) code. It MUST be built with an
# AArch64 cross toolchain (e.g. aarch64-linux-gnu- or aarch64-none-elf-).
# The classic `arm-none-eabi-` toolchain targets 32-bit ARM (AArch32) and
# CANNOT assemble/compile this code. Override CROSS_COMPILE if your
# toolchain uses a different prefix:
#     make CROSS_COMPILE=aarch64-none-elf-

# Compiler Configuration
CROSS_COMPILE ?= aarch64-linux-gnu-
CC      := $(CROSS_COMPILE)gcc
AS      := $(CROSS_COMPILE)as
LD      := $(CROSS_COMPILE)ld
OBJCOPY := $(CROSS_COMPILE)objcopy
OBJDUMP := $(CROSS_COMPILE)objdump

# Emulator
QEMU := qemu-system-aarch64
# -nic none disables the default virtio NIC so QEMU doesn't need its iPXE
# option ROM (efi-virtio.rom), which isn't always installed (e.g. minimal CI).
QEMU_FLAGS := -machine virt -cpu cortex-a72 -m 256M -nographic -nic none

# Compiler Flags
CFLAGS := -mcpu=cortex-a72 \
          -Wall -Wextra \
          -ffreestanding \
          -nostdlib \
          -fno-builtin \
          -fno-stack-protector \
          -O2

ASFLAGS := -mcpu=cortex-a72

# --no-warn-rwx-segments silences a benign warning for a flat bare-metal image.
LDFLAGS := -T build/linker.ld --no-warn-rwx-segments

# Directories
SRC_DIR   := src
BUILD_DIR := build
OBJ_DIR   := $(BUILD_DIR)/obj

# Source Files
BOOTLOADER := $(SRC_DIR)/bootloader/boot.s
KERNEL     := $(SRC_DIR)/kernel/main.c

# Object Files
BOOT_OBJ   := $(OBJ_DIR)/boot.o
KERNEL_OBJ := $(OBJ_DIR)/main.o

# Output Targets
KERNEL_ELF := $(BUILD_DIR)/kernel.elf
KERNEL_BIN := $(BUILD_DIR)/kernel.bin
KERNEL_DIS := $(BUILD_DIR)/kernel.dis

.PHONY: all
all: $(KERNEL_BIN)

# Create output directories
$(OBJ_DIR):
	@mkdir -p $(OBJ_DIR)

# Assemble bootloader
$(BOOT_OBJ): $(BOOTLOADER) | $(OBJ_DIR)
	@echo "🔧 Assembling bootloader..."
	@$(AS) $(ASFLAGS) -o $@ $<
	@echo "  ✅ Bootloader assembled"

# Compile kernel C code
$(KERNEL_OBJ): $(KERNEL) | $(OBJ_DIR)
	@echo "🔧 Compiling kernel..."
	@$(CC) $(CFLAGS) -c -o $@ $<
	@echo "  ✅ Kernel compiled"

# Link kernel
$(KERNEL_ELF): $(BOOT_OBJ) $(KERNEL_OBJ) build/linker.ld
	@echo "🔗 Linking kernel..."
	@$(LD) $(LDFLAGS) -o $@ $(BOOT_OBJ) $(KERNEL_OBJ)
	@echo "  ✅ Kernel linked"

# Generate raw binary
$(KERNEL_BIN): $(KERNEL_ELF)
	@echo "📦 Generating binary..."
	@$(OBJCOPY) -O binary $< $@
	@echo "  ✅ Binary generated: $@ ($$(stat -c%s $@ 2>/dev/null || stat -f%z $@) bytes)"

# Disassembly (for debugging)
.PHONY: dis
dis: $(KERNEL_ELF)
	@echo "📄 Generating disassembly..."
	@$(OBJDUMP) -d $< > $(KERNEL_DIS)
	@echo "  ✅ Disassembly saved to $(KERNEL_DIS)"

# Run on QEMU. -nographic muxes the UART and QEMU monitor onto your terminal.
# Exit with: Ctrl-A then X.
.PHONY: run
run: $(KERNEL_ELF)
	@echo ""
	@echo "🚀 Booting kernel on QEMU..."
	@echo "   Press Ctrl-A then X to exit QEMU"
	@echo ""
	$(QEMU) $(QEMU_FLAGS) -kernel $(KERNEL_ELF)

# Boot smoke test: build, boot on QEMU, assert the expected output appears.
.PHONY: test
test: $(KERNEL_ELF)
	@bash tests/boot_test.sh $(KERNEL_ELF)

# Debug run (halts at start, waits for GDB on :1234)
.PHONY: debug
debug: $(KERNEL_ELF)
	@echo "🐛 Starting GDB stub on port 1234..."
	@echo "   In another terminal: $(CROSS_COMPILE)gdb $(KERNEL_ELF)"
	@echo "   Then: target remote localhost:1234"
	$(QEMU) $(QEMU_FLAGS) -kernel $(KERNEL_ELF) -S -gdb tcp::1234

# Clean build artifacts (keeps the hand-written linker script)
.PHONY: clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf $(OBJ_DIR) $(KERNEL_ELF) $(KERNEL_BIN) $(KERNEL_DIS)
	@echo "  ✅ Clean complete"

# Verify build environment
.PHONY: verify
verify:
	@echo "🔍 Verifying build environment..."
	@command -v $(CC) >/dev/null 2>&1 && echo "  ✅ $(CC)" || echo "  ❌ $(CC) not found"
	@command -v $(QEMU) >/dev/null 2>&1 && echo "  ✅ $(QEMU)" || echo "  ❌ $(QEMU) not found"
	@command -v git >/dev/null 2>&1 && echo "  ✅ git" || echo "  ❌ git not found"

.PHONY: info
info:
	@echo "BuildMyOS Build Configuration"
	@echo "=============================="
	@echo "Compiler: $(CC)"
	@echo "Emulator: $(QEMU)"
	@echo "Target:   ARM64 / AArch64 (Cortex-A72)"
	@echo "Output:   $(KERNEL_BIN)"

.PHONY: help
help:
	@echo "BuildMyOS - Available targets:"
	@echo ""
	@echo "  make           - Build kernel"
	@echo "  make run       - Run on QEMU"
	@echo "  make test      - Boot on QEMU and verify output"
	@echo "  make debug     - Run with GDB stub on :1234"
	@echo "  make dis       - Generate disassembly"
	@echo "  make clean     - Remove build artifacts"
	@echo "  make verify    - Check build environment"
	@echo "  make info      - Show build configuration"
	@echo "  make help      - Show this help message"

.DEFAULT_GOAL := all
