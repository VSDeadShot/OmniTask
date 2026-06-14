#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'todos.json');

const args = process.argv.slice(2);
const command = args[0];

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

if (command === 'add') {
    const title = args[1];
    
    let project = 'General';
    const pIndex = args.indexOf('-p');
    if (pIndex !== -1 && args[pIndex + 1]) {
        project = args[pIndex + 1];
    }

    let priority = 'medium';
    const prioIndex = args.indexOf('--priority');
    if (prioIndex !== -1 && args[prioIndex + 1]) {
        priority = args[prioIndex + 1];
    }

    if (!title) {
        console.error("❌ Please provide a task title.\nUsage: omni add \"Fix bug\" -p \"Project Name\"");
        process.exit(1);
    }

    const tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const newTask = {
        id: Date.now().toString(),
        project: project,
        title: title,
        description: '',
        status: 'pending',
        priority: priority,
        dueDate: null,
        tags: [],
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
    
    console.log(`✅ Task Added!`);
    console.log(`   Title:   ${title}`);
    console.log(`   Project: ${project}`);
    console.log(`   Priority: ${priority}`);
} else if (command === 'list') {
    const tasks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    
    if (pendingTasks.length === 0) {
        console.log("✨ All caught up! No pending tasks.");
        process.exit(0);
    }

    console.log("\n🚀 OmniTask - Pending Tasks\n");
    pendingTasks.forEach(t => {
        const priorityIcon = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🔵' : '🟡';
        console.log(`${priorityIcon} [${t.project}] ${t.title}`);
    });
    console.log("");
} else {
    console.log(`
OmniTask CLI
------------
Usage:
  omni add "Task Name"                Adds a task to the General project
  omni add "Task Name" -p "WebApp"    Adds a task to a specific project
  omni add "Task Name" --priority high Sets task priority (low, medium, high)
  omni list                           Lists all pending tasks
    `);
}
