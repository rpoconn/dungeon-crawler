/** Damage, healing and swing hit-testing. Pure numbers and geometry; no Phaser. */

import type { Point } from './dungeon';

export function applyDamage(hp: number, amount: number): number {
  return Math.max(0, hp - Math.max(0, Math.round(amount)));
}

export function applyHeal(hp: number, maxHp: number, amount: number): number {
  return Math.min(maxHp, hp + Math.max(0, Math.round(amount)));
}

export function isDead(hp: number): boolean {
  return hp <= 0;
}

export interface Swing {
  origin: Point;
  /** Facing angle in radians. */
  angle: number;
  /** Pixels from origin. */
  reach: number;
  /** Half-angle of the arc, in degrees. */
  arc: number;
}

/** True if a circular target of `radius` at `target` is touched by the swing's wedge. */
export function inSwing(swing: Swing, target: Point, radius: number): boolean {
  const dx = target.x - swing.origin.x;
  const dy = target.y - swing.origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > swing.reach + radius) return false;
  // Anything overlapping the player's own body is hit regardless of facing.
  if (dist <= radius) return true;

  const off = Math.abs(normaliseAngle(Math.atan2(dy, dx) - swing.angle));
  // Widen the arc by the angle the target's radius subtends, so edge-on targets still count.
  const slack = Math.asin(Math.min(1, radius / dist));
  return off <= (swing.arc * Math.PI) / 180 + slack;
}

/** Wraps to (-π, π]. */
export function normaliseAngle(a: number): number {
  const wrapped = (((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return wrapped - Math.PI;
}
