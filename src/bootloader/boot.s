/*
 * BuildMyOS Bootloader
 * ARM64 / AArch64 bootstrap code.
 *
 * Responsibilities:
 *   1. Set up the stack pointer.
 *   2. Zero the .bss section so static variables start at 0.
 *   3. Jump to the C entry point main().
 *
 * Reference: ARM Cortex-A Series Programmer's Guide for ARMv8-A,
 *            Linux arch/arm64/kernel/head.S (bring-up pattern).
 *
 * The symbols _bss_start, _bss_end and _stack_top are provided by the
 * linker script (build/linker.ld) so the addresses always match the
 * final memory layout.
 */

.section ".text.boot"
.global _start
.align 4

_start:
    /*
     * Entry point. On the QEMU 'virt' machine the CPU enters here with:
     *   x0 = device-tree blob address (ignored for now)
     * Set up a stack; it grows downward from _stack_top.
     */
    ldr     x0, =_stack_top
    mov     sp, x0

    /*
     * Zero the .bss section: [_bss_start, _bss_end).
     * Pointer-compare loop so it terminates safely regardless of the
     * exact section size (the linker page-aligns _bss_end).
     */
    ldr     x0, =_bss_start
    ldr     x1, =_bss_end
    cmp     x1, x0
    b.ls    _bss_done
_bss_loop:
    str     xzr, [x0], #8           // store 0, post-increment by 8 bytes
    cmp     x0, x1
    b.lo    _bss_loop
_bss_done:

    /* Enter the kernel. main() never returns in normal operation. */
    bl      main

    /* If main() ever returns, halt the CPU in a low-power wait. */
_hang:
    wfe                             // wait for event
    b       _hang
