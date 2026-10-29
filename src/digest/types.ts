// The digest's contract (plan.md § 1). Section 2 builds against this file alone.

// One line of runs/<night>.jsonl.
export type RunStatus = 'ok' | 'retry' | 'fail';

export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. owner stays null here; views show it as '—'.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[]; // sorted by job
  counts: Record<RunStatus, number>; // lines per status, for the board
  badLines: number; // lines that didn't parse: counted, never thrown
};

// null = no file for that night (404). An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
