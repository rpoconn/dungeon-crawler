import { describe, expect, it } from 'vitest';
import { NO_POSITION, complete, descend, newSave } from './save';

describe('newSave', () => {
    it('starts on floor 1 at full health with no saved position or floor progress', () => {
        const save = newSave(42);
        expect(save).toMatchObject({ level: 1, seed: 42, completed: false });
        expect(save.hp).toBe(save.maxHp);
        expect(save.x).toBe(NO_POSITION);
        expect(save.y).toBe(NO_POSITION);
        expect(save.openedChests).toEqual([]);
        expect(save.slain).toEqual([]);
    });

    it('rolls an integer seed when none is given', () => {
        const { seed } = newSave();
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThan(2 ** 31);
    });
});

describe('descend', () => {
    it('moves to the next floor entrance and keeps hp and weapon', () => {
        const save = { ...newSave(7), level: 3, hp: 40, x: 12, y: 9, weaponId: 'war-axe' };
        expect(descend(save)).toEqual({ ...save, level: 4, x: NO_POSITION, y: NO_POSITION });
    });

    it('forgets the previous floor’s opened chests and kills', () => {
        const save = { ...newSave(7), openedChests: [0], slain: [1, 4] };
        expect(descend(save)).toMatchObject({ openedChests: [], slain: [] });
    });
});

describe('complete', () => {
    it('marks the run completed without touching the rest', () => {
        const save = { ...newSave(7), level: 10, hp: 12 };
        expect(complete(save)).toEqual({ ...save, completed: true });
    });
});
