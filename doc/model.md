# Model — Standing Waves

This document describes the physics for an educator. Its companion,
[implementation-notes.md](./implementation-notes.md), targets developers.

## Overview

The simulation is about **longitudinal** waves in a column of air, and specifically about three
things that a picture of "sound as a wiggly line" hides:

1. **Displacement, velocity and pressure are three different quantities** that peak in different
   places and at different times. Air moving fastest is not air most compressed — except in a
   forward-travelling wave, where it is; reverse the wave and the relationship inverts.
2. **An open pipe end and a closed pipe end reflect a pulse differently**, and in exactly
   complementary ways: a closed end flips the displacement and preserves the pressure; an open end
   flips the pressure and preserves the displacement.
3. **In a standing wave, a pressure antinode sits where the displacement has a node.** This is the
   single most-missed idea in introductory acoustics, and it is what makes a stopped pipe sound an
   octave low with only odd harmonics.

Everything the sim shows follows from two definitions and two boundary conditions. Nothing about
the harmonic series is entered as data.

## Quantities and units

Every quantity in the model is a real SI value. There are no scaled or dimensionless stand-ins.

| Quantity | Symbol | Units | Range / value |
|---|---|---|---|
| Particle displacement | ξ | m | ~10⁻³ (derived) |
| Particle velocity | u = ∂ξ/∂t | m/s | derived |
| Acoustic (gauge) pressure | p | Pa | derived |
| Position along pipe | x | m | 0 … L |
| Pipe length | L | m | 0.20 – 1.00 (default 0.50) |
| Speed of sound | c | m/s | 343 (fixed) |
| Air density | ρ | kg/m³ | 1.204 (fixed) |
| Characteristic impedance | ρc | Pa·s/m | 413 |
| Bulk modulus | ρc² | Pa | 1.42 × 10⁵ |
| Drive frequency | f | Hz | ~85 – 2800 |
| Quality factor of the fundamental | Q₁ | — | 12; harmonic h has Qₕ = h·Q₁ |

`c` and `ρ` are held fixed deliberately. Making the sound speed adjustable would let a learner
change every frequency in the sim without changing anything they can see in the pipe.

## The two definitions

```
u = ∂ξ/∂t
p = −ρc² ∂ξ/∂x
```

The minus sign is the whole convention: where air is squeezed together the displacement gradient is
negative, so **a compression is a positive pressure**.

For a plane wave travelling in the ±x direction these combine into

```
p = ± ρc · u
```

so velocity and pressure are **in phase** in a forward-going wave and **180° out of phase** in a
backward-going one. That single sign is the content of the Phase screen.

### Density

Mass conservation for a thin slab of air gives the third name for the same quantity:

```
δρ/ρ = −∂ξ/∂x = p/(ρc²)
```

−∂ξ/∂x is how far two neighbouring particles have closed the gap between them, so **air is denser
only where neighbours move out of step**. Neighbours that move together carry their slab along
without squeezing it — which is why an open end (∂ξ/∂x = 0) has normal density and no pressure, and
why a rigid wall, where the neighbour on one side cannot move, has the most.

The Reflection, Phase and Standing Waves screens can draw this ("Show air density"): the bore is cut into slabs
whose walls ride with the air, each tinted pressure-blue by its density. On the Phase screen a
"neighbour pair" marks two particles Δx = L/12 apart. In a travelling wave they are out of step by
kΔx, and the slab between them is squeezed by the finite difference
−[ξ(x+Δx/2) − ξ(x−Δx/2)]/Δx, which tends to δρ/ρ as Δx → 0.

On the Standing Waves screen the shading makes the counter-intuitive half of a standing wave visible:
the density swings hardest at the **displacement nodes**, where the air on both sides converges and
then pulls apart, and barely changes at the displacement antinodes, where neighbours move together.
The full tint there is the selected harmonic's resonant pressure amplitude, so off resonance the
shading stays near its resting level, just as the traces stay a sliver.

## The two boundary conditions

| End | Physical constraint | Displacement | Pressure |
|---|---|---|---|
| **Closed** (rigid) | cannot move: ξ = 0 | node — reflects **inverted** | antinode — reflects **upright** |
| **Open** | held at room pressure: p = 0 | antinode — reflects **upright** | node — reflects **inverted** |

They are exact opposites, which is why one quantity inverts on reflection and the other does not.

## The harmonic series

Because the mode series depends on the *combination* of ends, the sim names the pair rather than
each end separately:

| Termination | Displacement shape φₕ(x) | Pressure shape ψₕ(x) | f₁ | Harmonics |
|---|---|---|---|---|
| Closed–Closed | sin(kₕx) | −cos(kₕx) | c/2L | 1, 2, 3, 4, … |
| Open–Open | cos(kₕx) | +sin(kₕx) | c/2L | 1, 2, 3, 4, … |
| Closed–Open | sin(kₕx) | −cos(kₕx) | c/4L | 1, 3, 5, 7, … |

with `fₕ = h·f₁` and `kₕ = 2πfₕ/c`, and ψₕ = −(1/kₕ)·dφₕ/dx.

Two consequences worth stating to a class:

- **A stopped pipe's fundamental is an octave below** an open pipe of the same length, which is why
  a stopped organ pipe can be built half as long as the note it sounds.
- **A stopped pipe sounds only the odd harmonics.** Closed–Open shares its *formulas* with
  Closed–Closed; only kₕ differs, and that alone deletes every even mode.

Note that ψₕ is the **derivative** of φₕ. Differentiating a sine gives a cosine, so the two shapes
are always a quarter wavelength apart in space — that is the whole reason a pressure antinode lands
on a displacement node. Note also that both carry the same cos(ωₕt): in a standing wave displacement
and pressure are in phase in *time* and offset in *space*, the exact opposite of the travelling wave
on the Phase screen.

## Screen by screen

### Reflection — a mass-spring chain

A chain of 80 point masses joined by springs, the mechanical analogue of an air column. Each mass
obeys the same law,

```
m·ξ̈ᵢ = k(ξᵢ₊₁ − 2ξᵢ + ξᵢ₋₁)
```

and an end differs only in which neighbours it has: a closed end is pinned (ξ = 0), an open end
simply has no spring beyond it, which is the discrete form of ∂ξ/∂x = 0. **The inversion is never
programmed in — it emerges.** That is why the screen integrates a lattice rather than drawing a
formula: with an image-source formula, the sign being demonstrated would be the sign we typed.

The chain is calibrated to the medium: with spacing a = L/(N−1), the stiffness ratio is set by
k/m = (c/a)², so the chain carries waves at the true speed of sound.

The launched pulse is a Gaussian in *displacement*, with velocities set to −c·∂ξ/∂x so that it
travels one way only. Its pressure signature is therefore the gradient of a Gaussian: a rarefaction
lobe and a compression lobe, compression leading. What reflection does to that ordering is the
comparison the screen draws.

**Known simplification — lattice dispersion.** A discrete chain is dispersive:
ω = 2√(k/m)·|sin(qa/2)| rather than the continuum ω = cq. Short-wavelength components therefore
travel slower than long ones and a pulse slowly spreads over many round trips. This is a real
property of the model, not a defect, and it is why the pulse is launched several lattice cells wide —
wide enough that the spreading stays below the line width over the couple of round trips the screen
is meant to show.

### Phase — a travelling wave in closed form

ξ(x,t) = A·cos(ωt ∓ kx), with u and p taken as exact analytic derivatives. No integration, no
reflections, no transients: the screen makes a claim about an *ideal* plane wave, and anything else
on screen would only muddy it.

### Standing Waves — a driven modal bank

Each mode h carries its own amplitude obeying

```
äₕ + (ωₕ/Qₕ)·ȧₕ + ωₕ²·aₕ = F·cos(Θ),     Qₕ = h·Q₁
```

and the pipe is the sum Σ aₕ(t)·φₕ(x). Summing two counter-propagating waves instead would produce a
perfect standing wave at *any* frequency, which is precisely the thing that is not true of a real
pipe. This way two behaviours come out for free rather than being animated by hand:

- the **steady-state response is a Lorentzian**, so resonance is something to hunt for;
- the **build-up takes the right time**, τ = 2Qₕ/ωₕ = Q₁/(πf₁) — the same for every mode, about
  11 s of wall clock at the default pipe on Slow, or about 4.5 s at Normal speed.

Q₁ = 12 is lower than a real organ pipe (30–50), chosen so the resonance is broad enough to find by
dragging a slider and the build-up is watchable rather than tens of seconds long.

**Why Qₕ rises with h.** Every mode is given the same damping *rate* ω₁/Q₁, so Qₕ ∝ fₕ. Real pipes
go the same way (viscous and thermal wall losses give Q ∝ √f); this is the simplest such law. It
matters for the *shape*: the drawn field sums every mode, the resonant one lags the drive by π/2
while the off-resonant ones move with it, and their share relative to the resonant mode scales as
1/Qₕ. With one Q for all modes that share reached about half the resonant amplitude at h = 3, and
the nodes visibly swam back and forth through each cycle. With Qₕ = h·Q₁ it is 16 % at h = 3 and
the nodes hold within about ±0.02 L while the mode is above half its peak. A lossy pipe is never a
*perfect* standing wave: at the instant the resonant mode passes through zero, only the small
off-resonant remainder is left, and its zeros are elsewhere. Two further consequences: every
resonance is the same f₁/Q₁ ≈ 14 Hz wide, and the resonant displacement falls as 1/h.

The frequency slider covers 0.5 f₁ to 8.5 f₁ of the **current** pipe
(`PipeModalModel.driveFrequencyRangeProperty`), so harmonic h always sits at the same place on the
track and a tick marks each mode the pipe has: 1–8, or only the odd ones for a stopped pipe. The top
matches the eight rungs of the overtone ladder. Changing the length or termination leaves the drive
frequency where it is and moves the ladder past it, which is itself an experiment, unless the drive
would leave the new range, in which case it is clamped. The slider's fine (1 Hz) and coarse (10 Hz)
arrow buttons stay under the ~14 Hz width of a resonance. Crossing to a
different harmonic starts its modal build-up from rest so the old mode does not obscure the new
pattern on the higher harmonic's smaller display scale.

The driver sits at the left end and is whatever kind of source that end admits: a pressure source (a
reed) against a closed end, a volume-velocity source (a jet) at an open one. Each couples to the
quantity its end has an antinode in, so both couple equally to every mode — which is *why* a reed at
the stopped end of a clarinet can excite the whole odd-harmonic ladder.

### Instruments — the same pipe, four ways

Four presets, each nothing more than a length and a termination. The flute and the clarinet are
deliberately given the **same bore length**, so that the octave and the missing harmonics are visibly
attributable to the termination alone.

Bar heights in the spectrum are the pipe's own resonant response under an equal-per-mode excitation,
which falls as Qₕ/ωₕ² ∝ 1/h. That rolloff is derived, not a timbre curve drawn to look plausible.

**Known simplifications.** A real clarinet is not a cylinder with a rigid cap, a real flute has an
embouchure hole rather than a plain open end, and both have end corrections that flatten the ideal
frequencies by a few percent. Neither the reed's nor the jet's own harmonic envelope is modelled. What
survives all of that — *which* harmonics a pipe supports and *where* its fundamental sits — is exactly
what the screen is about.

## Slow motion

Audible sound is far too fast to animate: the default 1 m pipe's 171.5 Hz fundamental has a 5.8 ms
period, and a pulse crosses the pipe in 2.9 ms. Both would alias into meaningless flicker.

So the **clock** is slowed and the physics is left alone. Every frequency, length and speed in the
model is a true SI value. Two things set how fast the screen looks:

- **A long pipe.** The pipe is drawn at a fixed pixel length whatever its metres, so a longer pipe
  means sound takes longer to cross the same pixels. The default is 1 m (range 0.5–2 m), which puts
  the fundamental at 171.5 Hz rather than the 343 Hz of a 0.5 m pipe, and caps how fast the top of
  the overtone ladder can look.
- **A per-screen clock rate.** Normal speed advances model time at 1/1500 of wall time on
  Reflection (a crossing takes ~4.4 s), 1/400 on Phase, 1/200 on Standing Waves (the fundamental
  appears to oscillate at 0.86 Hz) and 1/300 on Instruments. Phase is slower because its default
  wave is one wavelength long (f = c/L = 343 Hz); the extra factor of two puts that wave at the same
  apparent rate as the Standing Waves fundamental. Instruments keeps its real instrument lengths, so
  its clock is slowed instead; the default flute appears at 0.95 Hz.

Slow, selected by default on the playback radios, multiplies those rates by 0.4: a Reflection
crossing takes about 11 s, and the default fundamental appears to oscillate at 0.34 Hz. The readouts
still report the true frequencies; the default pipe says 171.5 Hz in either speed mode.

## Where the numbers come from

Assertions in `tests/` are anchored to textbook and published values rather than to the
implementation, so a wrong constant fails instead of being locked in:

- c/2L and c/4L, and the exact 2:1 octave between them;
- the odd-harmonic series of a stopped pipe;
- ρc ≈ 413 rayl and ρc² ≈ 1.42 × 10⁵ Pa for air at 20 °C;
- the half-power points at fₕ ± f₁/2Q₁ and the build-up constant Q₁/(πf₁), the same for every mode;
- energy conservation and the measured wave speed on the lattice;
- and, most importantly, the reflection signs at each kind of end.
