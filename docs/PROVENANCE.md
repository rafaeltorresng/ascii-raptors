# Provenance and licensing

The TypeScript code, procedural meshes, rigs, pose functions, palette/compositing code, inline favicon and project-generated captures were authored for ascii-raptors. The root MIT license covers that original material. The frozen ESM/JSON fixtures are earlier builds and samples of the same project, not external implementations.

[ascii-sharks](https://github.com/stackedlol/ascii-sharks) was a conceptual reference for procedural ASCII animals, composition and movement. This project does not redistribute its source, art, models or screenshots, and does not grant any rights to that repository. No permission to reuse its materials is inferred from its availability.

## Anatomical references

Consulted for identification, silhouette and movement, without bundling photographs or tracing them into textures:

- [Cornell Lab: Swallow-tailed Kite](https://www.allaboutbirds.org/guide/Swallow-tailed_Kite/id), including [Ashley Pichon, ML632582490](https://macaulaylibrary.org/asset/632582490).
- [Cornell Lab: Golden Eagle](https://www.allaboutbirds.org/guide/Golden_Eagle/id), including Bryan Calk, ML305364081.
- [Cornell Lab: Peregrine Falcon](https://www.allaboutbirds.org/guide/Peregrine_Falcon/id), including Samuel Paul Galick, ML303616431.
- [Tang et al., 2024](https://doi.org/10.1371/journal.pone.0299982): conceptual reference for coupled wing articulation.
- [Cheney et al., 2021](https://doi.org/10.1098/rsif.2021.0349): morphology and gliding relationships.

These sources retain their own rights. Their links are references, not assets included under MIT. The animation is an authored interpretation, not a biological calibration or a claim of scientific validation.

## Fonts and dependencies

The interface and Canvas use system font stacks. No font binaries are included. Browser text rasterization appears in the project's own captures.

There are no runtime package dependencies. Build, lint, typecheck and QA dependencies are recorded in `package-lock.json` and retain their own licenses, including MIT, Apache-2.0, MPL-2.0, ISC and BSD-family licenses. The project's MIT license does not replace those licenses. Dependencies, caches and their sources are not vendored into this repository; `npm ci` installs them with their package notices.

The recordings in `docs/reference/` are intentionally retained: their exact checksums protect approved visual references. Other iterative recordings, rejected variants, debug logs and capture matrices are kept in the author's local archive rather than in the published history.
