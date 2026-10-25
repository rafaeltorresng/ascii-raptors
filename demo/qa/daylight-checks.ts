import { AsciiRenderer } from '../../src/ascii.ts';
import type { Theme } from '../../src/ascii.ts';
import { getSpecies } from '../../src/species.ts';
import { eaglePose, transformEagle } from '../../src/species/golden-eagle.ts';
import { DaylightPlate } from '../daylight.ts';
import {
  createBaldEagle,
  createCaliforniaCondor,
  createSkyGolden,
  createSkyFalcon,
} from '../plumage.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

/** Actual Canvas alpha checks, including fractional cell edges at DPR 1 and 2. */
export function checkDaylight(theme: Theme = 'light') {
  const definitions = [
    {
      ink: 'kite',
      species: 'swallow-tailed-kite',
      create: () => getSpecies('swallow-tailed-kite').create(),
    },
    { ink: 'golden', species: 'golden-eagle', create: createSkyGolden },
    { ink: 'peregrine', species: 'peregrine-falcon', create: createSkyFalcon },
    { ink: 'bald', species: 'golden-eagle', create: createBaldEagle },
    { ink: 'condor', species: 'golden-eagle', create: createCaliforniaCondor },
  ] as const;
  const results = [];
  for (const definition of definitions) {
    const model = getSpecies(definition.species);
    const mesh = definition.create();
    for (const [size, dpr] of [
      [240, 1],
      [480, 2],
    ]) {
      const source = document.createElement('canvas');
      const renderer = new AsciiRenderer(source, {
        species: definition.species,
        theme,
        view: 'ventral',
        detail: 'balanced',
        scale: 0.92,
        representation: 'articulated',
      });
      renderer.resize(size, size, dpr);
      const ctx = source.getContext('2d')!;
      const plate = new DaylightPlate(document);
      const original = ctx.drawImage;
      for (const time of [1, 4, 9, 15, 27]) {
        const cells: { x: number; y: number; right: number; bottom: number; full: boolean }[] = [];
        ctx.drawImage = ((image: CanvasImageSource, ...args: number[]) => {
          const [, , , , dx, dy, dw, dh] = args;
          cells.push({
            x: Math.round(dx * dpr),
            y: Math.round(dy * dpr),
            right: Math.round((dx + dw) * dpr),
            bottom: Math.round((dy + dh) * dpr),
            full: ctx.globalAlpha >= 0.84,
          });
          original.apply(ctx, [image, ...args] as Parameters<typeof original>);
        }) as typeof original;
        const observer = ctx.drawImage;
        const mode = time === 4 || time === 15 ? 'flap' : 'soar';
        const pose =
          definition.species === 'golden-eagle'
            ? eaglePose(time, mode, 23)
            : model.flight(time, mode, 11);
        const transformed =
          definition.species === 'golden-eagle'
            ? transformEagle(mesh, pose)
            : model.transform(mesh, pose);
        const canvas = plate.render(
          source,
          definition.ink,
          () => renderer.render(mesh, transformed),
          theme,
        );
        assert(ctx.drawImage === observer, 'Adapter did not restore the original own method');
        ctx.drawImage = original;
        const image = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        const occupied = new Uint8Array(canvas.width * canvas.height);
        let opaquePixels = 0,
          texturedCells = 0,
          partialCells = 0;
        for (const cell of cells) {
          if (!cell.full) partialCells++;
          let darkest = Infinity,
            lightest = 0;
          for (let y = cell.y; y < Math.min(canvas.height, cell.bottom); y++)
            for (let x = cell.x; x < Math.min(canvas.width, cell.right); x++) {
              const pixel = y * canvas.width + x;
              occupied[pixel] = 1;
              if (cell.full) {
                assert(
                  image.data[pixel * 4 + 3] === 255,
                  `${definition.ink} ${size}px @${dpr} ${time}s: sky leak at ${x},${y}`,
                );
                opaquePixels++;
                const tone =
                  image.data[pixel * 4] + image.data[pixel * 4 + 1] + image.data[pixel * 4 + 2];
                darkest = Math.min(darkest, tone);
                lightest = Math.max(lightest, tone);
              }
            }
          if (cell.full && lightest - darkest > 12) texturedCells++;
        }
        for (let p = 0; p < occupied.length; p++)
          if (!occupied[p])
            assert(
              image.data[p * 4 + 3] === 0,
              `${definition.ink}: filled outside the raster silhouette`,
            );
        assert(opaquePixels > 100 && partialCells > 0, `${definition.ink}: empty test frame`);
        assert(texturedCells > 10, `${definition.ink}: ASCII texture disappeared`);
        results.push({
          theme,
          ink: definition.ink,
          size,
          dpr,
          time,
          cells: cells.length,
          opaquePixels,
          partialCells,
          texturedCells,
          leaks: 0,
          outsidePaint: 0,
        });
      }
    }
  }
  const source = document.createElement('canvas');
  source.width = source.height = 24;
  const ctx = source.getContext('2d')!;
  const original = ctx.drawImage;
  const hadOwn = Object.hasOwn(ctx, 'drawImage');
  try {
    new DaylightPlate(document).render(source, 'kite', () => {
      throw new Error('intentional');
    });
  } catch (error) {
    assert((error as Error).message === 'intentional', 'Unexpected error');
  }
  assert(
    ctx.drawImage === original && Object.hasOwn(ctx, 'drawImage') === hadOwn,
    'Drawing method leaked after an exception',
  );
  return { theme, frames: results.length, results, cleanupOnError: true };
}
