import { describe, expect, it } from 'vitest';
import { applyDamage, applyHeal, inSwing, isDead, normaliseAngle, type Swing } from './combat';

describe('applyDamage / applyHeal', () => {
  it('clamps hp to [0, maxHp]', () => {
    expect(applyDamage(10, 25)).toBe(0);
    expect(applyDamage(10, 3)).toBe(7);
    expect(applyHeal(90, 100, 30)).toBe(100);
    expect(applyHeal(40, 100, 30)).toBe(70);
  });

  it('ignores negative amounts', () => {
    expect(applyDamage(10, -5)).toBe(10);
    expect(applyHeal(10, 100, -5)).toBe(10);
  });

  it('reports death at zero hp', () => {
    expect(isDead(applyDamage(5, 5))).toBe(true);
    expect(isDead(1)).toBe(false);
  });
});

describe('inSwing', () => {
  const swing: Swing = { origin: { x: 0, y: 0 }, angle: 0, reach: 40, arc: 45 };

  it('hits targets in front within reach', () => {
    expect(inSwing(swing, { x: 30, y: 0 }, 8)).toBe(true);
    expect(inSwing(swing, { x: 25, y: 20 }, 8)).toBe(true);
  });

  it('counts the target radius toward reach', () => {
    expect(inSwing(swing, { x: 46, y: 0 }, 8)).toBe(true);
    expect(inSwing(swing, { x: 50, y: 0 }, 8)).toBe(false);
  });

  it('misses targets behind or beside the player', () => {
    expect(inSwing(swing, { x: -30, y: 0 }, 8)).toBe(false);
    expect(inSwing(swing, { x: 0, y: 35 }, 8)).toBe(false);
  });

  it('always hits a target overlapping the player', () => {
    expect(inSwing(swing, { x: -4, y: 0 }, 8)).toBe(true);
  });

  it('works across the ±π seam', () => {
    const facingLeft: Swing = { ...swing, angle: Math.PI };
    expect(inSwing(facingLeft, { x: -30, y: 2 }, 8)).toBe(true);
    expect(inSwing(facingLeft, { x: -30, y: -2 }, 8)).toBe(true);
  });
});

describe('normaliseAngle', () => {
  it('wraps into (-π, π]', () => {
    expect(normaliseAngle(3 * Math.PI)).toBeCloseTo(-Math.PI);
    expect(normaliseAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    expect(normaliseAngle(2 * Math.PI + 0.5)).toBeCloseTo(0.5);
  });
});
