# Targeted functional review — 2026-10-04

## Scope

Modal drive/sweep controls, harmonic selection, steady-state initialization, reset/disposal and existing acoustics/mode suites.

## Finding and fix

### Harmonic selection with the driver off

Selecting an overtone called jumpToHarmonic(), which populated a forced steady-state response without enabling the driver. The selected mode immediately rang down on subsequent steps. Selecting a valid harmonic now enables the driver before tuning and settling. A regression starts with the driver off and verifies the selected harmonic and driving state.

## Validation

- `npm run lint`, `npm run check`, `npm test` (190 passing tests), and `npm run build` passed.
- `npm run test:fuzz:quick` passed: pointer and keyboard smoke, 10 seconds each.
- The new regression failed with the original behavior and passed with the fix.
- Checks used the available Node 22.12.0 runtime; the repository declares Node >=24.

This was a targeted source and regression review, not an exhaustive audit.
