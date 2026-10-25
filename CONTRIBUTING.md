# Contributing

Keep the library framework-independent and preserve each bird's identity. The five-bird sky has three original anatomical models; bald eagle and condor are demo appearances based on the golden eagle.

1. Use Node 22.13+ on the 22.x line, or Node 24+, then run `npm ci` and `npm run dev`.
2. Run `npm run verify` and `npm run pack:check` before proposing a change.
3. For visual changes, inspect actual playback: both themes, narrow/desktop layouts, turns, wingbeat transitions, feather gaps and overlapping birds. Check the studies' four views and character densities when anatomy is affected.
4. Use the browser harnesses described in the README. Report the browser, viewport and DPR; physical-device and reader checks must be identified separately from emulation.
5. Keep commits focused and use Conventional Commits. Include the relevant types, tests and documentation with the change.

## Protect the references

Do not regenerate `tests/fixtures/` or replace `docs/reference/` just to make checks pass. These frozen project-authored builds, numerical samples and recordings protect the approved visual behavior. Investigate differences first; an intentional new baseline needs explicit visual review and must preserve the previous reference.

Scene movement belongs in the demo, rather than in the library's anatomical pose functions. The scene's material/compositing layer is also distinct from the studies. Avoid full-canvas pixel readbacks in the animation loop, per-frame mesh construction and unbounded caches.

Only contribute original or explicitly licensed code and assets. Record attribution and license boundaries in `docs/PROVENANCE.md`. Do not commit reference photos, recordings of third-party sites, secrets, builds, caches or large debug-capture batches. Keep performance and anatomical claims proportional to the checks actually performed.
