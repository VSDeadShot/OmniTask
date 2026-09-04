import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  readTasks,
  mutateTasks,
  readSettings,
  writeSettings,
  buildTask,
  validateTask,
  touch,
  completeTask,
  uncompleteTask,
  nextOccurrenceOf,
  normalizeProject,
  PRIORITIES
} from './data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.OMNITASK_PORT) || 3001;

// Loopback only. Previously this was `app.listen(PORT)` with no host, which
// binds 0.0.0.0 and left the API reachable from anything on the LAN.
const HOST = '127.0.0.1';

// Origins allowed to drive the API from a browser context: the Vite dev server,
// and this server itself.
//
// The packaged app used to load dist/index.html over file://, whose Origin is
// the literal string "null". Allowlisting that would have been a real hole --
// sandboxed iframes on a hostile page send Origin: null too, and there is no
// way to tell the two apart. Instead this server serves dist/ (see below) and
// the packaged renderer loads from http://127.0.0.1:PORT, which is same-origin
// and needs no exception at all.
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
]);

app.use(cors({
  origin(origin, callback) {
    // No Origin header at all: curl, the CLI, the MCP server. Not a
    // browser-initiated cross-origin request, so there is nothing to guard.
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed: ${origin}`));
  }
}));

// Rejects requests whose Host header isn't loopback. This is what stops DNS
// rebinding, where a hostile domain resolves to 127.0.0.1 and the browser
// happily connects but still sends the attacker's hostname as Host.
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0].replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return next();
  return res.status(403).json({ error: 'Forbidden: OmniTask only accepts loopback requests' });
});

app.use(express.json());

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

const startOfDay = (value) => new Date(value).setHours(0, 0, 0, 0);

const applyFilters = (tasks, query) => {
  let result = tasks;
  const today = startOfDay(new Date());

  if (query.status) {
    result = result.filter((t) => t.status === query.status);
  }
  if (query.project) {
    const wanted = normalizeProject(query.project);
    result = result.filter((t) => normalizeProject(t.project) === wanted);
  }
  if (query.priority) {
    result = result.filter((t) => t.priority === query.priority);
  }
  if (query.tag) {
    const wanted = String(query.tag).toLowerCase();
    result = result.filter((t) => (t.tags || []).some((tag) => String(tag).toLowerCase() === wanted));
  }
  if (query.q) {
    const needle = String(query.q).toLowerCase();
    result = result.filter((t) =>
      `${t.title || ''} ${t.description || ''}`.toLowerCase().includes(needle)
    );
  }

  if (query.due) {
    switch (query.due) {
      case 'none':
        result = result.filter((t) => !t.dueDate);
        break;
      case 'today':
        result = result.filter((t) => t.dueDate && startOfDay(t.dueDate) === today);
        break;
      case 'overdue':
        result = result.filter(
          (t) => t.dueDate && t.status !== 'completed' && startOfDay(t.dueDate) < today
        );
        break;
      case 'week': {
        const weekOut = new Date();
        weekOut.setDate(weekOut.getDate() + 7);
        const limit = startOfDay(weekOut);
        result = result.filter(
          (t) => t.dueDate && startOfDay(t.dueDate) >= today && startOfDay(t.dueDate) <= limit
        );
        break;
      }
      default:
        break;
    }
  }

  if (query.dueBefore) {
    const cutoff = startOfDay(query.dueBefore);
    result = result.filter((t) => t.dueDate && startOfDay(t.dueDate) < cutoff);
  }
  if (query.dueAfter) {
    const cutoff = startOfDay(query.dueAfter);
    result = result.filter((t) => t.dueDate && startOfDay(t.dueDate) > cutoff);
  }

  if (query.sort) {
    // Sorting is opt-in; with no sort param the array keeps its file order,
    // which is what the dashboard has always rendered.
    result = [...result];
    if (query.sort === 'dueDate') {
      result.sort((a, b) => {
        if (!a.dueDate) return 1; // undated tasks sink to the bottom
        if (!b.dueDate) return -1;
        return startOfDay(a.dueDate) - startOfDay(b.dueDate);
      });
    } else if (query.sort === 'priority') {
      const rank = (t) => PRIORITIES.indexOf(t.priority);
      result.sort((a, b) => rank(b) - rank(a)); // high first
    } else if (query.sort === 'createdAt') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first
    }
  }

  if (query.limit) {
    const n = Number.parseInt(query.limit, 10);
    if (Number.isFinite(n) && n > 0) result = result.slice(0, n);
  }

  return result;
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  const tasks = readTasks();
  res.json({
    ok: true,
    service: 'omnitask',
    taskCount: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length
  });
});

// Returns a bare array. App.jsx and its 5s poll depend on that shape, so the
// filter metadata is deliberately not wrapped in an envelope.
app.get('/api/tasks', (req, res) => {
  res.json(applyFilters(readTasks(), req.query));
});

app.get('/api/tasks/:id', (req, res) => {
  const task = readTasks().find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const { ok, errors } = validateTask(req.body || {});
  if (!ok) return res.status(400).json({ error: 'Invalid task', errors });

  const newTask = buildTask(req.body);
  mutateTasks((tasks) => {
    tasks.push(newTask);
  });
  res.status(201).json(newTask);
});

// PUT and PATCH share a handler: both merge the body into the existing task.
const updateHandler = (req, res) => {
  const { ok, errors } = validateTask(req.body || {}, { partial: true });
  if (!ok) return res.status(400).json({ error: 'Invalid task', errors });

  const result = mutateTasks((tasks) => {
    const index = tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) return null;

    const oldTask = tasks[index];
    const merged = { ...oldTask, ...req.body, id: req.params.id };

    // Completion transitions keep the behavior the dashboard already relies on:
    // stamp completedAt on the way in, spawn the next occurrence if it recurs,
    // clear completedAt on the way back out.
    if (merged.status === 'completed' && oldTask.status !== 'completed') {
      merged.completedAt = new Date().toISOString();
      if (merged.recurrence) tasks.push(nextOccurrenceOf(merged));
    } else if (merged.status !== 'completed') {
      merged.completedAt = null;
    }

    touch(merged);
    tasks[index] = merged;
    return merged;
  });

  if (!result) return res.status(404).json({ error: 'Task not found' });
  res.json(result);
};

app.put('/api/tasks/:id', updateHandler);
app.patch('/api/tasks/:id', updateHandler);

app.post('/api/tasks/:id/complete', (req, res) => {
  const result = mutateTasks((tasks) => completeTask(tasks, req.params.id));
  if (!result) return res.status(404).json({ error: 'Task not found' });
  res.json(result);
});

app.post('/api/tasks/:id/uncomplete', (req, res) => {
  const task = mutateTasks((tasks) => uncompleteTask(tasks, req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const deleted = mutateTasks((tasks) => {
    const index = tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) return null;
    return tasks.splice(index, 1)[0];
  });

  // Previously this reported success for ids that never existed, which would
  // let an agent believe it had deleted something it hadn't.
  if (!deleted) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, deleted });
});

app.get('/api/settings', (req, res) => {
  res.json(readSettings());
});

app.post('/api/settings', (req, res) => {
  const updated = { ...readSettings(), ...req.body };
  writeSettings(updated);
  res.json(updated);
});

// Serve the built dashboard, so the packaged app can load the UI from this
// origin instead of file://. Registered after the API routes so it can never
// shadow them. In dev this directory doesn't exist and Vite serves the UI.
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// CORS rejections arrive here as errors; answer with a clear 403 instead of a
// stack trace.
app.use((err, req, res, _next) => {
  if (err && /Origin not allowed/.test(err.message)) {
    return res.status(403).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`OmniTask API running on http://${HOST}:${PORT} (loopback only)`);
});

// Electron forks this file, so a clear message beats an unhandled crash when
// the port is already taken by another OmniTask instance or an unrelated app.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — not starting a second API.`);
    process.exit(1);
  }
  throw err;
});
