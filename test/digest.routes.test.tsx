import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

// Jobs appear out of order in the file; the digest sorts by job.
const line = (at: string, job: string, status: string, extra: object = {}) =>
  JSON.stringify({ at, job, status, owner: null, ...extra });

const GOOD =
  [
    line('2026-01-01T01:00:00Z', 'zulu-report', 'ok'),
    line('2026-01-01T01:05:00Z', 'alpha-sync', 'retry', { error: 'timeout' }),
    line('2026-01-01T01:10:00Z', 'alpha-sync', 'ok'),
    line('2026-01-01T01:15:00Z', 'mike-clean', 'fail', { error: 'disk full' }),
  ].join('\n') + '\n';

const BAD = GOOD + 'this is not json\n';

let runsDir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  mkdirSync(runsDir, { recursive: true });
  writeFileSync(join(runsDir, '2026-01-01.jsonl'), GOOD);
  writeFileSync(join(runsDir, '2026-01-02.jsonl'), '');
  writeFileSync(join(runsDir, '2026-01-03.jsonl'), BAD);
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

const jobsInOrder = ['alpha-sync', 'mike-clean', 'zulu-report'];

function expectInOrder(html: string, jobs: string[]) {
  const positions = jobs.map((j) => html.indexOf(j));
  expect(positions.every((p) => p >= 0)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
}

describe('GET /digest/:night', () => {
  it('renders one row per job, sorted by job', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    expectInOrder(await res.text(), jobsInOrder);
  });

  it('404s for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('nothing ran');
  });

  it('still renders when a line is bad', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expectInOrder(await res.text(), jobsInOrder);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as JSON', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.night).toBe('2026-01-01');
    expect(night.rows.map((r) => r.job)).toEqual(jobsInOrder);
    expect(night.badLines).toBe(0);
  });

  it('404s for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(((await res.json()) as Night).rows).toEqual([]);
  });

  it('counts bad lines without failing', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.badLines).toBeGreaterThanOrEqual(1);
    expect(night.rows.map((r) => r.job)).toEqual(jobsInOrder);
  });
});

describe('page and JSON agree', () => {
  it.each(['2026-01-01', '2026-01-03'])('same jobs, same order for %s', async (n) => {
    const html = await (await app.request(`/digest/${n}`)).text();
    const night = (await (await app.request(`/api/digest/${n}`)).json()) as Night;
    expectInOrder(
      html,
      night.rows.map((r) => r.job),
    );
  });
});
