import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudBanks, cloudCells } from '../demo/clouds.ts';

test('cloud grain is stable and bounded across desktop and small canvases', () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [320, 480],
  ]) {
    const banks = cloudBanks(width, height, 0);
    assert.equal(banks.length, 3);
    let glyphs = 0;
    for (const bank of banks) {
      const cells = cloudCells(bank.width, bank.height, bank.seed);
      assert.deepEqual(cells, cloudCells(bank.width, bank.height, bank.seed));
      assert.ok(cells.length > 10);
      for (const cell of cells) {
        assert.ok(cell.x >= 0 && cell.x < bank.width && cell.y >= 0 && cell.y < bank.height);
        assert.ok(cell.alpha > 0 && cell.alpha <= 1);
        assert.ok('.,:-'.includes(cell.glyph));
      }
      glyphs += cells.length;
    }
    assert.ok(glyphs < (width * height) / 100, 'clouds overwhelm the open sky');
  }
  assert.deepEqual(cloudBanks(0, 800, 0), []);
});

test('clouds drift slowly, wrap only offscreen and freeze at the same time', () => {
  for (const width of [390, 1440]) {
    for (const time of [0, 1, 60, 900, 10000]) {
      const now = cloudBanks(width, 900, time);
      assert.deepEqual(now, cloudBanks(width, 900, time));
      const next = cloudBanks(width, 900, time + 0.1);
      now.forEach((bank, i) => {
        const distance = next[i].x - bank.x;
        assert.ok(
          (distance >= 0 && distance < 1) || (bank.x >= width && next[i].x + next[i].width <= 0),
        );
        assert.ok(bank.opacity > 0 && bank.opacity <= 1);
      });
    }
  }
});
