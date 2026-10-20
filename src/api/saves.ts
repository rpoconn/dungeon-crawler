/** Per-user save blob. Writes are queued so they reach the server in the order they were made. */

import type { SaveState } from '../logic/save';
import { request } from './client';

let queue: Promise<void> = Promise.resolve();

export function loadSave(): Promise<SaveState | null> {
    return request<SaveState | null>('GET', '/save');
}

/** Queues a write and resolves once it (and every earlier one) has settled. Failures are logged, not thrown. */
export function putSave(state: SaveState): Promise<void> {
    queue = writeAfter(queue, state);
    return queue;
}

/** Resolves once every queued write has settled. */
export function flushSaves(): Promise<void> {
    return queue;
}

/** For `beforeunload`: skips the queue, since the page will not wait for it. */
export async function putSaveOnUnload(state: SaveState): Promise<void> {
    try {
        await request<SaveState>('PUT', '/save', state, { keepalive: true });
    } catch (err) {
        console.warn('Save on unload failed', err);
    }
}

async function writeAfter(previous: Promise<void>, state: SaveState): Promise<void> {
    await previous;
    try {
        await request<SaveState>('PUT', '/save', state);
    } catch (err) {
        console.warn('Save failed', err);
    }
}
