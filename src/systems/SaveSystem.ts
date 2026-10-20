import Phaser from 'phaser';
import { putSave, putSaveOnUnload } from '../api/saves';
import type { SaveState } from '../logic/save';

const AUTOSAVE_MS = 10_000;

/**
 * Persists the run while a floor is being played: every 10s and when the tab closes. Leaving the
 * floor (stairs, death, logout) calls `commit` with the state to store, which ends autosaving so a
 * late tick can never overwrite it.
 */
export class SaveSystem {
  private committed = false;

  constructor(
    scene: Phaser.Scene,
    private readonly snapshot: () => SaveState,
  ) {
    scene.time.addEvent({ delay: AUTOSAVE_MS, loop: true, callback: () => void this.save() });

    const onUnload = (): void => {
      if (!this.committed) void putSaveOnUnload(this.snapshot());
    };
    window.addEventListener('beforeunload', onUnload);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('beforeunload', onUnload),
    );
  }

  async save(): Promise<void> {
    if (!this.committed) await putSave(this.snapshot());
  }

  /** Final save for this floor. Resolves once it (and anything queued before it) has landed. */
  async commit(state: SaveState = this.snapshot()): Promise<void> {
    this.committed = true;
    await putSave(state);
  }
}
