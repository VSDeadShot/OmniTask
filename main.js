import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import fs from 'fs';
import os from 'os';

import { readTasks } from './data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let apiProcess = null;

// Whether this process started the API. If the API was already running -- from
// `omni serve` or a second instance -- we attach to it and must not kill it on
// quit.
let ownsApiProcess = false;

// Whether the API answered on startup. createWindow() needs it, including from
// the 'activate' handler, which runs long after startup.
let apiReady = false;

const API_PORT = Number(process.env.OMNITASK_PORT) || 3001;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

const dataDir = path.join(os.homedir(), '.omnitask');
const settingsFile = path.join(dataDir, 'settings.json');
const todosFile = path.join(dataDir, 'todos.json');

const isApiUp = async (timeoutMs = 1000) => {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
};

const waitForApi = async (timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isApiUp(1000)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

let notifiedTasks = new Set();

function checkSettings() {
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      app.setLoginItemSettings({
        openAtLogin: settings.openAtLogin || false,
        path: app.getPath('exe')
      });
    } catch (e) {
      console.error('Settings parse error:', e);
    }
  }
}

function startNotificationService() {
  setInterval(() => {
    if (!fs.existsSync(todosFile)) return;
    try {
      // Reads through the shared data layer rather than parsing the file here,
      // so this is the same tolerant read the API and CLI use.
      const tasks = readTasks();
      const today = new Date().setHours(0,0,0,0);

      tasks.forEach(task => {
        if (task.status === 'completed' || !task.dueDate) return;
        const taskDate = new Date(task.dueDate).setHours(0,0,0,0);
        
        if (taskDate === today && !notifiedTasks.has(task.id)) {
          new Notification({
            title: 'OmniTask Reminder',
            body: `Task Due Today: ${task.title}`
          }).show();
          notifiedTasks.add(task.id);
        } else if (taskDate < today && !notifiedTasks.has(task.id + '_overdue')) {
          new Notification({
            title: 'OmniTask - Overdue!',
            body: `Overdue Task: ${task.title}`
          }).show();
          notifiedTasks.add(task.id + '_overdue');
        }
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
  }, 60000); // Check every minute
}

async function startApiServer() {
  // The API can already be running -- `omni serve`, or another instance that
  // kept the port. Forking a second one would just crash on EADDRINUSE, so
  // attach to what's there instead.
  if (await isApiUp()) {
    console.log('Attaching to the API already running on', API_BASE);
    ownsApiProcess = false;
    return true;
  }

  const serverPath = path.join(__dirname, 'server.js');
  apiProcess = fork(serverPath);
  ownsApiProcess = true;

  apiProcess.on('error', (err) => {
    console.error('API Process Error:', err);
  });

  apiProcess.on('exit', (code) => {
    // If it died on its own, don't try to kill it later.
    if (code !== 0) console.error(`API process exited with code ${code}`);
    apiProcess = null;
  });

  return waitForApi();
}

// Shown only if the API never came up. The dashboard reads every task from it,
// so there is nothing useful to render without it.
function apiUnavailablePage() {
  const html = `
    <body style="margin:0;font:14px system-ui;background:#12121a;color:#e6e6f0;
                 display:flex;align-items:center;justify-content:center;height:100vh">
      <div style="max-width:32rem;padding:2rem;text-align:center">
        <h1 style="font-size:1.25rem;margin:0 0 .75rem">OmniTask couldn't start its local API</h1>
        <p style="opacity:.75;line-height:1.6;margin:0 0 1rem">
          Nothing is answering on ${API_BASE}. Another program may be using port
          ${API_PORT}.
        </p>
        <p style="opacity:.75;line-height:1.6;margin:0">
          Try running <code style="background:#25253a;padding:.15rem .4rem;border-radius:4px">omni serve</code>
          in a terminal to see the error, then reopen OmniTask.
        </p>
      </div>
    </body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createWindow(apiIsReady) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'build/icon.png')
  });

  if (!app.isPackaged) {
    // Vite dev server. Cross-origin to the API, which allowlists it explicitly.
    mainWindow.loadURL('http://localhost:5173');
  } else if (apiIsReady) {
    // The API serves dist/, so the renderer is same-origin with it. This is
    // what removed the need to allow the file:// "null" origin.
    mainWindow.loadURL(API_BASE);
  } else {
    mainWindow.loadURL(apiUnavailablePage());
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    // Prevent app from quitting when closing the window
    // Instead, hide it to the tray
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'build/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('OmniTask');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => {
      app.isQuiting = true;
      app.quit();
    }}
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
  apiReady = await startApiServer();
  createWindow(apiReady);
  createTray();

  checkSettings();
  startNotificationService();

  if (fs.existsSync(dataDir)) {
    fs.watchFile(settingsFile, () => checkSettings());
  }

  // Global shortcut to summon the app
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(apiReady);
    }
  });
});

app.on('will-quit', () => {
  // Unregister shortcuts
  globalShortcut.unregisterAll();
  // Only kill the API if this process started it. An API from `omni serve`
  // outlives the window on purpose.
  if (apiProcess && ownsApiProcess) apiProcess.kill();
});

app.on('window-all-closed', () => {
  // Keep app running in tray on windows
});
}
