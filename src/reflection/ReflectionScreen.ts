/**
 * ReflectionScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createReflectionIcon() in src/common/StandingWavesScreenIcons.ts
 * (see SceneryStackTemplate doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createReflectionIcon } from "../common/StandingWavesScreenIcons.js";
import type { StandingWavesPreferencesModel } from "../preferences/StandingWavesPreferencesModel.js";
import StandingWavesColors from "../StandingWavesColors.js";
import { ReflectionModel } from "./model/ReflectionModel.js";
import { ReflectionKeyboardHelpContent } from "./view/ReflectionKeyboardHelpContent.js";
import { ReflectionScreenView } from "./view/ReflectionScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ReflectionScreenOptions = ScreenOptions & { tandem: Tandem };

export class ReflectionScreen extends Screen<ReflectionModel, ReflectionScreenView> {
  public constructor(preferences: StandingWavesPreferencesModel, options: ReflectionScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ReflectionModel(),
      // View factory — receives the model instance
      (model) =>
        new ReflectionScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ReflectionScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ReflectionKeyboardHelpContent(),
          homeScreenIcon: createReflectionIcon(),
          navigationBarIcon: createReflectionIcon(),
        },
        options,
      ),
    );
  }
}
