/**
 * acoustics.ts
 *
 * The sim's sign conventions, in one place. Every screen reduces to the same
 * three quantities and the same two definitions, so they live here rather than
 * being re-derived per screen — a sign slip in one screen and not another is
 * exactly the bug this file exists to prevent.
 *
 * ── The three quantities ──────────────────────────────────────────────────────
 *
 *   ξ(x, t)   particle displacement along the pipe axis   (m)
 *   u(x, t)   particle velocity      u = ∂ξ/∂t            (m/s)
 *   p(x, t)   acoustic (gauge) pressure                   (Pa)
 *
 * ── The two definitions ───────────────────────────────────────────────────────
 *
 *   u = ∂ξ/∂t
 *   p = −ρc² ∂ξ/∂x
 *
 * The minus sign in p is the whole convention: where the air is squeezed
 * together the displacement gradient is negative (particles behind are moving
 * forward faster than those ahead), so a compression is a *positive* pressure.
 *
 * ── The consequence worth knowing ─────────────────────────────────────────────
 *
 * For a plane wave travelling in the ±x direction the two are proportional:
 *
 *   p = ± ρc · u
 *
 * with ρc the characteristic impedance. So in a forward-going wave the velocity
 * and pressure are **in phase** — the air moves fastest in the +x direction
 * exactly where it is most compressed — and in a backward-going wave they are
 * **180° out of phase**. That single sign is the content of the Phase screen.
 */

import { AIR_DENSITY_KGPM3, SOUND_SPEED_MPS } from "../../StandingWavesConstants.js";

/** Direction of travel of a plane wave along the pipe axis. */
export const WaveDirection = {
  /** Travelling toward +x. */
  FORWARD: "forward",
  /** Travelling toward −x. */
  BACKWARD: "backward",
} as const;

export type WaveDirection = (typeof WaveDirection)[keyof typeof WaveDirection];

export const WaveDirectionValues = [WaveDirection.FORWARD, WaveDirection.BACKWARD] as const;

/** +1 for a forward-going wave, −1 for a backward-going one. */
export function directionSign(direction: WaveDirection): number {
  return direction === WaveDirection.FORWARD ? 1 : -1;
}

/**
 * Characteristic (specific acoustic) impedance ρc of the medium, in Pa·s/m.
 * The constant of proportionality between pressure and particle velocity in a
 * travelling plane wave, and therefore the conversion factor between the
 * velocity and pressure axes of any chart that shows both.
 */
export const CHARACTERISTIC_IMPEDANCE = AIR_DENSITY_KGPM3 * SOUND_SPEED_MPS;

/** Bulk modulus ρc² of the medium, in Pa. The constant in p = −ρc²·∂ξ/∂x. */
export const BULK_MODULUS = AIR_DENSITY_KGPM3 * SOUND_SPEED_MPS * SOUND_SPEED_MPS;

/**
 * Acoustic pressure from a displacement gradient: p = −ρc²·∂ξ/∂x.
 *
 * @param displacementGradient - ∂ξ/∂x, dimensionless
 * @returns pressure in Pa; positive is compression
 */
export function pressureFromGradient(displacementGradient: number): number {
  return -BULK_MODULUS * displacementGradient;
}

/**
 * Pressure of a travelling plane wave from its particle velocity: p = ±ρc·u.
 *
 * @param velocity - particle velocity in m/s
 * @param direction - which way the wave is going
 * @returns pressure in Pa
 */
export function pressureFromVelocity(velocity: number, direction: WaveDirection): number {
  return directionSign(direction) * CHARACTERISTIC_IMPEDANCE * velocity;
}

/**
 * Angular wavenumber k = 2πf/c for a frequency in the medium.
 *
 * @param frequency - Hz
 * @returns k in rad/m
 */
export function wavenumberFor(frequency: number): number {
  return (2 * Math.PI * frequency) / SOUND_SPEED_MPS;
}

/**
 * Wavelength λ = c/f in the medium.
 *
 * @param frequency - Hz
 * @returns λ in m
 * @internal Exported for unit tests; not part of the application API.
 */
export function wavelengthFor(frequency: number): number {
  return SOUND_SPEED_MPS / frequency;
}

/**
 * Frequency of a wave of a given wavelength: f = c/λ.
 *
 * @param wavelength - m
 * @returns f in Hz
 */
export function frequencyForWavelength(wavelength: number): number {
  return SOUND_SPEED_MPS / wavelength;
}
