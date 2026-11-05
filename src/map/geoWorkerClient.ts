import type { DecodeKind, DecodeResponse, DecodeResult } from './geoDecodeTypes';

interface PendingJob {
  workerIdx: number;
  resolve: (r: DecodeResult) => void;
  reject: (err: Error) => void;
}

const POOL_SIZE = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));

let workers: Worker[] | null = null;
let inFlight: number[] = [];
let nextId = 1;
const pending = new Map<number, PendingJob>();

function rejectAllFor(workerIdx: number, err: Error) {
  for (const [id, job] of pending) {
    if (job.workerIdx === workerIdx) {
      pending.delete(id);
      inFlight[workerIdx]--;
      job.reject(err);
    }
  }
}

function getPool(): Worker[] {
  if (workers) return workers;
  inFlight = new Array(POOL_SIZE).fill(0);
  workers = Array.from({ length: POOL_SIZE }, (_, idx) => {
    const w = new Worker(new URL('./geoDecode.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<DecodeResponse>) => {
      const msg = e.data;
      const job = pending.get(msg.id);
      if (!job) return;
      pending.delete(msg.id);
      inFlight[idx]--;
      if (msg.ok) {
        job.resolve({ features: msg.features, dissolvedD: msg.dissolvedD });
      } else {
        job.reject(new Error(msg.error));
      }
    };
    w.onerror = (e) => {
      rejectAllFor(idx, new Error(e.message || 'Geo decode worker error'));
    };
    return w;
  });
  return workers;
}

/**
 * Fetch + decode + project a FlatGeobuf file in a background worker.
 * Jobs are dispatched to the least-busy worker of a small pool.
 */
export function decodeGeo(url: string, kind: DecodeKind, iso2?: string): Promise<DecodeResult> {
  const pool = getPool();
  let workerIdx = 0;
  for (let i = 1; i < pool.length; i++) {
    if (inFlight[i] < inFlight[workerIdx]) workerIdx = i;
  }
  const id = nextId++;
  const absUrl = new URL(url, self.location.href).href;
  return new Promise<DecodeResult>((resolve, reject) => {
    pending.set(id, { workerIdx, resolve, reject });
    inFlight[workerIdx]++;
    pool[workerIdx].postMessage({ id, url: absUrl, kind, iso2 });
  });
}
