import { AsciiRenderer } from './ascii.ts';
import type { Detail, Representation, Theme } from './ascii.ts';
import type { BirdMesh } from './bird.ts';
import { blendPose } from './flight.ts';
import type { FlightMode, FlightPose, View } from './flight.ts';
import { getSpecies, SPECIES } from './species.ts';
import type { Species, SpeciesId } from './species.ts';

export interface RaptorOptions {
  species: SpeciesId;
  theme: Theme;
  view: View;
  detail: Detail;
  scale: number;
  mode: FlightMode;
  representation: Representation;
  seed: number;
  maxFPS: number;
  paused: boolean;
}
export interface RaptorStats {
  species: SpeciesId;
  time: number;
  frameMs: number;
  p95Ms: number;
  cells: number;
  triangles: number;
  columns: number;
  rows: number;
  running: boolean;
  reducedMotion: boolean;
}
const DEFAULTS: RaptorOptions = {
  species: 'swallow-tailed-kite',
  theme: 'dark',
  view: 'oblique',
  detail: 'balanced',
  scale: 1,
  mode: 'soar',
  representation: 'articulated',
  seed: 7,
  maxFPS: 60,
  paused: false,
};

/** Framework-independent browser host. Importing this module is safe without window/document. */
export class AsciiRaptor {
  private canvas: HTMLCanvasElement;
  private options: RaptorOptions;
  private specimen: Species;
  private mesh: BirdMesh;
  private positions: Float32Array;
  private renderer: AsciiRenderer;
  private raf = 0;
  private last = 0;
  private lastPaint = 0;
  private disposed = false;
  private inView = true;
  private time = 0;
  private motionOverride = false;
  private motion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private frameTimes = new Float32Array(120);
  private frameCount = 0;
  private p95 = 0;
  private cost = 0;
  private override: Partial<FlightPose> | undefined;
  private transition: { from: FlightPose; start: number } | undefined;

  constructor(canvas: HTMLCanvasElement, options: Partial<RaptorOptions> = {}) {
    this.canvas = canvas;
    this.options = { ...DEFAULTS, ...options };
    this.validate(this.options);
    this.specimen = getSpecies(this.options.species);
    this.mesh = this.specimen.create();
    this.positions = new Float32Array(this.mesh.vertices.length * 3);
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer = new AsciiRenderer(canvas, this.options);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);
    this.motion.addEventListener('change', this.onMotion);
    canvas.ownerDocument.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.schedule();
  }
  private validate(options: RaptorOptions) {
    const allowed = {
      species: SPECIES.map((species): string => species.id),
      theme: ['dark', 'light'],
      view: ['oblique', 'ventral', 'dorsal', 'profile'],
      detail: ['fine', 'balanced', 'coarse'],
      mode: ['soar', 'glide', 'flap'],
      representation: ['articulated', 'flat', 'silhouette'],
    };
    for (const key of Object.keys(allowed) as (keyof typeof allowed)[])
      if (!allowed[key].includes(options[key])) throw new RangeError(`Invalid ${key}`);
    if (!Number.isFinite(options.scale) || options.scale < 0.4 || options.scale > 1.8)
      throw new RangeError('scale must be between 0.4 and 1.8');
    if (!Number.isFinite(options.maxFPS) || options.maxFPS < 1 || options.maxFPS > 120)
      throw new RangeError('maxFPS must be between 1 and 120');
    if (!Number.isFinite(options.seed)) throw new RangeError('seed must be finite');
  }
  private get canRun() {
    return (
      !this.disposed &&
      !this.options.paused &&
      this.inView &&
      !this.canvas.ownerDocument.hidden &&
      (!this.motion.matches || this.motionOverride)
    );
  }
  get stats(): RaptorStats {
    return {
      species: this.options.species,
      time: this.time,
      frameMs: this.cost,
      p95Ms: this.p95,
      ...this.renderer.stats,
      running: this.canRun,
      reducedMotion: this.motion.matches,
    };
  }
  setOptions(options: Partial<RaptorOptions>) {
    if (this.disposed) return;
    const next = { ...this.options, ...options };
    this.validate(next);
    if (next.species !== this.options.species) {
      this.specimen = getSpecies(next.species);
      this.mesh = this.specimen.create();
      this.positions = new Float32Array(this.mesh.vertices.length * 3);
      this.time = 0;
      this.override = undefined;
      this.transition = undefined;
      this.frameCount = 0;
      this.p95 = 0;
      this.frameTimes.fill(0);
    } else if (next.mode !== this.options.mode)
      this.transition = { from: this.currentPose(), start: this.time };
    this.options = next;
    this.renderer.configure(this.options);
    this.render();
    this.schedule();
  }
  pause() {
    this.setOptions({ paused: true });
  }
  play() {
    if (this.override) this.transition = { from: this.currentPose(), start: this.time };
    this.motionOverride = true;
    this.override = undefined;
    this.setOptions({ paused: false });
  }
  /** Deterministic authoring/inspection frame, with optional pose overrides. Pauses playback. */
  renderAt(seconds: number, pose?: Partial<FlightPose>) {
    if (!Number.isFinite(seconds) || seconds < 0)
      throw new RangeError('time must be non-negative and finite');
    if (pose && Object.values(pose).some((x) => !Number.isFinite(x)))
      throw new RangeError('pose values must be finite');
    if (this.disposed) return;
    this.time = seconds;
    this.override = pose;
    this.options.paused = true;
    this.transition = undefined;
    this.renderer.resetHistory();
    this.schedule();
    this.render();
  }
  resize() {
    if (this.disposed) return;
    const { width, height } = this.canvas.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    this.renderer.resize(width, height, window.devicePixelRatio || 1);
    this.render();
  }
  private render() {
    const start = performance.now();
    const pose = this.currentPose();
    this.renderer.render(
      this.mesh,
      this.specimen.transform(
        this.mesh,
        pose,
        this.positions,
        this.options.representation === 'flat',
      ),
    );
    this.cost = performance.now() - start;
    this.frameTimes[this.frameCount++ % this.frameTimes.length] = this.cost;
    if (this.frameCount % 30 === 0) {
      const samples = this.frameTimes
        .slice(0, Math.min(this.frameCount, this.frameTimes.length))
        .sort();
      this.p95 = samples[Math.floor((samples.length - 1) * 0.95)];
    }
  }
  private currentPose() {
    let pose = this.specimen.flight(this.time, this.options.mode, this.options.seed);
    if (this.transition) {
      const progress = (this.time - this.transition.start) / 0.8;
      if (progress >= 1) this.transition = undefined;
      else pose = blendPose(this.transition.from, pose, progress);
    }
    return { ...pose, ...this.override };
  }
  private frame = (now: number) => {
    if (!this.canRun) return;
    if (!this.lastPaint || now - this.lastPaint >= 1000 / this.options.maxFPS - 0.5) {
      // Analytic kinematics have no catch-up integration or render-rate-dependent forces.
      this.time += Math.max(0, now - this.last) / 1000;
      this.last = now;
      this.lastPaint = now;
      this.render();
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  private schedule() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (!this.canRun) return;
    this.last = performance.now();
    this.lastPaint = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  private onMotion = () => {
    this.motionOverride = false;
    this.schedule();
    this.render();
  };
  private onVisibility = () => this.schedule();
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.motion.removeEventListener('change', this.onMotion);
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.onVisibility);
  }
}
