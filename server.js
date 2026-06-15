import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const homeDir = os.homedir();
const dataDir = path.join(homeDir, '.omnitask');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const DATA_FILE = path.join(dataDir, 'todos.json');

app.use(cors());
app.use(express.json());

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

const readData = () => {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Get all tasks
app.get('/api/tasks', (req, res) => {
  const tasks = readData();
  res.json(tasks);
});

// Add a new task
app.post('/api/tasks', (req, res) => {
  const tasks = readData();
  const newTask = {
    id: Date.now().toString(),
    project: req.body.project || 'General',
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status || 'pending',
    priority: req.body.priority || 'medium',
    dueDate: req.body.dueDate || null,
    tags: req.body.tags || [],
    createdAt: new Date().toISOString()
  };
  tasks.push(newTask);
  writeData(tasks);
  res.status(201).json(newTask);
});

// Update a task
app.put('/api/tasks/:id', (req, res) => {
  const tasks = readData();
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...req.body, id: req.params.id };
    writeData(tasks);
    res.json(tasks[index]);
  } else {
    res.status(404).json({ error: 'Task not found' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readData();
  const filteredTasks = tasks.filter(t => t.id !== req.params.id);
  writeData(filteredTasks);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
