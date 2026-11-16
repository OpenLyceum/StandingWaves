import { STANDING_WAVES_PANEL_SETTINGS } from "../StandingWavesConstants.js";
/**
 * StandingWavesPanel.ts
 *
 * A pre-themed Panel that automatically uses StandingWavesColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { StandingWavesPanel } from "../../common/StandingWavesPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new StandingWavesPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new StandingWavesPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new StandingWavesPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import StandingWavesColors from "../StandingWavesColors.js";
import { PANEL_CORNER_RADIUS } from "../StandingWavesConstants.js";

export type StandingWavesPanelOptions = PanelOptions;

export class StandingWavesPanel extends Panel {
  public constructor(content: Node, providedOptions?: StandingWavesPanelOptions) {
    const options = optionize<StandingWavesPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: StandingWavesColors.panelBackgroundColorProperty,
        stroke: StandingWavesColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: STANDING_WAVES_PANEL_SETTINGS.OPTIONS_X_MARGIN,
        yMargin: STANDING_WAVES_PANEL_SETTINGS.OPTIONS_Y_MARGIN,
      },
      providedOptions,
    );
    super(content, options);
  }
}
