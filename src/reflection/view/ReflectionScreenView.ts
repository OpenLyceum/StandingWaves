/**
 * ReflectionScreenView.ts
 *
 * A pipe with a pulse in it, over the two traces that say what the pulse is doing,
 * with the far end of the pipe under the learner's control.
 *
 * ── Layout ───────────────────────────────────────────────────────────────────
 *
 * Single view: one pipe assembly with tall traces, filling the area left of the
 * controls. Comparison view: the closed-ended and open-ended assemblies stacked,
 * each captioned with what its end does, with shorter traces so both fit.
 *
 * All four assemblies (two chains × two sizes) exist for the whole life of the
 * screen and only their visibility changes — building one on demand would drop
 * the pulse mid-flight, and the comparison would lose the shared clock that makes
 * it a comparison. Only visible assemblies are repainted.
 */

import { Multilink } from "scenerystack/axon";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Text } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { EndCondition } from "../../common/model/PipeTermination.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StandingWavesButtonOptions.js";
import { createTimeControl } from "../../common/view/createTimeControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { StandingWavesPreferencesModel } from "../../preferences/StandingWavesPreferencesModel.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { PIPE_BORE_HEIGHT, SCREEN_VIEW_MARGIN, STRIP_SPACING } from "../../StandingWavesConstants.js";
import type { ReflectionModel } from "../model/ReflectionModel.js";
import type { SpringChainModel } from "../model/SpringChainModel.js";
import { ChainPipeNode } from "./ChainPipeNode.js";
import { ReflectionControlPanel } from "./ReflectionControlPanel.js";
import { ReflectionScreenSummaryContent } from "./ReflectionScreenSummaryContent.js";

/** Drawn length of a pipe bore, in view pixels. */
const PIPE_VIEW_LENGTH = 720;

/** Plot origin of the pipe stack: room on the left for the closed end's cap. */
const STACK_ORIGIN_X = 30;

/** Trace-strip height when one assembly is showing. */
const SINGLE_STRIP_HEIGHT = 150;

/** Bore and strip heights when two assemblies share the screen. */
const COMPARE_BORE_HEIGHT = 44;
const COMPARE_STRIP_HEIGHT = 72;

const AXIS_TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });

export type ReflectionScreenViewOptions = ScreenViewOptions;

export class ReflectionScreenView extends ScreenView {
  private readonly assemblies: ChainPipeNode[];
  private readonly disposeReflectionScreenView: () => void;

  public constructor(
    model: ReflectionModel,
    preferences: StandingWavesPreferencesModel,
    providedOptions?: ReflectionScreenViewOptions,
  ) {
    const summaryContent = new ReflectionScreenSummaryContent(model);
    const options = optionize<ReflectionScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: summaryContent },
      providedOptions,
    );
    super(options);

    const showVelocityProperty = preferences.showVelocityTraceProperty;

    const makeAssembly = (chain: SpringChainModel, isCompact: boolean): ChainPipeNode =>
      new ChainPipeNode(chain, {
        viewLength: PIPE_VIEW_LENGTH,
        boreHeight: isCompact ? COMPARE_BORE_HEIGHT : PIPE_BORE_HEIGHT,
        stripHeight: isCompact ? COMPARE_STRIP_HEIGHT : SINGLE_STRIP_HEIGHT,
        showHeading: true,
        showVelocityProperty,
        showDensityProperty: model.showDensityProperty,
      });

    const singleClosed = makeAssembly(model.closedChain, false);
    const singleOpen = makeAssembly(model.openChain, false);
    const compareClosed = makeAssembly(model.closedChain, true);
    const compareOpen = makeAssembly(model.openChain, true);
    this.assemblies = [singleClosed, singleOpen, compareClosed, compareOpen];

    // Laid out by hand at a common origin rather than in a VBox, for the same
    // reason ChainPipeNode does: every assembly must agree on where model x = 0
    // sits, so that a feature in the closed pipe lines up with the same feature in
    // the open one directly below it.
    // Without excludeInvisibleChildrenFromBounds the hidden assemblies would still
    // count toward the layer's bounds, and the stack would be centred wrongly.
    const pipeLayer = new Node({ excludeInvisibleChildrenFromBounds: true });
    for (const assembly of this.assemblies) {
      assembly.x = 0;
      assembly.y = 0;
      pipeLayer.addChild(assembly);
    }
    compareOpen.y = compareClosed.height + STRIP_SPACING * 3;
    this.addChild(pipeLayer);

    // One position-axis title for the whole stack, under whichever assembly is
    // lowest. Two assemblies mean two pairs of strips, but only one physical axis.
    const axisLabel = new Text(StringManager.getInstance().getAxes().positionAlongPipeStringProperty, {
      font: AXIS_TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: PIPE_VIEW_LENGTH * 0.8,
    });
    pipeLayer.addChild(axisLabel);

    const controlPanel = new ReflectionControlPanel(model);
    this.addChild(controlPanel);

    const timeControl = createTimeControl(model.timer, () => {
      model.stepForward();
      this.updatePipes();
    });
    this.addChild(timeControl);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // ── Visibility: which assemblies are on screen ─────────────────────────────
    const onVisibility = (isComparing: boolean, farEnd: EndCondition): void => {
      singleClosed.visible = !isComparing && farEnd === EndCondition.CLOSED;
      singleOpen.visible = !isComparing && farEnd === EndCondition.OPEN;
      compareClosed.visible = isComparing;
      compareOpen.visible = isComparing;

      // The axis title follows the lowest visible assembly, and the whole stack is
      // centred vertically on what is showing — one pipe or two.
      const bottomAssembly = isComparing ? compareOpen : farEnd === EndCondition.CLOSED ? singleClosed : singleOpen;
      axisLabel.centerX = PIPE_VIEW_LENGTH / 2;
      axisLabel.top = bottomAssembly.y + bottomAssembly.height + STRIP_SPACING / 2;

      pipeLayer.x = this.layoutBounds.minX + STACK_ORIGIN_X;
      pipeLayer.centerY = this.layoutBounds.centerY;

      // A newly shown assembly has not been painted since it was last hidden.
      this.updatePipes();
    };
    const visibilityMultilink = Multilink.multilink([model.isComparingProperty, model.farEndProperty], onVisibility);

    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    timeControl.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    timeControl.bottom = resetAllButton.top - SCREEN_VIEW_MARGIN;

    // ── Accessibility: reading and tab order ──────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.launchButton,
          controlPanel.farEndRadioButtons,
          controlPanel.compareCheckbox,
          controlPanel.densityCheckbox,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.disposeReflectionScreenView = () => {
      visibilityMultilink.dispose();
      for (const assembly of this.assemblies) {
        assembly.dispose();
      }
      summaryContent.dispose();
    };

    // Paint once so the screen is not blank before the first frame.
    this.updatePipes();
  }

  public reset(): void {
    this.updatePipes();
  }

  public override step(_dt: number): void {
    this.updatePipes();
  }

  private updatePipes(): void {
    for (const assembly of this.assemblies) {
      if (assembly.visible) {
        assembly.update();
      }
    }
  }

  public override dispose(): void {
    this.disposeReflectionScreenView();
    super.dispose();
  }
}
