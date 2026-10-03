/**
 * InstrumentsScreenView.ts
 *
 * Four familiar pipes, each with its standing wave and its harmonic spectrum.
 *
 * ── The layout is the argument ────────────────────────────────────────────────
 *
 * The preset list is ordered as two same-length pairs — the two organ pipes, then
 * flute and clarinet — and both the pipe drawing and the spectrum stay in exactly the
 * same place on screen as the learner steps through them. Nothing rescales and
 * nothing moves, so flipping between two presets reads as a *difference*: the pipe's
 * cap appears, the bars shift down an octave and every second one disappears.
 *
 * A readout under the spectrum names the two facts that produces — the fundamental,
 * and whether the series is complete or odd-only — because those are the two things
 * to take away.
 *
 * The spectrum is also the control for which mode the pipe sounds, and the Play
 * panel under the preset list holds the register key, the partner overlay and the
 * sound. None of them moves anything else on screen.
 */

import { DerivedProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import { leftEnd, type PipeTermination, rightEnd } from "../../common/model/PipeTermination.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/StandingWavesButtonOptions.js";
import { createTimeControl } from "../../common/view/createTimeControl.js";
import { ParticleRowNode } from "../../common/view/ParticleRowNode.js";
import { PipeNode } from "../../common/view/PipeNode.js";
import { type TraceSpec, TraceStripNode } from "../../common/view/TraceStripNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import StandingWavesColors from "../../StandingWavesColors.js";
import {
  PARTICLE_AMPLITUDE_SPACINGS,
  PARTICLE_COUNT,
  PIPE_BORE_HEIGHT,
  SCREEN_VIEW_MARGIN,
  STRIP_SPACING,
} from "../../StandingWavesConstants.js";
import type { InstrumentsModel } from "../model/InstrumentsModel.js";
import { createHarmonicSeriesLabelProperty, HarmonicSpectrumNode } from "./HarmonicSpectrumNode.js";
import { InstrumentsScreenSummaryContent } from "./InstrumentsScreenSummaryContent.js";
import { InstrumentToneGenerator } from "./InstrumentToneGenerator.js";
import { PlayPanel } from "./PlayPanel.js";
import { PresetPanel } from "./PresetPanel.js";

const PIPE_VIEW_LENGTH = 770;
const STRIP_HEIGHT = 110;
const SPECTRUM_SIZE = { width: 420, height: 150 };

// Everything on this screen is positioned by its **plot origin** (`.x`/`.y`) rather
// than by its bounds (`.left`/`.top`). Both the pipe stack and the spectrum have
// chrome that reaches outside their plot areas — a closed end's cap juts to negative
// x, a rotated y-axis title sits to the left of its chart — so laying them out by
// bounds would space them by however much chrome each happened to have, and the gaps
// would change when the learner switched instrument.
//
// The pipe and its traces run across the top, left of the preset list; the
// spectrum and the readout that summarises it share the row beneath.
const PIPE_ORIGIN = { x: 30, y: 34 };
const SPECTRUM_ORIGIN = { x: 80, y: 400 };
const READOUT_GAP = 50;
const READOUT_MAX_WIDTH = 300;
const READOUT_FONT = new PhetFont(13);
const SERIES_FONT = new PhetFont({ size: 14, weight: "bold" });
const PARTICLE_ROW_COUNT = 3;

/** Headroom above the resonant amplitude the traces are scaled against. */
const TRACE_HEADROOM = 1.25;

export type InstrumentsScreenViewOptions = ScreenViewOptions;

export class InstrumentsScreenView extends ScreenView {
  private readonly model: InstrumentsModel;
  private readonly particles: ParticleRowNode;
  private readonly strips: TraceStripNode[];
  private readonly pipeNodes: Map<string, PipeNode>;
  private readonly disposeInstrumentsScreenView: () => void;

  public constructor(model: InstrumentsModel, providedOptions?: InstrumentsScreenViewOptions) {
    const summaryContent = new InstrumentsScreenSummaryContent(model);
    const options = optionize<InstrumentsScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: summaryContent },
      providedOptions,
    );
    super(options);

    this.model = model;
    const pipe = model.pipe;
    const strings = StringManager.getInstance();
    const quantities = strings.getQuantities();
    const instruments = strings.getInstrumentsStrings();

    // One PipeNode per termination the presets use, swapped by visibility so the end
    // treatment can change without rebuilding nodes.
    const pipeLayer = new Node();
    this.pipeNodes = new Map();
    for (const termination of ["openOpen", "closedOpen"] as const) {
      const node = new PipeNode({
        viewLength: PIPE_VIEW_LENGTH,
        leftEnd: leftEnd(termination),
        rightEnd: rightEnd(termination),
      });
      this.pipeNodes.set(termination, node);
      pipeLayer.addChild(node);
    }

    const columnSpacingPx = PIPE_VIEW_LENGTH / PARTICLE_COUNT;
    const particleAmplitudePx = PARTICLE_AMPLITUDE_SPACINGS * columnSpacingPx;

    this.particles = new ParticleRowNode({
      viewLength: PIPE_VIEW_LENGTH,
      bandHeight: PIPE_BORE_HEIGHT,
      rowCount: PARTICLE_ROW_COUNT,
      columnCount: PARTICLE_COUNT,
      colorProperty: StandingWavesColors.particleColorProperty,
      displacementAt: (fraction) => {
        const scale = this.displacementScale();
        return scale > 0
          ? (pipe.displacementAt(fraction * pipe.pipeLengthProperty.value) / scale) * particleAmplitudePx
          : 0;
      },
      radius: Math.min(2.2, columnSpacingPx * 0.18),
    });
    pipeLayer.addChild(this.particles);

    // ── Traces ────────────────────────────────────────────────────────────────
    const atFraction = (fraction: number): number => fraction * pipe.pipeLengthProperty.value;
    const displacementTrace: TraceSpec = {
      colorProperty: StandingWavesColors.displacementColorProperty,
      sample: (fraction) => pipe.displacementAt(atFraction(fraction)),
      fullScale: () => this.displacementScale(),
      caption: quantities.displacementStringProperty,
    };
    const pressureTrace: TraceSpec = {
      colorProperty: StandingWavesColors.pressureColorProperty,
      sample: (fraction) => pipe.pressureAt(atFraction(fraction)),
      fullScale: () => TRACE_HEADROOM * pipe.resonantPressureAmplitude(model.soundingHarmonicProperty.value),
      caption: quantities.pressureStringProperty,
    };

    const makeStrip = (traces: TraceSpec[], isBottom: boolean): TraceStripNode =>
      new TraceStripNode(traces, {
        viewWidth: PIPE_VIEW_LENGTH,
        viewHeight: STRIP_HEIGHT,
        xRange: new Range(0, 1),
        xSpacing: 0.25,
        showXTickLabels: isBottom,
        createXTickLabel: (value: number) =>
          new Text(value === 0 ? "0" : value === 1 ? "L" : `${value}L`, {
            font: new PhetFont(11),
            fill: StandingWavesColors.axisColorProperty,
          }),
      });
    this.strips = [makeStrip([displacementTrace], false), makeStrip([pressureTrace], true)];

    // ── Layout ────────────────────────────────────────────────────────────────
    const stack = new Node();
    pipeLayer.x = 0;
    pipeLayer.y = PIPE_BORE_HEIGHT / 2;
    stack.addChild(pipeLayer);

    let y = PIPE_BORE_HEIGHT + STRIP_SPACING * 2;
    for (const strip of this.strips) {
      strip.x = 0;
      strip.y = y;
      stack.addChild(strip);
      y += STRIP_HEIGHT + STRIP_SPACING;
    }
    stack.x = this.layoutBounds.minX + PIPE_ORIGIN.x;
    stack.y = this.layoutBounds.minY + PIPE_ORIGIN.y;
    this.addChild(stack);

    const presetPanel = new PresetPanel(model);
    presetPanel.right = this.layoutBounds.maxX - SCREEN_VIEW_MARGIN;
    presetPanel.top = this.layoutBounds.minY + SCREEN_VIEW_MARGIN;
    this.addChild(presetPanel);

    const playPanel = new PlayPanel(model);
    playPanel.right = presetPanel.right;
    playPanel.top = presetPanel.bottom + SCREEN_VIEW_MARGIN;
    this.addChild(playPanel);

    // The spectrum sits below the pipe. Positioned by its plot origin (x = 0 is the
    // plot's left edge, not the node's bounds), with SPECTRUM_ORIGIN.x reserving the
    // room its rotated y-axis title needs.
    const spectrum = new HarmonicSpectrumNode(model, {
      viewWidth: SPECTRUM_SIZE.width,
      viewHeight: SPECTRUM_SIZE.height,
    });
    spectrum.x = this.layoutBounds.minX + SPECTRUM_ORIGIN.x;
    spectrum.y = this.layoutBounds.minY + SPECTRUM_ORIGIN.y;
    this.addChild(spectrum);

    // ── The two facts, in words ───────────────────────────────────────────────
    const fundamentalProperty = new DerivedProperty(
      [pipe.fundamentalFrequencyProperty, instruments.fundamentalLabelStringProperty],
      (frequency: number, pattern: string) => pattern.replace("{{value}}", StringUtils.toFixedLTR(frequency, 0)),
    );
    const lengthProperty = new DerivedProperty(
      [pipe.pipeLengthProperty, instruments.lengthLabelStringProperty],
      (length: number, pattern: string) => pattern.replace("{{value}}", StringUtils.toFixedLTR(length, 2)),
    );
    const seriesProperty = createHarmonicSeriesLabelProperty(pipe);
    const soundingProperty = new DerivedProperty(
      [model.soundingHarmonicProperty, pipe.fundamentalFrequencyProperty, instruments.soundingLabelStringProperty],
      (harmonic: number, fundamental: number, pattern: string) =>
        pattern
          .replace("{{harmonic}}", `${harmonic}`)
          .replace("{{value}}", StringUtils.toFixedLTR(harmonic * fundamental, 0)),
    );

    const readout = new VBox({
      align: "left",
      spacing: 3,
      children: [
        new Text(seriesProperty, {
          font: SERIES_FONT,
          fill: StandingWavesColors.pressureColorProperty,
          maxWidth: READOUT_MAX_WIDTH,
        }),
        new Text(soundingProperty, {
          font: READOUT_FONT,
          fill: StandingWavesColors.textColorProperty,
          maxWidth: READOUT_MAX_WIDTH,
        }),
        new Text(fundamentalProperty, {
          font: READOUT_FONT,
          fill: StandingWavesColors.textColorProperty,
          maxWidth: READOUT_MAX_WIDTH,
        }),
        new Text(lengthProperty, {
          font: READOUT_FONT,
          fill: StandingWavesColors.textColorProperty,
          maxWidth: READOUT_MAX_WIDTH,
        }),
        new Text(instruments.sameLengthNoteStringProperty, {
          font: new PhetFont(11),
          fill: StandingWavesColors.axisColorProperty,
          maxWidth: READOUT_MAX_WIDTH,
        }),
      ],
    });
    readout.left = spectrum.x + SPECTRUM_SIZE.width + READOUT_GAP;
    readout.top = spectrum.y;
    this.addChild(readout);

    const timeControl = createTimeControl(model.timer, () => {
      model.stepForward();
      this.updatePipe();
    });
    this.addChild(timeControl);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.updatePipe();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    timeControl.right = resetAllButton.left - SCREEN_VIEW_MARGIN * 2;
    timeControl.centerY = resetAllButton.centerY;

    const onTermination = (termination: PipeTermination): void => {
      for (const [key, node] of this.pipeNodes) {
        node.visible = key === termination;
      }
    };
    pipe.terminationProperty.link(onTermination);

    this.addChild(
      new Node({
        pdomOrder: [
          presetPanel.presetRadioButtons,
          spectrum,
          playPanel.registerKeyCheckbox,
          playPanel.compareCheckbox,
          playPanel.soundCheckbox,
          timeControl,
          resetAllButton,
        ],
      }),
    );

    const toneGenerator = new InstrumentToneGenerator(model, this);

    this.disposeInstrumentsScreenView = () => {
      toneGenerator.dispose();
      soundingProperty.dispose();
      playPanel.dispose();
      pipe.terminationProperty.unlink(onTermination);
      seriesProperty.dispose();
      lengthProperty.dispose();
      fundamentalProperty.dispose();
      spectrum.dispose();
      presetPanel.dispose();
      summaryContent.dispose();
    };

    this.updatePipe();
  }

  public override step(_dt: number): void {
    this.updatePipe();
  }

  private updatePipe(): void {
    this.particles.update();
    for (const strip of this.strips) {
      strip.update();
    }
  }

  /**
   * Displacement that reaches the top of the strip (m).
   *
   * The resonant amplitude of the mode being sounded, as on the Standing Waves
   * screen, so whatever mode the pipe sounds fills the strip. Resonant displacement
   * falls as 1/h; a scale tied to the fundamental would shrink an overblown mode to
   * a sliver.
   */
  private displacementScale(): number {
    return TRACE_HEADROOM * this.model.pipe.resonantAmplitude(this.model.soundingHarmonicProperty.value);
  }

  public override dispose(): void {
    this.disposeInstrumentsScreenView();
    super.dispose();
  }
}
