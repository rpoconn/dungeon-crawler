/** Save blob shape (mirrors server/models.py SaveState) and the transitions between runs and floors. */

import { STARTING_WEAPON } from './weapons';

export interface SaveState {
  level: number;
  seed: number;
  hp: number;
  maxHp: number;
  weaponId: string;
  /** Player tile. NO_POSITION means "spawn at the floor entrance". */
  x: number;
  y: number;
  /** Indices into this floor's spawn plan (`planSpawns`) of chests already opened. */
  openedChests: number[];
  /** Indices into this floor's spawn plan of enemies already killed. */
  slain: number[];
  completed: boolean;
}

export const NO_POSITION = -1;
export const START_HP = 100;
export const START_WEAPON = STARTING_WEAPON.id;

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function newSave(seed = randomSeed()): SaveState {
  return {
    level: 1,
    seed,
    hp: START_HP,
    maxHp: START_HP,
    weaponId: START_WEAPON,
    x: NO_POSITION,
    y: NO_POSITION,
    openedChests: [],
    slain: [],
    completed: false,
  };
}

/** The run as it stands on arrival at the next floor: spawn at its entrance, fully populated. */
export function descend(state: SaveState): SaveState {
  return {
    ...state,
    level: state.level + 1,
    x: NO_POSITION,
    y: NO_POSITION,
    openedChests: [],
    slain: [],
  };
}

/** The run after leaving the last floor. Kept until the player confirms a new run. */
export function complete(state: SaveState): SaveState {
  return { ...state, completed: true };
}
