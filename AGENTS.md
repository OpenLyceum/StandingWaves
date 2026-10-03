# AGENTS.md — Standing Waves

Sim-specific context for AI assistants. General SceneryStack guidance:
[OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).
Fleet structure rules: [Baton/CONVENTIONS.md](https://github.com/OpenLyceum/Baton/blob/main/CONVENTIONS.md).

## Project

Longitudinal standing waves in a pipe, in four screens: **Reflection**, **Phase**,
**Standing Waves**, **Instruments**.

Everything on screen follows from two definitions (`u = ∂ξ/∂t`, `p = −ρc²∂ξ/∂x`) and two boundary
conditions (closed: ξ = 0; open: p = 0). Nothing about the harmonic series is entered as data.

Read [`doc/model.md`](doc/model.md) before changing any physics and
[`doc/implementation-notes.md`](doc/implementation-notes.md) before changing the view layer. Both are
current and specific; neither is a stub.

### The three abstractions to understand first

| File | Why it matters |
|---|---|
| `src/common/model/acoustics.ts` | The **single source of the sign conventions**. Every screen goes through it, so a sign slip cannot affect one screen and not another. |
| `src/common/model/PipeTermination.ts` | The three end *pairs* and every consequence — fₕ, kₕ, which harmonics exist. Modes are indexed by **the pipe's own fundamental**, so a stopped pipe simply has no mode at even h. That is what makes "odd harmonics only" expressible. |
| `src/common/model/PipeModalModel.ts` | The air column as one driven damped oscillator **per mode**. Shared by Standing Waves and Instruments. |

## Key files

| Area | Location |
|---|---|
| Sign conventions, ρc, ρc² | `src/common/model/acoustics.ts` |
| Terminations, mode ladder | `src/common/model/PipeTermination.ts` |
| φₕ(x), ψₕ(x), node positions | `src/common/model/modeShapes.ts` |
| Driven modal bank | `src/common/model/PipeModalModel.ts` |
| When nodes exist to mark (`standingModeProperty`) | `src/common/model/PipeModalModel.ts`, `src/standing-waves/view/NodeMarkersNode.ts` |
| Velocity-Verlet lattice | `src/reflection/model/SpringChainModel.ts` |
| Closed-form travelling wave | `src/phase-relationships/model/PhaseModel.ts` |
| Chart chrome (ported from WaveComposer) | `src/common/view/ChartFrame.ts` |
| Multi-trace strip | `src/common/view/TraceStripNode.ts` |
| Oscillating particle row | `src/common/view/ParticleRowNode.ts` |
| Density slabs (Reflection, Phase, Standing Waves) | `src/common/view/DensitySlabsNode.ts` |
| Neighbour pair probe (Phase) | `src/phase-relationships/view/NeighbourPairNode.ts` |
| Pipe, walls and end treatments | `src/common/view/PipeNode.ts` |
| Themed slider | `src/common/view/StandingWavesNumberControl.ts` |
| Drive-frequency slider (per-pipe range, mode ticks) | `src/standing-waves/view/DriveFrequencyControl.ts` |
| Automatic frequency sweep (model: `isSweepingProperty`, `getSweepRate`) | `src/common/model/PipeModalModel.ts`, `src/standing-waves/view/SweepButton.ts` |
| Constants (SI + layout px) | `src/StandingWavesConstants.ts` |
| Colors | `src/StandingWavesColors.ts` |

## Model

Physics and behavior: `doc/model.md`.

## Accessibility

The three required layers are wired: `accessibleName` on every control, a live
`ScreenSummaryContent` per screen, and an explicit `pdomOrder` wrapper Node.

Each screen's live paragraph states **the conclusion**, not just the state — which quantity flipped on
reflection, whether velocity and pressure are in phase, that a stopped pipe sounds an octave below an
open one of the same length. Those are read off aligned curves in an instant by a sighted user; a
description that only named the numbers would omit the lesson.

The node markers carry **both** names of each point (`ξ = 0, p max`) for the same reason: labelling a
node with one of its two names is what produces the misconception that a node is a place where nothing
is happening.

The reference marker on the Phase screen is draggable by pointer **and** by keyboard, via a
`KeyboardListener` on arrow keys rather than a `KeyboardDragListener` — that class works in `Vector2`
and the marker has a single scalar coordinate.

## Compliance carve-outs

None. Root `StandingWavesConstants.ts` / `*Colors.ts` / `*Namespace.ts`, standard screen layout and
full a11y wiring all pass Baton's compliance check as-is.

## Testing

175 vitest specs; `happy-dom`, template `tests/setup.ts`.

| Path | Covers |
|---|---|
| `tests/acoustics.test.ts` | sign conventions vs. an analytic plane wave; p = ±ρc·u both directions |
| `tests/PipeTermination.test.ts` | c/2L, c/4L, the exact 2:1 octave, the odd series |
| `tests/modeShapes.test.ts` | boundary conditions, ψ = −(1/k)dφ/dx numerically, the quarter-wave offset |
| `tests/SpringChainModel.test.ts` | energy conservation, wave speed, **the reflection signs**, free-end convergence |
| `tests/PipeModalModel.test.ts` | Lorentzian, half-power points, Qₕ = h·Q₁, shared τ, ring-down, nodes held through the cycle, odd-only enforcement, per-pipe drive range, the automatic sweep, when the pipe holds a standing mode |
| `tests/instrumentPresets.test.ts` | the flute/clarinet octave and their harmonic sets |
| `tests/DriveFrequencyControl.test.ts` | each mode tick sits under the thumb for every pipe; odd-only ticks on a stopped pipe; manual tuning locked while sweeping |
| `tests/PhaseModel.test.ts` | δρ/ρ = −∂ξ/∂x, peak kA, the pair's kΔx lag and finite-difference squeeze |
| `tests/memory-leak.test.ts` | model collection after dispose; view nodes releasing linked Properties |

Two habits to keep:

- **Anchor assertions to published or textbook values**, never to the implementation's own output, so
  a wrong constant fails instead of being locked in.
- **Assert view-node leaks by listener count against a baseline**, not `hasListeners()`.
  `PipeModalModel` puts its own `DerivedProperty`s on its geometry Properties, so those always carry
  listeners and `hasListeners()` can never fall to false however clean the node is.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

Use `?screens=1` … `?screens=4` to open one screen directly — much faster than clicking through the
home screen. `?showVelocityTrace=true` adds the velocity curve where it is optional.

## Development notes

### Things that will bite you

- **Do not lay out the pipe and its trace strips with a `VBox`.** Both put model x = 0 at their own
  local x = 0, but their *bounds* start in different places (a closed end's cap juts to negative x, a
  tick label straddles the origin, a rotated axis title reaches left of its plot). Aligning bounds
  slides the traces out of register with the pipe — and by a different amount when the termination
  changes. Position by `.x`/`.y` against a shared origin.
- **Do not scale `c` or `fₕ` to slow the animation down.** Slow motion is applied to the *clock*, per
  screen (`REFLECTION_TIME_SCALE`, `PHASE_TIME_SCALE`, `HARMONIC_TIME_SCALE`, `INSTRUMENTS_TIME_SCALE`),
  plus a long default pipe (1 m) so the fundamental is low to begin with. TimeControlNode's
  Slow speed, selected by default, multiplies those rates by 0.4. Every frequency in the model is a
  true SI value and the readouts say so.
- **Qₕ = h·Q₁, not one Q for every mode.** Every mode shares the fundamental's damping rate. A single
  Q let the off-resonant modes, which move with the drive rather than a quarter cycle behind it, reach
  half the resonant amplitude at h = 3, and the nodes swam through each cycle. Don't flatten it back;
  `tests/PipeModalModel.test.ts` pins the third harmonic's nodes. See `doc/model.md`.
- **The two integrators are different on purpose.** The lattice is conservative and needs a symplectic
  method (velocity Verlet); the modal bank is damped and driven and needs accuracy over thousands of
  cycles (RK4). Don't unify them.
- **On resonance a mode lags the drive by π/2.** Straight after `settleToSteadyState()` (Θ = 0) the
  resonant mode is at its *zero crossing*, and a snapshot of the pipe is dominated by the small
  off-resonant modes. Any shape assertion must first advance to the mode's extremum — see
  `settleAtPeak()` in `tests/PipeModalModel.test.ts`. Two tests failed this way before that helper.
- **Pressure needs its own trace scale**, not a multiple of the displacement scale: p carries a factor
  of kₕ, so resonant displacement falls as 1/h while resonant pressure is flat in h. Hence
  `resonantPressureAmplitude`.
- **Trace scales are the *resonant* amplitude, not the current peak.** Normalising to the instantaneous
  peak would make off-resonance, building-up and at-resonance all look identical and destroy the point
  of the frequency slider.
- **Density is shaded from the model's pressure, not from the drawn gaps.** δρ/ρ = p/(ρc²), so the
  slab tint and the pressure trace are one quantity by construction; the drawn gaps are exaggerated
  and would not be. "Show air density" (Reflection, Phase, Standing Waves) and "Show neighbour pair" (Phase) are off by
  default, so the screens look as before until a teacher turns them on.
- **Drawn particle amplitudes are exaggerated** (`PARTICLE_AMPLITUDE_SPACINGS > 1`) because the eye
  reads the *gradient*, not the displacement. The system is linear; this touches no physics.

### Colour is a contract

`displacement = grey/black`, `velocity = red`, `pressure = blue` — on every screen, in every trace,
arrow and marker. This is Dan Russell's palette, where many learners first meet these curves.

Russell's own mass-spring page uses a different pair of colours from his phase pages; the sim
deliberately does **not** reproduce that, because a palette that changes between screens teaches that
colour carries no meaning. Never colour one of the three quantities by anything else.
