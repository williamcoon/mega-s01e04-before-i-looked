import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('reads 5 jobs sorted by job, and counts the 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.night).toBe('2026-10-28');
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night!.badLines).toBe(1);
    expect(night!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('builds one row per job', () => {
    const row = (job: string) => night!.rows.find((r) => r.job === job);
    expect(row('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(row('lane/sync')).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok', lastError: 'lock held' });
    expect(row('notes/backup')).toMatchObject({ owner: 'lane-07', lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(row('rig/rotate-logs')).toMatchObject({ runs: 1, retries: 0, lastError: null });
  });

  it('keeps a null owner as null', () => {
    const row = night!.rows.find((r) => r.job === 'digest/render');
    expect(row).toBeDefined();
    expect(row!.owner).toBeNull();
  });
});

describe('readNight edge cases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null for a night with no file', () => {
    expect(readNight(dir, '1999-01-01')).toBeNull();
  });

  it('reads an empty file as a night with no rows', () => {
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({
      night: '2026-01-01',
      rows: [],
      counts: { ok: 0, retry: 0, fail: 0 },
      badLines: 0,
    });
  });

  it('skips blank lines and counts invalid ones without throwing', () => {
    const lines = [
      '{"at":"2026-01-02T01:00:00+01:00","job":"a","status":"ok","owner":"x"}',
      '',
      '   ',
      '{"at":"2026-01-02T01:00:00+01:00","job":"a","status":"maybe","owner":"x"}',
      '{"at":"not a time","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-01-02T01:00:00+01:00","status":"ok","owner":"x"}',
      '[1,2]',
      '{oops',
    ];
    writeFileSync(join(dir, '2026-01-02.jsonl'), lines.join('\n') + '\n');
    const n = readNight(dir, '2026-01-02');
    expect(n!.rows).toHaveLength(1);
    expect(n!.badLines).toBe(5);
    expect(n!.counts).toEqual({ ok: 1, retry: 0, fail: 0 });
  });
});
