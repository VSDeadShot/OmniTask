#!/usr/bin/env node
// MCP server for OmniTask.
//
// This is the piece that lets a Claude session on this machine manage tasks. It
// speaks MCP over stdio and talks to the local API over loopback HTTP -- it
// never touches todos.json directly, so every write goes through the same
// validation and the same file lock as the dashboard and the CLI.
//
// Register it with:
//   claude mcp add omnitask -- node <absolute path to this file>

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_PORT = Number(process.env.OMNITASK_PORT) || 3001;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

const STATUSES = ['pending', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];
const RECURRENCES = ['daily', 'weekly', 'monthly'];

class ApiError extends Error {}

// One place to turn an HTTP result into either data or a readable message.
// A connection failure is by far the most likely problem, so it gets an
// instruction rather than a raw ECONNREFUSED.
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new ApiError(`The OmniTask API at ${API_BASE} did not respond within 10s.`);
    }
    throw new ApiError(
      `Can't reach the OmniTask API at ${API_BASE}. Start it by opening OmniTask, ` +
      'or by running `omni serve` in a terminal.'
    );
  }

  const body = await res.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    throw new ApiError(`The API returned a non-JSON response (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  if (!res.ok) {
    if (res.status === 404) throw new ApiError('No task with that id exists.');
    // Validation failures come back with per-field detail; surface it so the
    // model can correct the call instead of guessing.
    if (parsed?.errors?.length) {
      throw new ApiError(`${parsed.error}: ${parsed.errors.map((e) => e.message).join('; ')}`);
    }
    throw new ApiError(parsed?.error || `API request failed with HTTP ${res.status}`);
  }

  return parsed;
}

const formatTask = (t) => {
  const bits = [
    `${t.status === 'completed' ? '[x]' : '[ ]'} ${t.title}`,
    `id: ${t.id}`,
    `project: ${t.project}`,
    `priority: ${t.priority}`
  ];
  if (t.dueDate) bits.push(`due: ${t.dueDate}`);
  if (t.recurrence) bits.push(`repeats: ${t.recurrence}`);
  if (t.tags?.length) bits.push(`tags: ${t.tags.join(', ')}`);
  if (t.description) bits.push(`notes: ${t.description}`);
  if (t.completedAt) bits.push(`completed: ${t.completedAt}`);
  return bits.join(' | ');
};

const text = (s) => ({ content: [{ type: 'text', text: s }] });
const fail = (s) => ({ content: [{ type: 'text', text: s }], isError: true });

// Wraps a handler so an ApiError becomes a tool error the model can read,
// rather than an exception that kills the connection.
const handler = (fn) => async (args) => {
  try {
    return await fn(args);
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message);
    return fail(`Unexpected error: ${err.message}`);
  }
};

const server = new McpServer({ name: 'omnitask', version: '1.0.0' });

server.registerTool(
  'list_tasks',
  {
    title: 'List tasks',
    description:
      'List OmniTask tasks, optionally filtered. With no arguments it returns every task. ' +
      'Use status="pending" for the active list, or due="overdue"/"today" to triage.',
    inputSchema: {
      status: z.enum(STATUSES).optional().describe('Only tasks with this status'),
      project: z.string().optional().describe('Project name; matched loosely, so "omnitask" matches "Omni Task"'),
      priority: z.enum(PRIORITIES).optional(),
      tag: z.string().optional().describe('Only tasks carrying this tag (case-insensitive)'),
      q: z.string().optional().describe('Substring search across title and description'),
      due: z.enum(['today', 'overdue', 'week', 'none']).optional()
        .describe('today = due today, overdue = past due and still pending, week = due within 7 days, none = no due date'),
      dueBefore: z.string().optional().describe('Only tasks due before this date (YYYY-MM-DD)'),
      dueAfter: z.string().optional().describe('Only tasks due after this date (YYYY-MM-DD)'),
      sort: z.enum(['dueDate', 'priority', 'createdAt']).optional(),
      limit: z.number().int().positive().optional()
    }
  },
  handler(async (args) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(args || {})) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    const query = params.toString();
    const tasks = await api(`/api/tasks${query ? `?${query}` : ''}`);

    if (!tasks.length) return text('No tasks matched.');
    return text(`${tasks.length} task(s):\n\n${tasks.map(formatTask).join('\n')}`);
  })
);

server.registerTool(
  'get_task',
  {
    title: 'Get a task',
    description: 'Fetch a single task by id.',
    inputSchema: { id: z.string().describe('The task id') }
  },
  handler(async ({ id }) => text(formatTask(await api(`/api/tasks/${encodeURIComponent(id)}`))))
);

server.registerTool(
  'create_task',
  {
    title: 'Create a task',
    description: 'Add a new task. Only the title is required.',
    inputSchema: {
      title: z.string().min(1).describe('What the task is'),
      project: z.string().optional().describe('Defaults to "General"'),
      description: z.string().optional(),
      priority: z.enum(PRIORITIES).optional().describe('Defaults to "medium"'),
      dueDate: z.string().optional().describe('YYYY-MM-DD'),
      tags: z.array(z.string()).optional(),
      recurrence: z.enum(RECURRENCES).optional()
        .describe('If set, completing the task schedules the next occurrence automatically')
    }
  },
  handler(async (args) => {
    const task = await api('/api/tasks', { method: 'POST', body: JSON.stringify(args) });
    return text(`Created:\n${formatTask(task)}`);
  })
);

server.registerTool(
  'update_task',
  {
    title: 'Update a task',
    description:
      'Change fields on an existing task. Only the fields you pass are modified. ' +
      'To mark something done, prefer complete_task.',
    inputSchema: {
      id: z.string().describe('The task id'),
      title: z.string().min(1).optional(),
      project: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(STATUSES).optional(),
      priority: z.enum(PRIORITIES).optional(),
      dueDate: z.string().nullable().optional().describe('YYYY-MM-DD, or null to clear'),
      tags: z.array(z.string()).optional(),
      recurrence: z.enum(RECURRENCES).nullable().optional()
    }
  },
  handler(async ({ id, ...changes }) => {
    if (!Object.keys(changes).length) return fail('Pass at least one field to change.');
    const task = await api(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(changes)
    });
    return text(`Updated:\n${formatTask(task)}`);
  })
);

server.registerTool(
  'complete_task',
  {
    title: 'Complete a task',
    description:
      'Mark a task done. If it repeats, the next occurrence is created automatically and reported back.',
    inputSchema: { id: z.string().describe('The task id') }
  },
  handler(async ({ id }) => {
    const { task, nextOccurrence } = await api(`/api/tasks/${encodeURIComponent(id)}/complete`, {
      method: 'POST'
    });
    const lines = [`Completed:\n${formatTask(task)}`];
    if (nextOccurrence) lines.push(`\nNext occurrence created:\n${formatTask(nextOccurrence)}`);
    return text(lines.join('\n'));
  })
);

server.registerTool(
  'uncomplete_task',
  {
    title: 'Reopen a task',
    description: 'Move a completed task back to pending.',
    inputSchema: { id: z.string().describe('The task id') }
  },
  handler(async ({ id }) => {
    const task = await api(`/api/tasks/${encodeURIComponent(id)}/uncomplete`, { method: 'POST' });
    return text(`Reopened:\n${formatTask(task)}`);
  })
);

server.registerTool(
  'delete_task',
  {
    title: 'Delete a task',
    description: 'Permanently delete a task. This cannot be undone; to just mark it done use complete_task.',
    inputSchema: { id: z.string().describe('The task id') },
    annotations: { destructiveHint: true }
  },
  handler(async ({ id }) => {
    const { deleted } = await api(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return text(`Deleted: ${deleted.title}`);
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
