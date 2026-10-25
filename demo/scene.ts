import { AsciiRenderer } from '../src/ascii.ts';
import type { Theme } from '../src/ascii.ts';
import type { BirdMesh, TransformedMesh } from '../src/bird.ts';
import type { FlightPose } from '../src/flight.ts';
import { getSpecies } from '../src/species.ts';
import type { SpeciesId } from '../src/species.ts';
import { eaglePose, transformEagle } from '../src/species/golden-eagle.ts';
import { FLYERS, flightCourse, steerPose } from './course.ts';
import type { FlightCourse, FlyerId } from './course.ts';
import { drawAir, paintSky } from './air.ts';
import type { Ink } from './ink.ts';
import { moreFlaps } from './flaps.ts';
import { SKY_LAYOUT, skySpriteSize } from './layout.ts';
import { PlumagePlate } from './daylight.ts';
import {
  createBaldEagle,
  createCaliforniaCondor,
  createSkyFalcon,
  createSkyGolden,
} from './plumage.ts';

interface SkyBird {
  id: FlyerId;
  canvas: HTMLCanvasElement;
  mesh: BirdMesh;
  positions: Float32Array;
  renderer: AsciiRenderer;
  plumage?: PlumagePlate;
  renderSpecies: SpeciesId;
  ink: Ink;
  bulk: number;
  flight: (time: number, course?: FlightCourse) => FlightPose;
  transform: (mesh: BirdMesh, pose: FlightPose, output?: Float32Array) => TransformedMesh;
}

export const MODEL: Record<
  FlyerId,
  {
    renderSpecies: SpeciesId;
    ink: Ink;
    bulk: number;
    create: () => BirdMesh;
    flight: (time: number, course?: FlightCourse) => FlightPose;
    transform: (mesh: BirdMesh, pose: FlightPose, output?: Float32Array) => TransformedMesh;
  }
> = {
  'swallow-tailed-kite': {
    renderSpecies: 'swallow-tailed-kite',
    ink: 'kite',
    bulk: SKY_LAYOUT['swallow-tailed-kite'].bulk,
    create: () => getSpecies('swallow-tailed-kite').create(),
    flight: (time, course) =>
      moreFlaps(
        time,
        (t, mode) => getSpecies('swallow-tailed-kite').flight(t, mode, 11),
        7.5,
        3.2,
        0.2,
        course?.effort,
      ),
    transform: (mesh, pose, output) =>
      getSpecies('swallow-tailed-kite').transform(mesh, pose, output),
  },
  'golden-eagle': {
    renderSpecies: 'golden-eagle',
    ink: 'golden',
    bulk: SKY_LAYOUT['golden-eagle'].bulk,
    create: createSkyGolden,
    flight: (time, course) =>
      moreFlaps(time, (t, mode) => eaglePose(t, mode, 23), 10, 4.2, 3.1, course?.effort),
    transform: transformEagle,
  },
  'peregrine-falcon': {
    renderSpecies: 'peregrine-falcon',
    ink: 'peregrine',
    bulk: SKY_LAYOUT['peregrine-falcon'].bulk,
    create: createSkyFalcon,
    flight: (time, course) => {
      const pose = moreFlaps(
        time,
        (t, mode) => getSpecies('peregrine-falcon').flight(t, mode, 37),
        7,
        5.2,
        1.4,
        course?.effort,
      );
      if (!course) return pose;
      // A brief gathered glide between powered passes. Both endpoints remain
      // inside the falcon's approved glide/compact study poses; no rate change.
      const coast = 1 - course.effort;
      return {
        ...pose,
        fold: pose.fold + (0.56 - pose.fold) * coast,
        tailSpread: pose.tailSpread + (0.66 - pose.tailSpread) * coast,
      };
    },
    transform: (mesh, pose, output) => getSpecies('peregrine-falcon').transform(mesh, pose, output),
  },
  'bald-eagle': {
    renderSpecies: 'golden-eagle',
    ink: 'bald',
    bulk: SKY_LAYOUT['bald-eagle'].bulk,
    create: createBaldEagle,
    flight: (time, course) =>
      moreFlaps(time, (t, mode) => eaglePose(t, mode, 41), 9, 4, 5.2, course?.effort),
    transform: transformEagle,
  },
  'california-condor': {
    renderSpecies: 'golden-eagle',
    ink: 'condor',
    bulk: SKY_LAYOUT['california-condor'].bulk,
    create: createCaliforniaCondor,
    flight: (time, course) =>
      moreFlaps(time, (t, mode) => eaglePose(t, mode, 59), 11, 3.8, 7.4, course?.effort),
    transform: transformEagle,
  },
};

/** Demo-only composition. The approved models, poses and ASCII renderer are untouched. */
export class FlightScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private birds: SkyBird[] = FLYERS.map((id) => {
    const model = MODEL[id];
    const canvas = document.createElement('canvas');
    const mesh = model.create();
    return {
      id,
      canvas,
      mesh,
      positions: new Float32Array(mesh.vertices.length * 3),
      renderer: new AsciiRenderer(canvas, {
        species: model.renderSpecies,
        theme: 'dark',
        view: 'ventral',
        detail: 'balanced',
        scale: 0.92,
        representation: 'articulated',
      }),
      renderSpecies: model.renderSpecies,
      ink: model.ink,
      bulk: model.bulk,
      flight: model.flight,
      transform: model.transform,
    };
  });
  private theme: Theme;
  private paused: boolean;
  private disposed = false;
  private inView = true;
  private overrideMotion = false;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private painted = 0;
  private time = 0;
  private cost = 0;
  private frames = 0;
  constructor(canvas: HTMLCanvasElement, options: { theme: Theme; paused?: boolean }) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D indisponível.');
    this.ctx = ctx;
    this.theme = options.theme;
    this.paused = options.paused ?? false;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);
    this.motion.addEventListener('change', this.onMotion);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.schedule();
  }
  get stats() {
    return {
      running:
        !this.disposed &&
        !this.paused &&
        this.inView &&
        !document.hidden &&
        (!this.motion.matches || this.overrideMotion),
      reducedMotion: this.motion.matches,
      time: this.time,
      frameMs: this.cost,
      frames: this.frames,
    };
  }
  pause() {
    this.paused = true;
    this.schedule();
  }
  play() {
    if (this.disposed) return;
    this.paused = false;
    this.overrideMotion = true;
    this.schedule();
  }
  setTheme(theme: Theme) {
    this.theme = theme;
    this.configure();
    this.render();
  }
  renderAt(time: number) {
    if (!Number.isFinite(time) || time < 0) throw new RangeError('Invalid time');
    this.pause();
    this.time = time;
    this.birds.forEach((b) => b.renderer.resetHistory());
    this.render();
  }
  private configure() {
    for (const bird of this.birds)
      bird.renderer.configure({
        species: bird.renderSpecies,
        theme: this.theme,
        view: 'ventral',
        detail: 'balanced',
        scale: 0.92,
        representation: 'articulated',
      });
  }
  resize() {
    if (this.disposed) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (bounds.width === this.width && bounds.height === this.height && dpr === this.dpr) return;
    this.width = bounds.width;
    this.height = bounds.height;
    this.dpr = dpr;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.configure();
    this.birds.forEach((bird) => {
      const size = skySpriteSize(bird.bulk, this.width, this.height);
      bird.renderer.resize(size, size, this.dpr);
    });
    this.render();
  }
  private render() {
    if (this.disposed || !this.width) return;
    const start = performance.now();
    const viewport = { width: this.width, height: this.height };
    const layer = this.birds
      .map((bird) => ({
        bird,
        course: flightCourse(bird.id, this.time, viewport),
      }))
      .sort((a, b) => a.course.scale - b.course.scale);
    this.ctx.globalCompositeOperation = 'source-over';
    paintSky(this.ctx, this.width, this.height, this.theme);
    drawAir(this.ctx, this.width, this.height, this.time, this.theme, 'cloud');
    drawAir(this.ctx, this.width, this.height, this.time, this.theme, 'air');
    this.ctx.globalCompositeOperation = 'source-over';
    for (const { bird, course } of layer) {
      const pose = steerPose(bird.flight(this.time, course), course, bird.id);
      bird.renderer.configure({
        species: bird.renderSpecies,
        theme: this.theme,
        view: 'ventral',
        detail: 'balanced',
        scale: course.scale,
        representation: 'articulated',
      });
      const draw = () =>
        bird.renderer.render(bird.mesh, bird.transform(bird.mesh, pose, bird.positions));
      bird.plumage ??= new PlumagePlate(bird.canvas.ownerDocument);
      const plate = bird.plumage.render(bird.canvas, bird.ink, draw, this.theme);
      const w = bird.canvas.width / this.dpr,
        h = bird.canvas.height / this.dpr;
      this.ctx.drawImage(
        plate,
        Math.round((course.x * this.width - w * 0.5) * this.dpr) / this.dpr,
        Math.round((course.y * this.height - h * 0.5) * this.dpr) / this.dpr,
        w,
        h,
      );
    }
    this.ctx.globalCompositeOperation = 'source-over';
    this.cost = performance.now() - start;
    this.frames++;
  }
  private frame = (now: number) => {
    if (!this.stats.running) return;
    const fps = this.width < 700 ? 24 : 30;
    if (!this.painted || now - this.painted >= 1000 / fps - 0.5) {
      this.time += (now - this.last) / 1000;
      this.last = now;
      this.painted = now;
      this.render();
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  private schedule() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (!this.stats.running) return;
    this.last = performance.now();
    this.painted = 0;
    this.raf = requestAnimationFrame(this.frame);
  }
  private onMotion = () => {
    this.overrideMotion = false;
    this.schedule();
  };
  private onVisibility = () => this.schedule();
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.motion.removeEventListener('change', this.onMotion);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.birds.forEach((b) => {
      b.canvas.width = 0;
      b.canvas.height = 0;
    });
  }
}
