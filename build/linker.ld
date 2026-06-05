/*
 * BuildMyOS Linker Script
 *
 * Arranges the kernel image in memory for the QEMU 'virt' machine.
 *
 * The 'virt' board places RAM at 0x40000000. We load the kernel at
 * 0x40080000, the conventional AArch64 kernel load address (0x80000 above
 * the base of RAM), leaving room below for boot data such as the device
 * tree blob.
 *
 * Every section is page-aligned, which guarantees that the .bss size is a
 * multiple of 8 so the bootloader's word-at-a-time clear loop is exact.
 */

ENTRY(_start)

MEMORY {
    RAM (rwx) : ORIGIN = 0x40080000, LENGTH = 256M
}

SECTIONS {
    /* Executable code. The bootloader (.text.boot) must come first. */
    .text ORIGIN(RAM) : {
        KEEP(*(.text.boot))
        *(.text)
        *(.text.*)
        . = ALIGN(4096);
    } > RAM

    /* Read-only data: constants and string literals. */
    .rodata : {
        *(.rodata)
        *(.rodata.*)
        . = ALIGN(4096);
    } > RAM

    /* Initialized read-write data. */
    .data : {
        *(.data)
        *(.data.*)
        . = ALIGN(4096);
    } > RAM

    /* Uninitialized data, zeroed by the bootloader. */
    .bss (NOLOAD) : {
        _bss_start = .;
        *(.bss)
        *(.bss.*)
        *(COMMON)
        . = ALIGN(4096);
        _bss_end = .;
    } > RAM

    /* Boot stack lives just above .bss and grows downward. */
    . = ALIGN(16);
    . += 0x4000;            /* 16 KiB */
    _stack_top = .;

    /DISCARD/ : {
        *(.comment)
        *(.note.*)
    }
}
