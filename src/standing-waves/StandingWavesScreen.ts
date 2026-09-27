/**
 * StandingWavesScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createStandingWavesIcon() in src/common/StandingWavesScreenIcons.ts
 * (see SceneryStackTemplate doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createStandingWavesIcon } from "../common/StandingWavesScreenIcons.js";
import type { StandingWavesPreferencesModel } from "../preferences/StandingWavesPreferencesModel.js";
import StandingWavesColors from "../StandingWavesColors.js";
import { StandingWavesModel } from "./model/StandingWavesModel.js";
import { StandingWavesKeyboardHelpContent } from "./view/StandingWavesKeyboardHelpContent.js";
import { StandingWavesScreenView } from "./view/StandingWavesScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type StandingWavesScreenOptions = ScreenOptions & { tandem: Tandem };

export class StandingWavesScreen extends Screen<StandingWavesModel, StandingWavesScreenView> {
  public constructor(preferences: StandingWavesPreferencesModel, options: StandingWavesScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new StandingWavesModel(),
      // View factory — receives the model instance
      (model) =>
        new StandingWavesScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<StandingWavesScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new StandingWavesKeyboardHelpContent(),
          homeScreenIcon: createStandingWavesIcon(),
          navigationBarIcon: createStandingWavesIcon(),
        },
        options,
      ),
    );
  }
}
