# Contributing to BuildMyOS

## Code Standards

### C Code Style
- 4-space indentation, no tabs.
- Max line length: 100 characters.
- Doc comment required for every non-trivial function.
- Prefer fixed-width types (`uint32_t`, etc.) for hardware registers.

### Assembly Code Style
- Lowercase instruction mnemonics.
- Comment every non-obvious instruction.
- Keep entry/boot code in the `.text.boot` section.

### Commit Standards

```
type: short imperative subject

Longer explanation of the change. Explain WHY, not just WHAT.

References: #123 (if applicable)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Testing

- Every change must build with `make clean && make` (no new warnings).
- Boot-test on QEMU with `make run` and confirm the banner appears.
- New features should come with notes on how to verify them.

## Review Process

1. Create a feature branch.
2. Make focused changes.
3. Build and boot-test locally.
4. Open a pull request describing the change.
5. Address review feedback.
6. Merge once approved and green.
