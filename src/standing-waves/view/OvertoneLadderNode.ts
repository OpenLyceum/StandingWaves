/**
 * OvertoneLadderNode.ts
 *
 * The ladder of harmonics, drawn as a vertical stack of rungs the learner can
 * press to tune the pipe onto a mode.
 *
 * ── What it is for ───────────────────────────────────────────────────────────
 *
 * This is where "a stopped pipe sounds only the odd harmonics" stops being a
 * sentence and becomes a picture. Every rung the pipe *can* sound is live and
 * legible; every rung it cannot is disabled and struck through **in place**, so the
 * gaps are visible as gaps. Switching the termination therefore does not quietly
 * renumber the ladder — half of it goes dark where it stands.
 *
 * Rungs are spaced by harmonic *number*, not by frequency, precisely so the missing
 * evens leave holes at the positions where they would have been.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Node, Path, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { RectangularPushButton } from "scenerystack/sun";
import { isModeAllowed, modeFrequency, type PipeTermination } from "../../common/model/PipeTermination.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../../common/StandingWavesButtonOptions.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import type { StandingWavesModel } from "../model/StandingWavesModel.js";

const RUNG_FONT = new PhetFont(12);
const TITLE_FONT = new PhetFont({ size: 13, weight: "bold" });

/**
 * How many harmonics the ladder shows. Fewer than the model carries: the top of the
 * model's ladder lies outside the frequency slider's reach, so listing it would
 * offer rungs that cannot be tuned to.
 */
const LADDER_RUNGS = 8;

/** Width of a rung's content, in view pixels. */
const RUNG_CONTENT_WIDTH = 128;

export class OvertoneLadderNode extends Node {
  private readonly disposeOvertoneLadderNode: () => void;

  public constructor(model: StandingWavesModel) {
    super();

    const strings = StringManager.getInstance();
    const standingWaves = strings.getStandingWavesStrings();
    const units = strings.getUnits();
    const a11y = strings.getStandingWavesA11yStrings();

    const title = new Text(standingWaves.overtonesStringProperty, {
      font: TITLE_FONT,
      fill: StandingWavesColors.textColorProperty,
      maxWidth: RUNG_CONTENT_WIDTH + 20,
    });

    const rungs: LadderRung[] = [];
    // Built from the top down, so the fundamental sits at the bottom of the stack,
    // like the lowest note on a staff.
    for (let harmonic = LADDER_RUNGS; harmonic >= 1; harmonic--) {
      rungs.push(
        new LadderRung(model, harmonic, units.hertzStringProperty, a11y.controls.harmonicLadderStringProperty),
      );
    }

    this.addChild(
      new VBox({
        align: "left",
        spacing: 3,
        children: [title, ...rungs],
      }),
    );

    this.disposeOvertoneLadderNode = () => {
      for (const rung of rungs) {
        rung.dispose();
      }
    };
  }

  public override dispose(): void {
    this.disposeOvertoneLadderNode();
    super.dispose();
  }
}

/** One rung: harmonic number, frequency, and whether this pipe has that mode. */
class LadderRung extends RectangularPushButton {
  private readonly disposeLadderRung: () => void;

  public constructor(
    model: StandingWavesModel,
    harmonic: number,
    hertzPattern: TReadOnlyProperty<string>,
    accessibleNameSource: TReadOnlyProperty<string>,
  ) {
    const pipe = model.pipe;

    const isAllowedProperty = new DerivedProperty([pipe.terminationProperty], (termination: PipeTermination) =>
      isModeAllowed(harmonic, termination),
    );

    const frequencyProperty = new DerivedProperty(
      [pipe.terminationProperty, pipe.pipeLengthProperty, hertzPattern, isAllowedProperty],
      (termination: PipeTermination, length: number, pattern: string, isAllowed: boolean) =>
        isAllowed
          ? pattern.replace("{{value}}", StringUtils.toFixedLTR(modeFrequency(harmonic, termination, length), 0))
          : "—",
    );

    const numberText = new Text(`${harmonic}`, {
      font: TITLE_FONT,
      fill: LIGHT_SURFACE_TEXT_FILL,
    });
    const frequencyText = new Text(frequencyProperty, {
      font: RUNG_FONT,
      fill: LIGHT_SURFACE_TEXT_FILL,
      maxWidth: RUNG_CONTENT_WIDTH - 30,
    });

    // A strike-through over the whole rung, shown only where the pipe has no mode.
    // Drawn rather than left to the disabled dimming alone: "this pipe does not have
    // this harmonic" and "this control happens to be greyed" must not look the same.
    const strike = new Path(Shape.lineSegment(0, 0, RUNG_CONTENT_WIDTH, 0), {
      stroke: LIGHT_SURFACE_TEXT_FILL,
      lineWidth: 1.5,
    });

    // spaceBetween against a fixed preferred width puts the harmonic number hard
    // left and the frequency hard right, so the numbers form two clean columns down
    // the ladder however wide each readout happens to be.
    const row = new HBox({
      align: "center",
      children: [numberText, frequencyText],
      preferredWidth: RUNG_CONTENT_WIDTH,
      justify: "spaceBetween",
    });
    const content = new Node({ children: [row] });
    strike.centerY = row.centerY;
    content.addChild(strike);

    super({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content,
      baseColor: StandingWavesColors.controlSurfaceColorProperty,
      xMargin: 6,
      yMargin: 3,
      enabledProperty: isAllowedProperty,
      // jumpToHarmonic, not tuneToHarmonic: pressing a rung means "show me this mode",
      // and a mode the pipe was already ringing in would otherwise linger for seconds
      // and muddy the shape being asked for.
      listener: () => pipe.jumpToHarmonic(harmonic),
    });

    // The rung the pipe is actually resonating on is filled with the resonance
    // colour, so the ladder shows where the drive currently *is* as well as what is
    // available. Its label stays the dark light-surface fill, which reads on both.
    const isSelectedProperty = new DerivedProperty(
      [pipe.nearestHarmonicProperty, pipe.isAtResonanceProperty],
      (nearest: number, atResonance: boolean) => atResonance && nearest === harmonic,
    );
    const onSelected = (isSelected: boolean): void => {
      this.baseColor = isSelected
        ? StandingWavesColors.resonanceBadgeColorProperty.value
        : StandingWavesColors.controlSurfaceColorProperty.value;
    };
    isSelectedProperty.link(onSelected);

    const onAllowed = (isAllowed: boolean): void => {
      strike.visible = !isAllowed;
    };
    isAllowedProperty.link(onAllowed);

    const accessibleNameProperty = new DerivedProperty(
      [accessibleNameSource, frequencyProperty],
      (name: string, frequency: string) => `${name} ${harmonic}, ${frequency}`,
    );
    this.accessibleName = accessibleNameProperty;

    this.disposeLadderRung = () => {
      isAllowedProperty.unlink(onAllowed);
      isSelectedProperty.unlink(onSelected);
      accessibleNameProperty.dispose();
      isSelectedProperty.dispose();
      frequencyProperty.dispose();
      isAllowedProperty.dispose();
    };
  }

  public override dispose(): void {
    this.disposeLadderRung();
    super.dispose();
  }
}
