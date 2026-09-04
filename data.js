// Shared data layer for OmniTask.
//
// server.js, cli.js and the MCP server all read and write the same
// ~/.omnitask/todos.json. Before this module each of them carried its own copy
// of the task defaults and the recurrence logic, which is how the two copies
// drifted. Everything that touches the data file should go through here.

import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// OMNITASK_DATA_DIR lets tests (and a second instance) point at a scratch
// directory instead of the real ~/.omnitask.
const dataDir = process.env.OMNITASK_DATA_DIR
  ? path.resolve(process.env.OMNITASK_DATA_DIR)
  : path.join(os.homedir(), '.omnitask');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const DATA_DIR = dataDir;
export const TASKS_FILE = path.join(dataDir, 'todos.json');
export const SETTINGS_FILE = path.join(dataDir, 'settings.json');

if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ openAtLogin: false }));
}

export const STATUSES = ['pending', 'completed'];
export const PRIORITIES = ['low', 'medium', 'high'];
export const RECURRENCES = ['daily', 'weekly', 'monthly'];

export const newId = () => randomUUID();

// ---------------------------------------------------------------------------
// Reading and writing
// ---------------------------------------------------------------------------

export const readTasks = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A missing or unparseable file reads as empty rather than throwing, so a
    // single bad write can't take down the API or the CLI.
    return [];
  }
};

// Writes via a temp file plus rename. The rename is atomic, so App.jsx's 5s
// poll and main.js's notification loop can never observe a half-written file.
// The temp name carries the pid so two processes writing at once don't clobber
// each other's scratch file.
const writeJsonAtomic = (file, value) => {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));

  // Windows can briefly refuse the rename while another process (or an
  // antivirus scanner) holds the destination open.
  let lastErr;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      lastErr = err;
      if (err.code !== 'EPERM' && err.code !== 'EBUSY' && err.code !== 'EACCES') break;
      sleepSync(20);
    }
  }
  try { fs.unlinkSync(tmp); } catch { /* best effort */ }
  throw lastErr;
};

export const writeTasks = (tasks) => writeJsonAtomic(TASKS_FILE, tasks);

// Blocking sleep. These are all synchronous fs paths, so there is no event loop
// to yield to; Atomics.wait is the way to pause without spinning the CPU.
const sleepSync = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const LOCK_FILE = `${TASKS_FILE}.lock`;
const LOCK_TIMEOUT_MS = 5000;
const LOCK_STALE_MS = 10000;
const LOCK_CONTENDED = new Set(['EEXIST', 'EPERM', 'EACCES', 'EBUSY']);

// Cross-process mutex built on exclusive file creation. 'wx' fails if the file
// already exists, and that check-and-create is atomic at the OS level, so
// exactly one of several competing processes wins.
//
// An mtime-based optimistic check was tried first and measured badly: NTFS
// mtime granularity is coarser than the time a write takes, so a competing
// write frequently landed inside the read-modify-write window without changing
// the fingerprint, and the loser's whole change was dropped. Under 8 concurrent
// writers that lost roughly two thirds of all writes. A real lock is only a few
// lines more and actually holds.
const acquireLock = () => {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  for (;;) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, String(process.pid));
      return fd;
    } catch (err) {
      // EEXIST is the ordinary "someone else holds it" case. Windows also
      // reports EPERM/EACCES while a just-unlinked lock is still in its
      // delete-pending state, which is the same situation: wait and retry.
      if (!LOCK_CONTENDED.has(err.code)) throw err;

      if (Date.now() > deadline) {
        throw new Error('Timed out waiting for the OmniTask data lock', { cause: err });
      }

      // A process that crashed mid-write would otherwise wedge every other
      // writer forever, so a lock older than LOCK_STALE_MS is assumed dead.
      try {
        const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
        if (age > LOCK_STALE_MS) {
          fs.unlinkSync(LOCK_FILE);
          continue;
        }
      } catch {
        // Lock vanished or is unreadable between the open and the stat; fall
        // through to the sleep and try again.
      }

      sleepSync(5);
    }
  }
};

const releaseLock = (fd) => {
  try { fs.closeSync(fd); } catch { /* already closed */ }
  try { fs.unlinkSync(LOCK_FILE); } catch { /* already gone */ }
};

// Read-modify-write under the lock. Every writer -- the API, the CLI, the MCP
// server -- loads the whole array, changes it in memory and writes it back;
// holding the lock across that window is what stops one writer's change from
// silently overwriting another's.
export const mutateTasks = (fn) => {
  const fd = acquireLock();
  try {
    const tasks = readTasks();
    const result = fn(tasks);
    writeTasks(tasks);
    return result;
  } finally {
    releaseLock(fd);
  }
};

export const readSettings = () => {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return { openAtLogin: false };
  }
};

export const writeSettings = (settings) => writeJsonAtomic(SETTINGS_FILE, settings);

// ---------------------------------------------------------------------------
// Task shape
// ---------------------------------------------------------------------------

// Project names are matched loosely so "Omni Task", "omniTask" and "omnitask"
// are one project. Kept identical to the rule in App.jsx and Analytics.jsx.
export const normalizeProject = (name) => (name || '').toLowerCase().replace(/\s+/g, '');

const asTags = (tags) => {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
};

export const buildTask = (input = {}) => {
  const now = new Date().toISOString();
  return {
    id: newId(),
    project: (input.project || 'General').trim(),
    title: String(input.title).trim(),
    description: input.description ? String(input.description) : '',
    status: input.status || 'pending',
    priority: input.priority || 'medium',
    dueDate: input.dueDate || null,
    tags: asTags(input.tags),
    recurrence: input.recurrence || null,
    createdAt: now,
    updatedAt: now,
    completedAt: input.status === 'completed' ? now : null
  };
};

// Tasks written before updatedAt existed simply don't have it; callers treat
// createdAt as the fallback rather than rewriting the whole file on read.
export const touch = (task) => {
  task.updatedAt = new Date().toISOString();
  return task;
};

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

// partial: true is for updates, where an absent field means "leave it alone"
// rather than "reset to default".
export const validateTask = (input, { partial = false } = {}) => {
  const errors = [];

  if (!partial || input.title !== undefined) {
    if (typeof input.title !== 'string' || !input.title.trim()) {
      errors.push({ field: 'title', message: 'title is required and must be a non-empty string' });
    }
  }
  if (input.status !== undefined && !STATUSES.includes(input.status)) {
    errors.push({ field: 'status', message: `status must be one of: ${STATUSES.join(', ')}` });
  }
  if (input.priority !== undefined && !PRIORITIES.includes(input.priority)) {
    errors.push({ field: 'priority', message: `priority must be one of: ${PRIORITIES.join(', ')}` });
  }
  if (input.recurrence !== undefined && input.recurrence !== null && !RECURRENCES.includes(input.recurrence)) {
    errors.push({ field: 'recurrence', message: `recurrence must be null or one of: ${RECURRENCES.join(', ')}` });
  }
  if (input.dueDate !== undefined && input.dueDate !== null && !isValidDate(input.dueDate)) {
    errors.push({ field: 'dueDate', message: 'dueDate must be a parseable date (e.g. 2026-09-04)' });
  }
  if (input.project !== undefined && typeof input.project !== 'string') {
    errors.push({ field: 'project', message: 'project must be a string' });
  }

  return { ok: errors.length === 0, errors };
};

// ---------------------------------------------------------------------------
// Recurrence and completion
// ---------------------------------------------------------------------------

// Next due date for a recurring task, from its current due date (or today, if
// it has none) plus the interval.
export const computeNextDueDate = (recurrence, baseDateStr) => {
  const d = baseDateStr ? new Date(baseDateStr) : new Date();
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    default: return null;
  }
  return d.toISOString().split('T')[0];
};

export const nextOccurrenceOf = (task) => {
  const now = new Date().toISOString();
  return {
    id: newId(),
    project: task.project,
    title: task.title,
    description: task.description,
    status: 'pending',
    priority: task.priority,
    dueDate: computeNextDueDate(task.recurrence, task.dueDate),
    tags: task.tags,
    recurrence: task.recurrence,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
};

// The single implementation of "mark complete, stamp completedAt, and spawn the
// next occurrence if it recurs". Mutates `tasks` in place.
export const completeTask = (tasks, id) => {
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;

  const wasCompleted = task.status === 'completed';
  task.status = 'completed';
  task.completedAt = wasCompleted ? task.completedAt : new Date().toISOString();
  touch(task);

  let nextOccurrence = null;
  if (!wasCompleted && task.recurrence) {
    nextOccurrence = nextOccurrenceOf(task);
    tasks.push(nextOccurrence);
  }

  return { task, nextOccurrence };
};

export const uncompleteTask = (tasks, id) => {
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  task.status = 'pending';
  task.completedAt = null;
  touch(task);
  return task;
};
