/*
 * BuildMyOS Kernel
 * Core kernel entry point.
 *
 * This is the first C code that runs after the bootloader has set up the
 * stack and cleared .bss. It brings up the UART and prints a banner, then
 * idles in a low-power loop.
 *
 * Hardware target: QEMU 'virt' machine, ARM PL011 UART at 0x09000000.
 */

#include <stdint.h>

/* PL011 UART registers (QEMU 'virt' machine). */
#define UART0_DR  ((volatile uint32_t *)0x09000000) /* Data register        */
#define UART0_FR  ((volatile uint32_t *)0x09000018) /* Flag register        */
#define UART0_CR  ((volatile uint32_t *)0x09000030) /* Control register     */

#define UART_FR_TXFF   (1u << 5)   /* Transmit FIFO full   */
#define UART_CR_UARTEN (1u << 0)   /* UART enable          */
#define UART_CR_TXE    (1u << 8)   /* Transmit enable      */

/**
 * uart_init() - Enable the UART for console output.
 *
 * QEMU's PL011 already transmits without explicit setup, but we enable the
 * UART and its transmitter explicitly so the driver is correct on hardware
 * and other emulators too.
 */
void uart_init(void)
{
    *UART0_CR = UART_CR_UARTEN | UART_CR_TXE;
}

/**
 * uart_putchar() - Transmit a single byte.
 * @c: byte to send.
 *
 * Spins until the transmit FIFO has room, then writes the byte.
 */
void uart_putchar(char c)
{
    while (*UART0_FR & UART_FR_TXFF) {
        /* wait for space in the TX FIFO */
    }
    *UART0_DR = (uint32_t)(unsigned char)c;
}

/**
 * uart_puts() - Transmit a NUL-terminated string.
 * @str: string to send (may be NULL).
 *
 * Translates '\n' to "\r\n" so lines render correctly on a serial console.
 */
void uart_puts(const char *str)
{
    if (!str) {
        return;
    }
    while (*str) {
        if (*str == '\n') {
            uart_putchar('\r');
        }
        uart_putchar(*str++);
    }
}

/**
 * main() - Kernel entry point, called from the bootloader.
 *
 * Initializes the console, prints a banner and system info, then enters a
 * low-power idle loop. Never returns in normal operation.
 */
int main(void)
{
    uart_init();

    uart_puts("\n");
    uart_puts("╔════════════════════════════════════════╗\n");
    uart_puts("║       BuildMyOS Kernel v0.1.0          ║\n");
    uart_puts("║   Professional OS Development System    ║\n");
    uart_puts("╚════════════════════════════════════════╝\n");
    uart_puts("\n");

    uart_puts("[INFO] ARM64 Bootstrap Complete\n");
    uart_puts("[INFO] Processor: Cortex-A72\n");
    uart_puts("[INFO] Architecture: ARMv8 (64-bit)\n");
    uart_puts("[INFO] UART initialized for console output\n");
    uart_puts("[INFO] Kernel is ready\n");
    uart_puts("\n");

    uart_puts("[KERNEL] Entering main loop...\n");

    for (;;) {
        /* WFE: halt the core until an event/interrupt arrives (low power). */
        __asm__ __volatile__("wfe");
    }

    return 0;
}

/**
 * abort() - Last-resort halt, referenced by some freestanding builds.
 */
void abort(void)
{
    uart_puts("[PANIC] abort() called\n");
    for (;;) {
        __asm__ __volatile__("wfe");
    }
}
