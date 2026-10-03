/**
 * StringManager.ts
 *
 * Centralizes all localized string access for the simulation.
 *
 * Strings are loaded from JSON files per locale and wrapped in reactive
 * Property objects by SceneryStack. When the user switches language in the
 * Preferences dialog, all StringProperties update automatically.
 *
 * ── How to add a locale ───────────────────────────────────────────────────────
 * 1. Create src/i18n/strings_XX.json with the same keys as strings_en.json
 * 2. Import it below and add `XX: stringsXX` to the locale map
 * 3. Add "XX" to `availableLocales` in src/init.ts
 *
 * ── How to add a string ───────────────────────────────────────────────────────
 * 1. Add the key + English value to strings_en.json
 * 2. Add the same key + translated value to ALL other locale files
 *    (TypeScript will show an error here if any locale is missing a key)
 * 3. Expose the new StringProperty via a new getter method below
 */

import type { ReadOnlyProperty } from "scenerystack/axon";
import { LocalizedString } from "scenerystack/chipper";
import stringsEn from "./strings_en.json";
import stringsEs from "./strings_es.json";
import stringsFr from "./strings_fr.json";

// ── Compile-time key-parity check ─────────────────────────────────────────────
// English is the canonical shape; every other locale must match it exactly.
// TypeScript errors here if any locale file is missing (or adds) a key relative to
// English. Add one `satisfies` line per new locale so the check stays exhaustive.
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsFr satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsFr);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEs satisfies typeof stringsEn);
// biome-ignore lint/complexity/noVoid: intentional compile-time type assertion
void (stringsEn satisfies typeof stringsEs);

// ── Build the reactive string property tree ───────────────────────────────────
const stringProperties = LocalizedString.getNestedStringProperties({
  en: stringsEn,
  fr: stringsFr,
  es: stringsEs,
});

/**
 * The `screenSummary` shape every screen's `a11y` subtree shares.
 *
 * Each screen adds its own `currentDetails` and `controls` keys on top, so the
 * per-screen getters below return the inferred subtree rather than this type.
 * This exists to state the part that must stay uniform.
 */
export type StandingWavesScreenSummaryStrings = {
  readonly screenSummary: {
    readonly playAreaStringProperty: ReadOnlyProperty<string>;
    readonly controlAreaStringProperty: ReadOnlyProperty<string>;
    readonly interactionHintStringProperty: ReadOnlyProperty<string>;
  };
};

/**
 * Explicit Preferences → Simulation labels from {@link StringManager.getPreferences}.
 */
export type StandingWavesPreferenceStrings = {
  readonly titleStringProperty: ReadOnlyProperty<string>;
  readonly showVelocityTraceStringProperty: ReadOnlyProperty<string>;
};

/**
 * StringManager is a singleton that provides typed access to all localized
 * strings. Use `StringManager.getInstance()` everywhere — never construct it
 * directly.
 */
export class StringManager {
  private static instance: StringManager | null = null;

  private constructor() {
    // Private — obtain via getInstance()
  }

  public static getInstance(): StringManager {
    if (StringManager.instance === null) {
      StringManager.instance = new StringManager();
    }
    return StringManager.instance;
  }

  /**
   * The simulation title shown in the navigation bar and browser tab.
   * Updates automatically when the locale changes.
   */
  public getTitleStringProperty(): ReadOnlyProperty<string> {
    return stringProperties.titleStringProperty;
  }

  /**
   * Screen name StringProperties used when constructing Screen instances.
   * Each property updates automatically when the locale changes.
   */
  public getScreenNames(): {
    readonly reflectionStringProperty: ReadOnlyProperty<string>;
    readonly phaseRelationshipsStringProperty: ReadOnlyProperty<string>;
    readonly standingWavesStringProperty: ReadOnlyProperty<string>;
    readonly instrumentsStringProperty: ReadOnlyProperty<string>;
  } {
    return {
      reflectionStringProperty: stringProperties.screens.reflectionStringProperty,
      phaseRelationshipsStringProperty: stringProperties.screens.phaseRelationshipsStringProperty,
      standingWavesStringProperty: stringProperties.screens.standingWavesStringProperty,
      instrumentsStringProperty: stringProperties.screens.instrumentsStringProperty,
    };
  }

  /** Names of the three acoustic quantities — the sim's whole vocabulary. */
  public getQuantities() {
    return stringProperties.quantities;
  }

  /** The density shading shared by the Reflection, Phase and Standing Waves screens. */
  public getDensityStrings() {
    return stringProperties.density;
  }

  /** Axis titles shared by the trace strips and the spectrum. */
  public getAxes() {
    return stringProperties.axes;
  }

  /** "Closed" / "Open", for labelling a single pipe end. */
  public getEnds() {
    return stringProperties.ends;
  }

  /** Names of the three termination pairs. */
  public getTerminations() {
    return stringProperties.terminations;
  }

  /** Control labels shared by more than one screen. */
  public getSharedControls() {
    return stringProperties.controls;
  }

  /** Unit patterns, e.g. "{{value}} Hz". */
  public getUnits() {
    return stringProperties.units;
  }

  /** Visible text for the Reflection screen. */
  public getReflectionStrings() {
    return stringProperties.reflection;
  }

  /** Visible text for the Phase screen. */
  public getPhaseStrings() {
    return stringProperties.phase;
  }

  /** Visible text for the Standing Waves screen. */
  public getStandingWavesStrings() {
    return stringProperties.standingWaves;
  }

  /** Visible text for the Instruments screen. */
  public getInstrumentsStrings() {
    return stringProperties.instruments;
  }

  /** Accessibility strings for the Reflection screen. */
  public getReflectionA11yStrings() {
    return stringProperties.a11y.reflection;
  }

  /** Accessibility strings for the Phase screen. */
  public getPhaseA11yStrings() {
    return stringProperties.a11y.phaseRelationships;
  }

  /** Accessibility strings for the Standing Waves screen. */
  public getStandingWavesA11yStrings() {
    return stringProperties.a11y.standingWaves;
  }

  /** Accessibility strings for the Instruments screen. */
  public getInstrumentsA11yStrings() {
    return stringProperties.a11y.instruments;
  }

  /**
   * Simulation-specific preference labels shown in Preferences → Simulation.
   */
  public getPreferences() {
    return stringProperties.preferences;
  }
}
