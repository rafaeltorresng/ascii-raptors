import test from 'node:test';
import assert from 'node:assert/strict';
import { flightPose } from '../src/flight.ts';
import { eaglePose } from '../src/species/golden-eagle.ts';
import { moreFlaps } from '../demo/flaps.ts';

function activations(activity: number[]) {
  let count = 0;
  let on = false;
  for (const value of activity) {
    if (!on && value > 0.85) {
      count += 1;
      on = true;
    } else if (on && value < 0.15) on = false;
  }
  return count;
}

test('extra series use the species stroke and happen more often', () => {
  const kite = (time: number, mode?: 'soar' | 'glide' | 'flap') => flightPose(time, mode, 11);
  const samples = [];
  const authored = [];
  for (let time = 0; time <= 60; time += 0.05) {
    samples.push(moreFlaps(time, kite, 7.5, 3.2, 0.2).activity);
    authored.push(kite(time, 'soar').activity);
  }
  assert.ok(activations(samples) > activations(authored) + 3);

  const resting = moreFlaps(20, kite, 7.5, 3.2, 0.2);
  assert.equal(resting.lift, kite(20, 'soar').lift);
  assert.equal(resting.elbow, kite(20, 'soar').elbow);

  const flapping = moreFlaps(1.6, kite, 7.5, 3.2, 0.2);
  assert.equal(flapping.lift, kite(1.6, 'flap').lift);
  assert.notEqual(flapping.lift, kite(1.6 / 1.6, 'flap').lift);

  let previous = 0;
  let gap = 0;
  for (let time = 1.05; time < 2.6; time += 0.01) {
    const lift = moreFlaps(time, kite, 7.5, 3.2, 0.2).lift;
    if (previous > 0.2 && lift <= 0.2) {
      if (gap === 0) gap = time;
      else {
        gap = time - gap;
        break;
      }
    }
    previous = lift;
  }
  assert.ok(gap > 0.65 && gap < 0.9, `stroke interval ${gap}`);

  const eagle = (time: number, mode?: 'soar' | 'glide' | 'flap') => eaglePose(time, mode, 23);
  const eagleSamples = [];
  const eagleAuthored = [];
  for (let time = 0; time <= 60; time += 0.05) {
    eagleSamples.push(moreFlaps(time, eagle, 10, 4.2, 3.1).activity);
    eagleAuthored.push(eagle(time, 'soar').activity);
  }
  assert.ok(activations(eagleSamples) > activations(eagleAuthored) + 2);
});
