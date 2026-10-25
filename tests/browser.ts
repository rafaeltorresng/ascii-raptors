import { AsciiRaptor as ApprovedRaptors } from './fixtures/approved-raptors-v0.2.js';
import { flightCourse } from '../demo/course.ts';
import { FlightScene } from '../demo/scene.ts';
import { AsciiRaptor as ApprovedKite } from './fixtures/approved-kite-v0.1.js';
import { AsciiRaptor, SPECIES } from '../src/index.ts';
import type { FlightPose, RaptorOptions } from '../src/index.ts';

const fixture = document.getElementById('fixture')!;
const results = document.getElementById('results')!;
const button = document.getElementById('run') as HTMLButtonElement;
const output = document.getElementById('result')!;
const save = document.getElementById('save') as HTMLButtonElement;
save.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([output.textContent!], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'ascii-raptors-validation.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message);
};
function create(width = 640, height = 420, options: Partial<RaptorOptions> = {}, readback = true) {
  const canvas = document.createElement('canvas');
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // Readback-heavy assertions use a CPU-backed context consistently. Otherwise Chromium
  // can switch backends after repeated reads and change glyph antialiasing mid-test.
  if (readback) canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  fixture.append(canvas);
  const engine = new AsciiRaptor(canvas, { paused: true, ...options });
  return {
    canvas,
    engine,
    dispose: () => {
      engine.destroy();
      canvas.remove();
    },
  };
}
function pixels(canvas: HTMLCanvasElement) {
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
}
function checksum(canvas: HTMLCanvasElement) {
  let h = 2166136261;
  for (const byte of pixels(canvas)) h = Math.imul(h ^ byte, 16777619);
  return h >>> 0;
}
function bounds(canvas: HTMLCanvasElement) {
  const data = pixels(canvas),
    bg = [data[0], data[1], data[2]];
  let x0 = canvas.width,
    y0 = canvas.height,
    x1 = -1,
    y1 = -1,
    count = 0;
  for (let y = 0; y < canvas.height; y++)
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) <
        24
      )
        continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      count++;
    }
  return { x0, y0, x1, y1, count };
}

button.addEventListener('click', async () => {
  button.disabled = true;
  save.disabled = true;
  results.replaceChildren();
  const report: { name: string; ok: boolean; detail: string }[] = [];
  const benchmark: unknown[] = [];
  async function run(name: string, fn: () => Promise<string> | string) {
    const li = document.createElement('li');
    li.textContent = `Executando: ${name}`;
    results.append(li);
    try {
      const detail = await fn();
      li.textContent = `PASS · ${name} — ${detail}`;
      li.className = 'pass';
      report.push({ name, ok: true, detail });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      li.textContent = `FAIL · ${name} — ${detail}`;
      li.className = 'fail';
      report.push({ name, ok: false, detail });
    }
  }
  await run('Glifos ASCII e apresentação por atlas', () => {
    let textCalls = 0,
      badGlyph = false;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      textCalls++;
      if ([...text].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126))
        badGlyph = true;
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
    let sample: ReturnType<typeof create> | undefined;
    try {
      sample = create();
      let rectangles = 0,
        atlasCalls = 0;
      const ctx = sample.canvas.getContext('2d')!,
        rect = ctx.fillRect.bind(ctx),
        draw = ctx.drawImage.bind(ctx);
      ctx.fillRect = (x, y, w, h) => {
        rectangles++;
        rect(x, y, w, h);
      };
      ctx.drawImage = ((...args: Parameters<CanvasRenderingContext2D['drawImage']>) => {
        assert(args[0] instanceof HTMLCanvasElement, 'External image used');
        atlasCalls++;
        draw(...args);
      }) as CanvasRenderingContext2D['drawImage'];
      let totalCells = 0;
      for (const species of SPECIES) {
        sample.engine.setOptions({ species: species.id });
        rectangles = 0;
        atlasCalls = 0;
        sample.engine.renderAt(2);
        assert(rectangles === 1, `${species.id}: filled rectangles in bird`);
        assert(atlasCalls > 100, `${species.id}: no glyph atlas presentation`);
        totalCells += atlasCalls;
      }
      assert(textCalls > 100 && !badGlyph, 'Atlas contains non-ASCII text or no glyphs');
      assert(rectangles === 1, 'Visible bird uses filled rectangles');
      assert(atlasCalls > 100, 'No glyph atlas presentation');
      return `${textCalls} gravações de glifos ASCII; ${totalCells} células nas três aves; apenas um preenchimento de fundo por quadro`;
    } finally {
      CanvasRenderingContext2D.prototype.fillText = original;
      sample?.dispose();
    }
  });
  await run('Gavião aprovado: igualdade pixel a pixel com o motor congelado', () => {
    let frames = 0;
    for (const width of [354, 960])
      for (const theme of ['dark', 'light'] as const) {
        const current = create(width, 420, { theme });
        const canvas = document.createElement('canvas');
        canvas.style.width = `${width}px`;
        canvas.style.height = '420px';
        canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        fixture.append(canvas);
        const approved = new ApprovedKite(canvas, { paused: true, theme });
        try {
          for (const view of ['ventral', 'oblique', 'dorsal', 'profile'] as const)
            for (const time of [2, 10.4, 12.8]) {
              current.engine.setOptions({ view });
              approved.setOptions({ view });
              current.engine.renderAt(time);
              approved.renderAt(time);
              const a = pixels(current.canvas),
                b = pixels(canvas);
              assert(
                a.length === b.length && a.every((value, index) => value === b[index]),
                `${width}/${theme}/${view}/${time}: visual regression`,
              );
              frames++;
            }
        } finally {
          current.dispose();
          approved.destroy();
          canvas.remove();
        }
      }
    return `${frames} quadros idênticos em todos os pixels RGBA; dois tamanhos, dois temas, quatro vistas`;
  });
  await run('Três aves aprovadas: 168 quadros RGBA idênticos à referência v0.2', () => {
    let frames = 0;
    for (const species of SPECIES)
      for (const width of [354, 960])
        for (const theme of ['dark', 'light'] as const) {
          const current = create(width, 420, { theme, species: species.id });
          const canvas = document.createElement('canvas');
          canvas.style.width = `${width}px`;
          canvas.style.height = '420px';
          canvas.getContext('2d', { alpha: false, willReadFrequently: true });
          fixture.append(canvas);
          const approved = new ApprovedRaptors(canvas, {
            theme,
            species: species.id,
            paused: true,
          });
          const compare = (time: number, pose?: Partial<FlightPose>) => {
            current.engine.renderAt(time, pose);
            approved.renderAt(time, pose);
            const a = pixels(current.canvas),
              b = pixels(canvas);
            assert(
              a.length === b.length && a.every((v, i) => v === b[i]),
              `${species.id}/${width}/${theme}/${time}: regression`,
            );
            frames++;
          };
          try {
            for (const view of ['ventral', 'oblique', 'dorsal', 'profile'] as const) {
              current.engine.setOptions({ view });
              approved.setOptions({ view });
              for (const time of [2, 10.4, 12.8]) compare(time);
            }
            if (width === 354)
              for (const study of species.studies) {
                current.engine.setOptions({ view: study.view });
                approved.setOptions({ view: study.view });
                compare(2, study.pose);
              }
          } finally {
            current.dispose();
            approved.destroy();
            canvas.remove();
          }
        }
    return `${frames} quadros; anatomia, materiais, câmera, glifos e poses preservados`;
  });
  await run('Cena coletiva: pausa, suspensão, retomada e custo das três aves', async () => {
    for (const [width, height] of [
      [354, 660],
      [1440, 750],
    ]) {
      const canvas = document.createElement('canvas');
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      fixture.append(canvas);
      const scene = new FlightScene(canvas, { theme: 'dark', paused: true });
      try {
        scene.renderAt(2);
        const before = checksum(canvas);
        await delay(80);
        assert(checksum(canvas) === before, 'Scene pause changed pixels');
        scene.play();
        await delay(180);
        assert(scene.stats.time > 2, 'Scene did not play');
        fixture.style.transform = 'translateX(4000px)';
        await delay(100);
        const count = scene.stats.frames;
        await delay(120);
        assert(count === scene.stats.frames && !scene.stats.running, 'Hidden scene still renders');
        fixture.style.transform = '';
        await delay(130);
        assert(scene.stats.running, 'Scene did not resume');
        scene.pause();
        const costs: number[] = [];
        for (let i = 0; i < 70; i++) {
          scene.renderAt(i / 30);
          if (i >= 10) costs.push(scene.stats.frameMs);
          if (i % 20 === 0) await delay(0);
        }
        costs.sort((a, b) => a - b);
        benchmark.push({
          scene: 'collection',
          width,
          height,
          frames: costs.length,
          medianMs: Number(costs[30].toFixed(2)),
          p95Ms: Number(costs[57].toFixed(2)),
        });
        scene.destroy();
        scene.play();
        assert(!scene.stats.running, 'Destroyed scene restarted');
      } finally {
        fixture.style.transform = '';
        scene.destroy();
        canvas.remove();
      }
    }
    return 'cena compartilhada suspensa fora de vista; 60 amostras por tamanho';
  });
  await run('Cena coletiva: as aves seguem rotas e trocam de lugar', async () => {
    const width = 1440,
      height = 750;
    const canvas = document.createElement('canvas');
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    fixture.append(canvas);
    const scene = new FlightScene(canvas, { theme: 'dark', paused: true });
    const ink = (x: number, y: number, radius: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width,
        sy = canvas.height / rect.height;
      const cx = Math.round(x * sx),
        cy = Math.round(y * sy),
        r = Math.max(2, Math.round(radius * sx));
      const image = canvas
        .getContext('2d')!
        .getImageData(Math.max(0, cx - r), Math.max(0, cy - r), r * 2, r * 2).data;
      let marks = 0;
      for (let i = 0; i < image.length; i += 16)
        if (image[i] + image[i + 1] + image[i + 2] > 70) marks++;
      return marks;
    };
    try {
      const travel: number[] = [];
      for (const species of SPECIES) {
        let distance = 0;
        let previous = flightCourse(species.id, 2, { width, height });
        for (let time = 2.25; time <= 12; time += 0.25) {
          const next = flightCourse(species.id, time, { width, height });
          distance += Math.hypot((next.x - previous.x) * width, (next.y - previous.y) * height);
          previous = next;
        }
        assert(distance > 450, `${species.id} moved only ${distance.toFixed(0)} px`);
        travel.push(distance);
        const later = previous;
        scene.renderAt(12);
        const onCourse = ink(later.x * width, later.y * height, 48);
        scene.renderAt(2);
        const vacated = ink(later.x * width, later.y * height, 48);
        assert(onCourse > 12 && onCourse > vacated, `${species.id} is not riding its route`);
      }
      return `deslocamentos ${travel.map((d) => Math.round(d)).join(' / ')} px em 10 s`;
    } finally {
      scene.destroy();
      canvas.remove();
    }
  });
  await run('Cena coletiva respeita movimento reduzido e a escolha explícita', async () => {
    const original = window.matchMedia;
    const media = Object.assign(new EventTarget(), {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener() {},
      removeListener() {},
    });
    window.matchMedia = (query: string) =>
      query.includes('prefers-reduced-motion')
        ? (media as MediaQueryList)
        : original.call(window, query);
    const canvas = document.createElement('canvas');
    canvas.style.width = '960px';
    canvas.style.height = '640px';
    fixture.append(canvas);
    let scene: FlightScene | undefined;
    try {
      scene = new FlightScene(canvas, { theme: 'dark', paused: false });
      await delay(90);
      assert(
        scene.stats.reducedMotion && !scene.stats.running && scene.stats.time === 0,
        'Scene started moving',
      );
      const still = checksum(canvas);
      await delay(120);
      assert(checksum(canvas) === still, 'Reduced motion changed the sky');
      scene.play();
      await delay(160);
      assert(scene.stats.running && scene.stats.time > 0, 'Explicit play ignored');
      media.dispatchEvent(new Event('change'));
      await delay(80);
      assert(!scene.stats.running, 'Scene ignored the preference change');
      return 'céu parado até a reprodução explícita';
    } finally {
      scene?.destroy();
      canvas.remove();
      window.matchMedia = original;
    }
  });
  await run(
    'Troca entre espécies preserva pausa, descarta poses e retorna ao gavião intacto',
    () => {
      const s = create();
      try {
        s.engine.renderAt(2);
        const original = checksum(s.canvas);
        for (const species of SPECIES) {
          s.engine.renderAt(2, { bank: 0.7, lift: 0.5 });
          s.engine.setOptions({ species: species.id });
          assert(!s.engine.stats.running, 'Switch overrode pause');
          assert(s.engine.stats.species === species.id, 'Wrong species');
          s.engine.renderAt(2);
          assert(bounds(s.canvas).count > 50, 'Empty switched species');
        }
        s.engine.setOptions({ species: 'swallow-tailed-kite' });
        s.engine.renderAt(2);
        assert(checksum(s.canvas) === original, 'Switch back changed kite');
        return 'trocas sucessivas e retorno sem resíduos de material, geometria ou pose';
      } finally {
        s.dispose();
      }
    },
  );
  await run('Quadro estático reproduzível e sem dependência do histórico', () => {
    const s = create();
    try {
      s.engine.renderAt(6);
      const a = checksum(s.canvas);
      s.engine.renderAt(11);
      s.engine.renderAt(6);
      assert(a === checksum(s.canvas), 'Frame differs after intervening pose');
      return `checksum ${a}`;
    } finally {
      s.dispose();
    }
  });
  await run('Reprodução, pausa e destruição idempotente', async () => {
    const s = create();
    try {
      s.engine.play();
      await delay(220);
      assert(s.engine.stats.time > 0.07, 'Clock did not advance');
      s.engine.pause();
      const time = s.engine.stats.time,
        frame = checksum(s.canvas);
      await delay(100);
      assert(s.engine.stats.time === time && checksum(s.canvas) === frame, 'Paused frame changed');
      s.engine.destroy();
      s.engine.destroy();
      s.engine.play();
      await delay(100);
      assert(!s.engine.stats.running && s.engine.stats.time === time, 'Destroyed engine restarted');
      return 'tempo e pixels congelados após pausa; nenhuma retomada após destroy';
    } finally {
      s.dispose();
    }
  });
  await run('Troca de comportamento e retomada de pose sem salto inicial', async () => {
    const s = create();
    try {
      s.engine.renderAt(2, { bank: 0.61, lift: 0.4 });
      const before = checksum(s.canvas);
      s.engine.play();
      assert(checksum(s.canvas) === before, 'Resume jumped on its first frame');
      await delay(120);
      s.engine.pause();
      const beforeMode = checksum(s.canvas);
      s.engine.setOptions({ mode: 'flap' });
      assert(checksum(s.canvas) === beforeMode, 'Mode switch jumped on its first frame');
      s.engine.play();
      await delay(100);
      assert(s.engine.stats.running, 'Mode transition stalled');
      return 'quadros iniciais preservados; transições continuam em reprodução';
    } finally {
      s.dispose();
    }
  });
  await run('Suspensão fora de vista e retomada sem recuperar tempo oculto', async () => {
    const s = create();
    try {
      s.engine.play();
      await delay(100);
      fixture.style.transform = 'translateX(3000px)';
      await delay(100);
      assert(!s.engine.stats.running, 'Offscreen scene still active');
      const time = s.engine.stats.time;
      await delay(150);
      assert(s.engine.stats.time === time, 'Offscreen clock advanced');
      fixture.style.transform = '';
      await delay(130);
      assert(
        s.engine.stats.running && s.engine.stats.time > time && s.engine.stats.time - time < 0.25,
        'Invalid resume',
      );
      return 'IntersectionObserver suspende e retoma o relógio';
    } finally {
      fixture.style.transform = '';
      s.dispose();
    }
  });
  await run('Movimento reduzido inicial, alteração ao vivo e escolha explícita', async () => {
    const original = window.matchMedia;
    const media = Object.assign(new EventTarget(), {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener() {},
      removeListener() {},
    });
    window.matchMedia = (query: string) =>
      query.includes('prefers-reduced-motion')
        ? (media as MediaQueryList)
        : original.call(window, query);
    let s: ReturnType<typeof create> | undefined;
    try {
      s = create(640, 420, { paused: false });
      await delay(80);
      assert(
        s.engine.stats.reducedMotion && !s.engine.stats.running && s.engine.stats.time === 0,
        'Reduced motion did not start still',
      );
      for (const species of SPECIES) {
        s.engine.setOptions({ species: species.id });
        assert(
          !s.engine.stats.running && s.engine.stats.time === 0,
          'Species switch ignored reduced motion',
        );
      }
      s.engine.play();
      await delay(100);
      assert(s.engine.stats.running, 'Explicit play was ignored');
      media.dispatchEvent(new Event('change'));
      await delay(80);
      assert(!s.engine.stats.running, 'Live reduced-motion event ignored');
      media.matches = false;
      media.dispatchEvent(new Event('change'));
      await delay(100);
      assert(s.engine.stats.running, 'Motion did not resume');
      s.engine.pause();
      media.dispatchEvent(new Event('change'));
      assert(!s.engine.stats.running, 'Preference event overrode manual pause');
      return 'preferência emulada; pausa manual preservada';
    } finally {
      s?.dispose();
      window.matchMedia = original;
    }
  });
  await run('432 combinações e 24 poses próprias das três espécies', async () => {
    let frames = 0;
    const poses: Partial<FlightPose>[] = [
      { lift: 0, elbow: 0, tip: 0, fold: 0, bank: 0 },
      { lift: 0.67, elbow: -0.12, tip: -0.15, bank: 0.45 },
      { lift: -0.64, elbow: 0.12, tip: 0.2, bank: -0.35 },
    ];
    for (const species of SPECIES)
      for (const width of [320, 390, 960])
        for (const theme of ['dark', 'light'] as const) {
          const s = create(width, width > 400 ? 540 : 390, { theme, species: species.id });
          try {
            for (const view of ['ventral', 'oblique', 'dorsal', 'profile'] as const)
              for (const time of [2, 30])
                for (const pose of poses) {
                  s.engine.setOptions({ view });
                  s.engine.renderAt(time, pose);
                  const b = bounds(s.canvas);
                  assert(b.count > 50, `${width}/${theme}/${view}: empty bird`);
                  assert(
                    b.x0 > 1 && b.y0 > 1 && b.x1 < s.canvas.width - 2 && b.y1 < s.canvas.height - 2,
                    `${species.id}/${width}/${theme}/${view}: clipped bird ${JSON.stringify(b)}`,
                  );
                  frames++;
                }
          } finally {
            s.dispose();
          }
          await delay(0);
        }
    for (const species of SPECIES)
      for (const theme of ['dark', 'light'] as const) {
        const s = create(320, 390, { theme, species: species.id });
        try {
          for (const study of species.studies) {
            s.engine.setOptions({ view: study.view });
            s.engine.renderAt(2, study.pose);
            const b = bounds(s.canvas);
            assert(
              b.count > 50 &&
                b.x0 > 1 &&
                b.y0 > 1 &&
                b.x1 < s.canvas.width - 2 &&
                b.y1 < s.canvas.height - 2,
              `${species.id}/${study.name}: empty or clipped`,
            );
            frames++;
          }
        } finally {
          s.dispose();
        }
      }
    return `${frames} quadros não vazios e sem cortes no enquadramento padrão`;
  });
  await run('Comparação articulada versus plana', () => {
    const s = create();
    try {
      s.engine.renderAt(2, { bank: 0.6, lift: 0.3 });
      const articulated = checksum(s.canvas);
      s.engine.setOptions({ representation: 'flat' });
      const flat = checksum(s.canvas);
      assert(articulated !== flat, 'Representations identical');
      assert(bounds(s.canvas).count > 50, 'Flat reference is empty');
      return `articulada ${articulated}; plana ${flat}`;
    } finally {
      s.dispose();
    }
  });
  await run('Opções inválidas são rejeitadas e a instância continua íntegra', () => {
    const s = create();
    let rejected = 0;
    try {
      for (const options of [
        { scale: NaN },
        { scale: 0 },
        { maxFPS: 0 },
        { view: 'invalid' },
        { species: 'unknown' },
      ])
        try {
          s.engine.setOptions(options as Partial<RaptorOptions>);
        } catch {
          rejected++;
        }
      assert(rejected === 5, 'Invalid options accepted');
      s.engine.renderAt(2);
      assert(bounds(s.canvas).count > 50, 'Invalid options corrupted scene');
      return '5 entradas inválidas rejeitadas sem corromper a cena';
    } finally {
      s.dispose();
    }
  });
  await run('Amostra de custo de renderização', async () => {
    for (const species of SPECIES)
      for (const [width, height, detail] of [
        [1270, 540, 'balanced'],
        [354, 390, 'balanced'],
        [1270, 540, 'fine'],
      ] as const) {
        const s = create(width, height, { detail, species: species.id }, false);
        try {
          const costs: number[] = [];
          for (let i = 0; i < 130; i++) {
            s.engine.renderAt(i / 30);
            if (i >= 10) costs.push(s.engine.stats.frameMs);
            if (i % 30 === 0) await delay(0);
          }
          costs.sort((a, b) => a - b);
          benchmark.push({
            species: species.id,
            width,
            height,
            detail,
            frames: costs.length,
            medianMs: Number(costs[60].toFixed(2)),
            p95Ms: Number(costs[114].toFixed(2)),
            maxMs: Number(costs[119].toFixed(2)),
            grid: [s.engine.stats.columns, s.engine.stats.rows],
            glyphs: s.engine.stats.cells,
          });
        } finally {
          s.dispose();
        }
      }
    return '120 amostras por configuração; tempos do motor, não FPS garantidos';
  });
  output.textContent = JSON.stringify(
    {
      date: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: [innerWidth, innerHeight],
      dpr: devicePixelRatio,
      passed: report.filter((r) => r.ok).length,
      total: report.length,
      results: report,
      benchmark,
    },
    null,
    2,
  );
  button.disabled = false;
  save.disabled = false;
  if (new URL(location.href).searchParams.get('save') === '1') save.click();
});
// A normal URL-triggered run also works in native browsers without a DOM connector.
if (new URL(location.href).searchParams.get('run') === '1') button.click();
