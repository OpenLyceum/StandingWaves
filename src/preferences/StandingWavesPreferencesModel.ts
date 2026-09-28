/**
 * StandingWavesPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in standingWavesQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import StandingWavesNamespace from "../StandingWavesNamespace.js";
import standingWavesQueryParameters from "./standingWavesQueryParameters.js";

export class StandingWavesPreferencesModel {
  /** Whether the velocity trace is shown. Initial value comes from `showVelocityTrace`. */
  public readonly showVelocityTraceProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showVelocityTraceProperty = new BooleanProperty(
      standingWavesQueryParameters.showVelocityTrace,
      tandem ? { tandem: tandem.createTandem("showVelocityTraceProperty") } : undefined,
    );
  }

  public reset(): void {
    this.showVelocityTraceProperty.reset();
  }
}

StandingWavesNamespace.register("StandingWavesPreferencesModel", StandingWavesPreferencesModel);
