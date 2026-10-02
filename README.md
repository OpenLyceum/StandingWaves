# Standing Waves

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Longitudinal standing waves in a pipe, built with [SceneryStack](https://scenerystack.org/),
Vite 8, TypeScript 7, and Biome 2.

Sound in a pipe is usually drawn as a wiggly line, which hides the three things that actually
matter: that displacement, velocity and pressure peak in different places; that an open end and a
closed end reflect a pulse in opposite ways; and that a pressure antinode sits exactly where the
displacement has a node. This simulation makes all three something you manipulate rather than read.

**[Launch the simulation](https://openlyceum.github.io/StandingWaves)**

## Features

- **Reflection** — a mass-spring chain terminated open or closed. Launch a pulse and watch it
  reflect; a closed end flips the displacement and preserves the pressure, an open end does the
  reverse. Both terminations can be shown side by side, stepped from one clock. The inversion is
  *emergent* from the boundary condition, not scripted.
- **Phase** — a travelling sinusoid with a draggable reference point carrying displacement and
  velocity arrows. Reverse the direction and velocity and pressure go from in phase to 180° out of
  phase, which is the whole content of `p = ±ρc·u`.
- **Standing Waves** — pick Closed–Closed, Open–Open or Closed–Open, then sweep and fine tune the drive
  frequency to hunt for a resonance or snap straight to a harmonic. Node markers name both of each
  point's identities, so the quarter-wave displacement/pressure offset is unmissable.
- **Instruments** — open and stopped organ pipes, flute and clarinet, with the harmonic series as a
  bar chart. The flute and clarinet share a bore length, so the octave and the missing even
  harmonics are visibly the termination's doing.
- Real SI units throughout, with Slow motion selected by default beside each screen's playback controls
- Full keyboard and screen-reader support, with live state descriptions per screen
- English, Spanish, and French localization via `StringManager`
- Default and projector color profiles
- Progressive Web App (installable, offline-capable)
- Shared GitHub Actions CI via `OpenLyceum/Baton`

The physics is documented for educators in [`doc/model.md`](doc/model.md) and for developers in
[`doc/implementation-notes.md`](doc/implementation-notes.md).

## Quick Start

```bash
npm install
npm start        # dev server → http://localhost:5173
```

Use `?screens=1` … `?screens=4` to open a single screen directly, and
`?showVelocityTrace=true` to add the velocity curve on the screens where it is optional.

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke: pointer (`?fuzz`) + keyboard (`?fuzzBoard`), with `?ea`, 30s each |
| `npm run test:fuzz -- 90` | Same fuzz for 90 seconds (`--duration 90` or `FUZZ_DURATION=90` also work) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run test:fuzz:long` | Longer fuzz smoke (300s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |
| `npm run clean` | Remove `dist/` |

`npm run release` does not run `npm test`; append `&& npm test` before the version bump so a release
cannot ship a failing suite.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenLyceum org license](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Contributing

See [OpenLyceum contributing guidelines](https://github.com/OpenLyceum/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
