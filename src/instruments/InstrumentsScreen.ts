/**
 * InstrumentsScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createInstrumentsIcon() in src/common/StandingWavesScreenIcons.ts
 * (see SceneryStackTemplate doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createInstrumentsIcon } from "../common/StandingWavesScreenIcons.js";
import StandingWavesColors from "../StandingWavesColors.js";
import { InstrumentsModel } from "./model/InstrumentsModel.js";
import { InstrumentsKeyboardHelpContent } from "./view/InstrumentsKeyboardHelpContent.js";
import { InstrumentsScreenView } from "./view/InstrumentsScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type InstrumentsScreenOptions = ScreenOptions & { tandem: Tandem };

export class InstrumentsScreen extends Screen<InstrumentsModel, InstrumentsScreenView> {
  public constructor(options: InstrumentsScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new InstrumentsModel(),
      // View factory — receives the model instance
      (model) =>
        new InstrumentsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<InstrumentsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new InstrumentsKeyboardHelpContent(),
          homeScreenIcon: createInstrumentsIcon(),
          navigationBarIcon: createInstrumentsIcon(),
        },
        options,
      ),
    );
  }
}
