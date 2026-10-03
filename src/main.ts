/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import { InstrumentsScreen } from "./instruments/InstrumentsScreen.js";
import { PhaseScreen } from "./phase-relationships/PhaseScreen.js";
import { StandingWavesPreferencesModel } from "./preferences/StandingWavesPreferencesModel.js";
import { StandingWavesPreferencesNode } from "./preferences/StandingWavesPreferencesNode.js";
import { ReflectionScreen } from "./reflection/ReflectionScreen.js";
import StandingWavesColors from "./StandingWavesColors.js";
import { StandingWavesScreen } from "./standing-waves/StandingWavesScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from standingWavesQueryParameters.
  const simPreferences = new StandingWavesPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new ReflectionScreen(simPreferences, {
      // The screen name Property updates automatically when the locale changes
      name: stringManager.getScreenNames().reflectionStringProperty,
      tandem: Tandem.ROOT.createTandem("reflectionScreen"),
      backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
    }),
    new PhaseScreen({
      // The screen name Property updates automatically when the locale changes
      name: stringManager.getScreenNames().phaseRelationshipsStringProperty,
      tandem: Tandem.ROOT.createTandem("phaseRelationshipsScreen"),
      backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
    }),
    new StandingWavesScreen(simPreferences, {
      // The screen name Property updates automatically when the locale changes
      name: stringManager.getScreenNames().standingWavesStringProperty,
      tandem: Tandem.ROOT.createTandem("standingWavesScreen"),
      backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
    }),
    new InstrumentsScreen({
      // The screen name Property updates automatically when the locale changes
      name: stringManager.getScreenNames().instrumentsStringProperty,
      tandem: Tandem.ROOT.createTandem("instrumentsScreen"),
      backgroundColorProperty: StandingWavesColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new StandingWavesPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
      audioOptions: {
        // Initializes tambo and the Audio preferences. Pair with supportsSound in src/init.ts.
        supportsSound: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
