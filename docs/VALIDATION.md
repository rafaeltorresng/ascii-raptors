# Validation and known limitations

Publication preparation: October 25, 2026. The approved runtime source, HTML/CSS and frozen fixtures were preserved byte for byte. Changes in this preparation concern documentation, repository organization, development tooling, a test-only TypeScript annotation exposed by checking all tests, and portable comparisons against the frozen reference executables.

## Command-line checks

The suite contains **53 Node tests** covering mesh/pose determinism, transforms, framing, species identity, original reference checksums, plumage, atmospheric data and two minutes of scene routes in four viewport shapes. Lint uses the recommended TypeScript ESLint rules. Strict typechecking now includes every TypeScript test and browser harness. `npm run verify` runs lint, formatting, tests and the complete demo/library build; `npm run pack:check` inspects the package without publishing it.

CI runs those command-line checks on Ubuntu with Node 22 and 24. It does not run a browser, deploy the demo, publish a package or create a release. Local execution used Node 24.11.0/npm 11.6.1; remote CI results should be checked on the commit under review rather than inferred from the workflow definition.

The first Ubuntu CI run exposed four false regressions: platform-dependent math differed in the last floating-point digits from the macOS JSON snapshots. Model tests now compare mesh values, poses and Float32 geometry exactly against the checksum-protected original executables in the same runtime. The original numerical snapshots remain untouched; no tolerance, platform skip, runtime change or baseline regeneration was introduced. The kite keeps its original v0.1 pose oracle; its transforms also match the approved three-model build, while the browser harness independently compares the full renderer with v0.1.

## Browser checks actually completed

Chromium 155 on macOS, DPR 2:

- [16/16 rendering/lifecycle checks](validation/chromium-browser.json): 48 kite frames and 168 three-model frames identical to the frozen references in the same browser; 456 additional nonempty framed view/pose combinations; pause, suspension, destruction, route movement and emulated reduced-motion checks.
- [4/4 interface flows](validation/chromium-demo.json): 32 layouts without overflow and 16 axe-core audits without detected violations. The reports retain incomplete contrast checks for icons and composited backgrounds; they are not an accessibility certification.
- [50 dark](validation/opacity-dark.json) and [50 light](validation/opacity-light.json) opacity frames from the approved compositor: five birds, five instants, 240 px/DPR 1 and 480 px/DPR 2. Interior cells were opaque, glyph texture remained distinguishable and there was no paint outside emitted cells.

The fresh browser/lifecycle and interface checks were rerun during publication preparation. The opacity reports and the following performance sample are retained from the preceding approved visual revision; they were not relabeled as new measurements.

## Performance evidence

The [isolated playback measurement](validation/performance.json), with no per-frame pixel readbacks after warm-up, observed approximately 28.8 FPS at 1440 × 900 in dark mode and 23.0 FPS at 390 × 844, on that local machine. The scene targets 30/24 FPS respectively. This is not a guarantee for another browser or device.

The rendering/lifecycle harness also records diagnostic costs, but it performs repeated canvas readbacks and frozen-reference comparisons. Those figures are not a steady-playback FPS benchmark and should not be compared directly with the isolated measurement.

## Remaining checks and technical limits

- The **current shared scene** has no completed full Gecko/Safari, Windows/Linux browser or physical iOS/Android validation. Older study experiments do not establish compatibility for this scene.
- Phone-sized viewports and DPR checks do not measure phone GPUs, battery, heat or assistive technology. VoiceOver and other reader sessions remain manual work.
- Wingbeats, proportions, feather mechanics and flight speed are art-directed, not measured aerodynamic simulation. Independent anatomical review would be useful, especially for folded poses and ventral plumage.
- The condor and bald eagle reuse the golden-eagle anatomy; they are not two additional independent rigs.
- Large primaries can reach the frame on narrow screens; birds can overlap. Routes are directed and cyclic, not a collision or hunting simulation.
- Font rendering and fine ASCII contours vary by platform. Pixel comparisons are within the same browser against project-authored references, not across platforms.
- Recording/export features depend on browser capabilities, including MediaRecorder/WebM support.

The original reference videos in `docs/reference/` total about 5 MB and are intentionally tracked because tests verify their exact checksums. Iterative capture batches, rejected variants and local logs are excluded from the repository. The two README images are compressed captures of the approved scene, not runtime image assets.
