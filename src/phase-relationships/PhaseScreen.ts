/**
 * PhaseScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createPhaseIcon() in src/common/StandingWavesScreenIcons.ts
 * (see SceneryStackTemplate doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createPhaseIcon } from "../common/StandingWavesScreenIcons.js";
import StandingWavesColors from "../StandingWavesColors.js";
import { PhaseModel } from "./model/PhaseModel.js";
import { PhaseKeyboardHelpContent } from "./view/PhaseKeyboardHelpContent.js";
import { PhaseScreenView } from "./view/PhaseScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type PhaseScreenOptions = ScreenOptions & { tandem: Tandem };

export class PhaseScreen extends Screen<PhaseModel, PhaseScreenView> {
  public constructor(options: PhaseScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new PhaseModel(),
      // View factory — receives the model instance
      (model) =>
        new PhaseScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<PhaseScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new PhaseKeyboardHelpContent(),
          homeScreenIcon: createPhaseIcon(),
          navigationBarIcon: createPhaseIcon(),
        },
        options,
      ),
    );
  }
}
