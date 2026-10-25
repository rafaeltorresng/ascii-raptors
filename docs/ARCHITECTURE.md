# Architecture

The reusable library and the five-bird sky are separate layers. The library contains three original anatomical models; the demo adds two appearances based on the golden eagle and controls their shared composition.

| Area                                                              | Responsibility                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/math.ts`, `src/bird.ts`, `src/species/`                      | Original meshes, layered feathers, skeletal joints and transformations                  |
| `src/flight.ts`, species pose functions                           | Deterministic authored wingbeat and glide poses                                         |
| `src/species.ts`                                                  | Three-model registry, framing, metadata and inspection poses                            |
| `src/ascii.ts`                                                    | Camera, subcell coverage, depth, lighting, stable material texture and glyph atlas      |
| `src/engine.ts`, `src/index.ts`                                   | Public single-bird API, options, lifecycle and browser observers                        |
| `demo/course.ts`, `demo/flaps.ts`, `demo/layout.ts`               | Bounded routes, speed profiles, banking, glide/flap envelopes and approved sprite sizes |
| `demo/plumage.ts`, `demo/eagle-bill.ts`, `demo/feather-colors.ts` | Scene-specific plumage, head/beak treatment and material palettes                       |
| `demo/daylight.ts`                                                | Theme-aware cell compositor: opaque interiors beneath the ASCII ink, partial edges      |
| `demo/scene.ts`, `demo/air.ts`, `demo/clouds.ts`                  | Depth ordering and the shared sky/atmosphere                                            |
| `demo/sky.ts`, `demo/main.ts`, HTML/CSS                           | Landing controls and individual study interface                                         |
| `demo/qa/`, `tests/`                                              | Numerical regression contracts and manual browser harnesses                             |

## Rendering

A species generates an articulated mesh and a time-dependent pose. The renderer projects the transformed geometry into a low-resolution depth/coverage buffer, chooses a character for each occupied cell and draws it from a cached atlas. Texture is anchored to the model rather than randomized each frame. The sky compositor grades species materials and fills high-coverage cells beneath the glyphs, preserving feather gaps and edge coverage.

The compositor caches atlas grading and colors. It does not read the full rendered bird canvas every frame. The shared sky orders birds by apparent depth, and routes keep the beak aligned with the path tangent. Closed splines and distance/time tables make arbitrary time queries deterministic without replaying elapsed flight. The route cache is bounded.

## Boundaries

`AsciiRaptor` is the exported browser host for one original species. It handles size/DPR, explicit pause, reduced motion and suspension. The five-bird `FlightScene` is demo implementation, not an additional package export. Bald eagle and condor reuse the golden-eagle rig; their appearance does not constitute an independent anatomical model.

The build produces `dist/lib/` (ESM and declarations) and `dist/demo/` (two static HTML entries and their assets). QA pages and diagnostic tools are not included in the public demo output. No framework, remote font, image asset, runtime model download or network service is required for rendering.
