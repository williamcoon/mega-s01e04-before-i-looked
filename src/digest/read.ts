import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, RunLine, RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

function isStatus(v: unknown): v is RunStatus {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

// Parse one line at the edge. null = bad line (counted by the caller, never thrown).
// owner: missing or null -> null. error: only a non-empty string counts.
export function parseLine(text: string): RunLine | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (!isStatus(o.status)) return null;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (o.owner !== undefined && o.owner !== null && typeof o.owner !== 'string') return null;
  const line: RunLine = {
    at: o.at,
    job: o.job,
    status: o.status,
    owner: typeof o.owner === 'string' ? o.owner : null,
  };
  if (typeof o.error === 'string' && o.error !== '') line.error = o.error;
  return line;
}

// Lines are taken in file order (the log is written in time order; `at` keeps its own
// offset, so it is never re-sorted or converted).
// Per job: owner and lastStatus come from the job's last line; lastError is the most
// recent error the job reported (kept even if a later run succeeded); null if none.
export const readNight: ReadNight = (runsDir, night) => {
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');

  const counts: Record<RunStatus, number> = { ok: 0, retry: 0, fail: 0 };
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed === '') continue;
    const line = parseLine(trimmed);
    if (!line) {
      badLines++;
      continue;
    }
    counts[line.status]++;
    const row = byJob.get(line.job);
    if (!row) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    row.runs++;
    if (line.status === 'retry') row.retries++;
    row.owner = line.owner;
    row.lastStatus = line.status;
    if (line.error !== undefined) row.lastError = line.error;
    row.lastAt = line.at;
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, counts, badLines };
};
