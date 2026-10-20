/**
 * Per-user save blob. Writes are queued so they reach the server in the order they were made, and
 * each carries this page's writer id and a rising sequence number, so the server can drop one that
 * still arrives late (the unload save skips the queue).
 */

import type { SaveState } from '../logic/save';
import { request } from './client';

/** Identifies this page load's writes. Not a secret; it only scopes the sequence numbers. */
const WRITER = Math.random().toString(36).slice(2);
let seq = 0;
let queue: Promise<void> = Promise.resolve();

/** Numbers a write at the moment it is made, not when it is sent. */
function orderHeaders(): Record<string, string> {
    seq += 1;
    return { 'X-Save-Writer': WRITER, 'X-Save-Seq': String(seq) };
}

export function loadSave(): Promise<SaveState | null> {
    return request<SaveState | null>('GET', '/save');
}

/** Queues a write and resolves once it (and every earlier one) has settled. Failures are logged, not thrown. */
export function putSave(state: SaveState): Promise<void> {
    queue = writeAfter(queue, state, orderHeaders());
    return queue;
}

/** Resolves once every queued write has settled. */
export function flushSaves(): Promise<void> {
    return queue;
}

/**
 * For `beforeunload`: skips the queue, since the page will not wait for it. Its sequence number is
 * the newest, so a queued write that reaches the server after it is ignored there.
 */
export async function putSaveOnUnload(state: SaveState): Promise<void> {
    try {
        await request<SaveState>('PUT', '/save', state, {
            keepalive: true,
            headers: orderHeaders(),
        });
    } catch (err) {
        console.warn('Save on unload failed', err);
    }
}

async function writeAfter(
    previous: Promise<void>,
    state: SaveState,
    headers: Record<string, string>,
): Promise<void> {
    await previous;
    try {
        await request<SaveState>('PUT', '/save', state, { headers });
    } catch (err) {
        console.warn('Save failed', err);
    }
}
