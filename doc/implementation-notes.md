# Implementation notes — Standing Waves

Developer companion to [model.md](./model.md), which explains the physics.

## The shape of the code

Four screens, three different kinds of model, one shared vocabulary.

```
src/common/model/
  acoustics.ts        the sign conventions — u = ∂ξ/∂t, p = −ρc²∂ξ/∂x, p = ±ρc·u
  PipeTermination.ts  the three end pairs, and every consequence: fₕ, kₕ, which harmonics exist
  modeShapes.ts       φₕ(x) and ψₕ(x), and the node positions of each
  PipeModalModel.ts   a driven damped oscillator per mode — Standing Waves + Instruments
src/reflection/model/SpringChainModel.ts    a velocity-Verlet lattice — Reflection only
src/phase-relationships/model/PhaseModel.ts a closed-form travelling wave — Phase only
```

There is deliberately **no shared screen model**. A lattice, a closed form and a modal bank have
almost no state in common, so what is shared are pure modules plus one model (`PipeModalModel`) that
two screens compose.

### `acoustics.ts` is the single source of the signs

Every screen goes through it. A sign slip on one screen and not another is exactly the bug that file
exists to prevent, and `tests/acoustics.test.ts` pins it against an analytic plane wave rather than
against the implementation.

### `PipeTermination.ts` indexes by the pipe's *own* fundamental

`modeFrequency(h, …)` is `h · f₁`, where f₁ is c/2L or c/4L depending on the pair. A stopped pipe
therefore has no mode at even `h` — which is what `isModeAllowed` reports and what the overtone
ladder greys out. Indexing against the open-pipe fundamental instead would put a stopped pipe's modes
at half-integers and lose the "odd harmonics" statement entirely.

`modeWavenumber` is derived from `modeFrequency` rather than written out per case, so the two can
never disagree about where a mode sits.

## Integrator choices

Two different integrators, for two different reasons — worth not "unifying".

**The lattice uses velocity Verlet.** It is undamped and conservative, and a pulse is watched over
many round trips; RK4 would bleed amplitude visibly over that span. Verlet is symplectic and holds
the energy to a bounded oscillation. Sub-stepped against the explicit limit
`dt < 2/ω_max = √(m/k)`, with `CHAIN_STABILITY_SAFETY` keeping the actual step below a fraction of
it.

**The modal bank uses RK4.** That system is *not* conservative — the whole point is that damping and
drive balance — so there is no energy to preserve. What matters instead is that the amplitude
converges to the right Lorentzian without phase creep over the thousands of cycles a build-up spans.
Sub-stepped so the fastest mode present takes steps of at most `MAX_PHASE_STEP` radians of its own
phase: the top of the ladder is two orders of magnitude faster than the fundamental, and a step sized
for the fundamental would integrate it into nonsense.

## Accumulated phase, not ωt

Both the modal bank and the Phase screen integrate `Θ += ω·dt` rather than computing `ωt`. Dragging
the frequency or wavelength slider then changes the *rate* of a continuous phase instead of
discontinuously relocating the wave. Same trick as `Resonance`'s `drivingPhaseProperty`.

## Slow motion lives in the screen models

Each screen model converts a frame's wall-clock `dt` into model seconds
(`REFLECTION_TIME_SCALE`, `PHASE_TIME_SCALE`, `HARMONIC_TIME_SCALE`, `INSTRUMENTS_TIME_SCALE`) and clamps it with `MAX_FRAME_DT_S` so a
backgrounded tab cannot hand over one enormous `dt`. **Do not** "fix" the animation speed by scaling
`c` or `fₕ` instead: every readout in the sim would start lying.

`TimeModel.speedMultiplier` applies the default 0.4 Slow rate. Each screen's `TimeControlNode`
includes SceneryStack's Normal / Slow radios; Slow is selected by default. Phase uses
`PHASE_TIME_SCALE` (half of `HARMONIC_TIME_SCALE`) because its default wave is one wavelength
long and would otherwise oscillate twice as fast as the other screens' fundamental.

## View layer

```
src/common/view/
  ChartFrame.ts               bamboo chrome — ported from WaveComposer, repointed at this sim
  TraceStripNode.ts           N curves of a quantity vs. position, one shared x axis
  ParticleRowNode.ts          CanvasNode row of longitudinally oscillating markers
  PipeNode.ts                 walls, bore, and the two end treatments
  StandingWavesNumberControl.ts  themed slider; accessible name required, keyboard steps explicit
```

### Everything is laid out at a common **origin**, never by bounds

This is the one layout rule to preserve. Both the pipe and the trace strips put *model x = 0* at
their own *local x = 0*, but their **bounds** start in different places — a closed end's cap juts out
to negative x, a tick label straddles the origin, a rotated axis title reaches left of its plot. A
`VBox` (which aligns bounds) therefore slides the traces a few pixels out of register with the pipe,
and worse, by a *different* few pixels when the learner changes the termination.

So the stacks are positioned by hand, by `.x`/`.y`, against a shared origin. The whole point of the
stack is that a feature in the pipe and the feature in the trace below it share a screen x.

### Why not ACPhasor's `WaveformNode`

It was the obvious candidate — a proven multi-trace scope with two independent y-axes on one time
base. But its traces are *analytic sinusoids* (`setTrace(i, amplitude, ω, φ)`), and two of these
screens plot things that are not sinusoids: a dispersing pulse on a lattice, and a sum of a dozen
modes with independent amplitudes. `TraceStripNode` takes a sampling callback instead, and it keeps
the rules from `WaveformNode` that matter: a footprint frozen at construction, a per-trace full
scale, and each caption drawn in its own trace colour so no separate legend is needed.

### `TraceStripNode` scales are functions, not numbers

`fullScale` is a `() => number` because the natural scale moves with the model. This is where the
Standing Waves screen earns its frequency slider:

> Both traces are drawn against **the amplitude the selected harmonic would reach at resonance**, not
> against their own current peak. That is what makes three states legible on one fixed scale — off
> resonance a visible sliver, building up a growth from nothing to full height, at resonance a filled
> strip. Normalising to the instantaneous peak would make all three look identical and destroy the
> point of having a slider at all.

The broad slider spans all pipe geometries, so its resonances are too narrow for pointer
adjustment by itself. The ±50 Hz fine-tune slider is centred on the last broad frequency choice.
When that choice crosses into another harmonic's region, `PipeModalModel` clears the old modal
state and lets the new mode build from rest; otherwise a low harmonic can clip a high harmonic's
trace for several seconds.

Pressure needs its own scale, not a multiple of the displacement one: p carries a factor of kₕ, so
the resonant pressure falls only as 1/h while the resonant displacement falls as 1/h². Hence
`PipeModalModel.resonantPressureAmplitude`.

### Drawn amplitudes are exaggerated, and that is a view decision

Real acoustic displacements are a tiny fraction of any drawn particle spacing. `PARTICLE_AMPLITUDE_SPACINGS`
is greater than 1 because what the eye reads is not the displacement but its *gradient* — the
crowding — which for a pulse this wide is about a tenth of the displacement. It stays well below the
value at which neighbouring particles would cross and the row would read as passing through itself.
The system is linear, so none of this touches the physics.

## Colour is a contract

`displacement = grey/black`, `velocity = red`, `pressure = blue`, on every screen, in every trace,
arrow, envelope and legend. This is the palette on Dan Russell's acoustics demos, where many learners
will have met these curves first.

Russell's own mass-spring page uses a *different* pair of colours from his phase pages. The sim
deliberately does **not** reproduce that: a palette that changes between screens teaches that colour
carries no meaning. Never colour one of the three quantities by anything else — not by screen, not by
mode number, not by termination.

## Accessibility

Each screen has a live `currentDetails` paragraph that states **the conclusion**, not just the state.
On Reflection it says which quantity flipped; on Phase, whether velocity and pressure are in phase;
on Instruments, that a stopped pipe sounds an octave below an open one of the same length. Those are
things a sighted learner reads off two aligned curves in an instant, and a description that only
named the numbers would omit the entire lesson.

The node markers carry **both** names of each point — `ξ = 0, p max` — for the same reason: labelling
a node with one of its two names is what produces the misconception that a node is a place where
nothing is happening.

## Testing

145 vitest specs; `happy-dom`, template `tests/setup.ts`.

| Path | Covers |
|---|---|
| `tests/acoustics.test.ts` | sign conventions against an analytic plane wave; p = ±ρc·u both ways |
| `tests/PipeTermination.test.ts` | c/2L, c/4L, the 2:1 octave, the odd series |
| `tests/modeShapes.test.ts` | boundary conditions, ψ = −(1/k)dφ/dx numerically, the quarter-wave offset |
| `tests/SpringChainModel.test.ts` | energy conservation, wave speed, **the reflection signs**, free-end convergence |
| `tests/PipeModalModel.test.ts` | Lorentzian, half-power points, τ = Q/(πfₕ), ring-down, odd-only enforcement |
| `tests/instrumentPresets.test.ts` | the flute/clarinet octave and their harmonic sets |
| `tests/memory-leak.test.ts` | model collection after dispose; view nodes releasing linked Properties |

Two habits worth keeping:

- **Anchor to published or textbook values**, never to the implementation's own output.
- **View-node leaks are asserted by listener count against a baseline**, not by `hasListeners()`.
  `PipeModalModel` puts its own `DerivedProperty`s on its geometry Properties, so those always carry
  listeners and `hasListeners()` can never fall to false however clean the node is.

### A trap worth knowing when writing tests

On resonance a mode lags the drive by π/2, so immediately after `settleToSteadyState()` (which leaves
Θ = 0) the resonant mode is at its **zero crossing** and an instantaneous snapshot of the pipe is
dominated by the small, nearly in-phase off-resonant modes. Shape assertions must first advance to
the mode's extremum — see `settleAtPeak()` in `PipeModalModel.test.ts`. Two tests failed this way
before the helper existed.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

Use `?screens=1` … `?screens=4` to open one screen directly. `?showVelocityTrace=true` adds the
velocity curve on the screens where it is optional.
