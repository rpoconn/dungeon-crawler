/** Per-user save blob. */

import type { SaveState } from '../logic/save';
import { request } from './client';

export function loadSave(): Promise<SaveState | null> {
  return request<SaveState | null>('GET', '/save');
}

export function putSave(state: SaveState): Promise<SaveState> {
  return request<SaveState>('PUT', '/save', state);
}
