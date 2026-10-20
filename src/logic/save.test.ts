import { describe, expect, it } from 'vitest';
import { NO_POSITION, descend, newSave } from './save';

describe('newSave', () => {
  it('starts on floor 1 at full health with no saved position', () => {
    const save = newSave(42);
    expect(save).toMatchObject({ level: 1, seed: 42, completed: false });
    expect(save.hp).toBe(save.maxHp);
    expect(save.x).toBe(NO_POSITION);
    expect(save.y).toBe(NO_POSITION);
  });

  it('rolls an integer seed when none is given', () => {
    const { seed } = newSave();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 31);
  });
});

describe('descend', () => {
  it('moves to the next floor entrance and keeps the rest of the run', () => {
    const save = { ...newSave(7), level: 3, hp: 40, x: 12, y: 9, weaponId: 'war-axe' };
    expect(descend(save)).toEqual({ ...save, level: 4, x: NO_POSITION, y: NO_POSITION });
  });
});
