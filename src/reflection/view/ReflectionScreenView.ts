/**
 * ReflectionScreenView.ts
 *
 * A pipe with a pulse in it, over the two traces that say what the pulse is doing,
 * with the far end of the pipe under the learner's control.
 *
 * ── Layout ───────────────────────────────────────────────────────────────────
 *
 * Single view: one pipe assembly, centred. Comparison view: the closed-ended and
 * open-ended assemblies stacked, each captioned with what its end does. Both
 * assemblies exist for the whole life of the screen and only their visibility
 * changes — building one on demand would drop the pulse mid-flight, and the
 * comparison would lose the shared clock that makes it a comparison.
 */

import { DerivedProperty } from "scenerystack/axon";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Text } from "scenerystack/scenery";
import { PhetFont, ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { EndCondition } from "../../common/model/PipeTermination.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
} from "../../common/StandingWavesButtonOptions.js";
import { SlowMotionControl } from "../../common/view/SlowMotionControl.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { StandingWavesPreferencesModel } from "../../preferences/StandingWavesPreferencesModel.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import { SCREEN_VIEW_MARGIN, STRIP_SPACING, TRACE_STRIP_SIZE } from "../../StandingWavesConstants.js";
import type { ReflectionModel } from "../model/ReflectionModel.js";
import { ChainPipeNode } from "./ChainPipeNode.js";
import { ReflectionControlPanel } from "./ReflectionControlPanel.js";
import { ReflectionScreenSummaryContent } from "./ReflectionScreenSummaryContent.js";

/** Drawn length of a pipe bore, in view pixels. */
const PIPE_VIEW_LENGTH = TRACE_STRIP_SIZE.width;

const AXIS_TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });

export type ReflectionScreenViewOptions = ScreenViewOptions;

export class ReflectionScreenView extends ScreenView {
  private readonly closedPipe: ChainPipeNode;
  private readonly openPipe: ChainPipeNode;
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

    this.closedPipe = new ChainPipeNode(model.closedChain, {
      viewLength: PIPE_VIEW_LENGTH,
      showHeading: true,
      showVelocityProperty,
    });
    this.openPipe = new ChainPipeNode(model.openChain, {
      viewLength: PIPE_VIEW_LENGTH,
      showHeading: true,
      showVelocityProperty,
    });

    // Laid out by hand at a common origin rather than in a VBox, for the same
    // reason ChainPipeNode does: the two assemblies must agree on where model
    // x = 0 sits, so that a feature in the closed pipe lines up with the same
    // feature in the open one directly below it.
    // Without this the hidden assembly still counts toward the layer's bounds, and
    // the single-pipe view would be centred as though two pipes were showing.
    const pipeLayer = new Node({ excludeInvisibleChildrenFromBounds: true });
    this.closedPipe.x = 0;
    this.closedPipe.y = 0;
    this.openPipe.x = 0;
    this.openPipe.y = this.closedPipe.height + STRIP_SPACING * 4;
    pipeLayer.addChild(this.closedPipe);
    pipeLayer.addChild(this.openPipe);
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

    const timeControl = new TimeControlNode(model.timer.isPlayingProperty, {
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => {
            model.stepForward();
            this.updatePipes();
          },
        },
      },
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
    const showClosedProperty = new DerivedProperty(
      [model.isComparingProperty, model.farEndProperty],
      (isComparing: boolean, farEnd: EndCondition) => isComparing || farEnd === EndCondition.CLOSED,
    );
    const showOpenProperty = new DerivedProperty(
      [model.isComparingProperty, model.farEndProperty],
      (isComparing: boolean, farEnd: EndCondition) => isComparing || farEnd === EndCondition.OPEN,
    );
    showClosedProperty.link((visible) => {
      this.closedPipe.visible = visible;
    });
    showOpenProperty.link((visible) => {
      this.openPipe.visible = visible;
    });

    // The axis title follows the lowest *visible* assembly, and the whole stack is
    // centred on what is showing — one pipe or two.
    const relayout = (): void => {
      const bottomPipe = this.openPipe.visible ? this.openPipe : this.closedPipe;
      axisLabel.centerX = PIPE_VIEW_LENGTH / 2;
      axisLabel.top = bottomPipe.y + bottomPipe.height + STRIP_SPACING;

      pipeLayer.left = SCREEN_VIEW_MARGIN;
      pipeLayer.centerY = this.layoutBounds.centerY;
    };
    model.isComparingProperty.link(relayout);
    model.farEndProperty.link(relayout);

    controlPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    controlPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    timeControl.centerX = controlPanel.centerX;
    timeControl.bottom = resetAllButton.top - SCREEN_VIEW_MARGIN;
    const slowMotionControl = new SlowMotionControl(model.timer);
    slowMotionControl.centerX = timeControl.centerX;
    slowMotionControl.bottom = timeControl.top - STRIP_SPACING;
    this.addChild(slowMotionControl);

    // ── Accessibility: reading and tab order ──────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [
          controlPanel.launchButton,
          controlPanel.farEndRadioButtons,
          controlPanel.compareCheckbox,
          slowMotionControl,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    this.disposeReflectionScreenView = () => {
      showClosedProperty.dispose();
      showOpenProperty.dispose();
      model.isComparingProperty.unlink(relayout);
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
    if (this.closedPipe.visible) {
      this.closedPipe.update();
    }
    if (this.openPipe.visible) {
      this.openPipe.update();
    }
  }

  public override dispose(): void {
    this.disposeReflectionScreenView();
    super.dispose();
  }
}
