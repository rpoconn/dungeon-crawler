import { afterEach, describe, expect, it, vi } from 'vitest';
import { newSave } from '../logic/save';
import { flushSaves, putSave, putSaveOnUnload } from './saves';

/** A fetch stub whose responses resolve only when the test says so. */
function controlledFetch(): { calls: number[]; release: () => void } {
    const calls: number[] = [];
    const pending: Array<() => void> = [];
    vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, init: RequestInit) => {
            const body = JSON.parse(String(init.body)) as { level: number };
            calls.push(body.level);
            return new Promise<Response>((resolve) => {
                pending.push(() => resolve(new Response(String(init.body), { status: 200 })));
            });
        }),
    );
    return { calls, release: () => pending.shift()?.() };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('putSave', () => {
    it('sends writes one at a time, in order', async () => {
        const { calls, release } = controlledFetch();
        const first = putSave({ ...newSave(1), level: 1 });
        const second = putSave({ ...newSave(1), level: 2 });
        await vi.waitFor(() => expect(calls).toEqual([1]));

        release();
        await first;
        await vi.waitFor(() => expect(calls).toEqual([1, 2]));
        release();
        await second;
    });

    it('logs a failed write and keeps the queue moving', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('offline')));
        await putSave(newSave(1));
        expect(warn).toHaveBeenCalledOnce();

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
        await putSave(newSave(2));
        await flushSaves();
        expect(fetch).toHaveBeenCalledOnce();
        warn.mockRestore();
    });
});

describe('write ordering headers', () => {
    function headersOf(call: unknown[]): Record<string, string> {
        const init = call[1] as RequestInit;
        return init.headers as Record<string, string>;
    }

    it('numbers writes in the order they were made, unload save last, from one writer', async () => {
        const { release } = controlledFetch();
        const queued = putSave(newSave(1));
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        // The tab closes while the autosave is still in flight.
        const unload = putSaveOnUnload(newSave(2));
        release();
        release();
        await Promise.all([queued, unload]);

        const [autosave, onUnload] = vi.mocked(fetch).mock.calls.map(headersOf);
        expect(autosave?.['X-Save-Writer']).toBeTruthy();
        expect(onUnload?.['X-Save-Writer']).toBe(autosave?.['X-Save-Writer']);
        expect(Number(onUnload?.['X-Save-Seq'])).toBeGreaterThan(Number(autosave?.['X-Save-Seq']));
    });
});
