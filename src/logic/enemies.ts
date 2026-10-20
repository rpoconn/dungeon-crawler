/** Enemy kinds. Phase 2 only needs their colours for placeholder textures; stats arrive in Phase 3. */

export const ENEMY_KINDS = ['skeleton', 'zombie', 'bat', 'cultist', 'ghoul', 'lich'] as const;
export type EnemyKind = (typeof ENEMY_KINDS)[number];

export const ENEMY_COLOURS: Readonly<Record<EnemyKind, number>> = {
  skeleton: 0xd9d2c0,
  zombie: 0x5f7f3a,
  bat: 0x5a4a6e,
  cultist: 0x8c1c1c,
  ghoul: 0x7a6a4f,
  lich: 0x3fa7b5,
};
