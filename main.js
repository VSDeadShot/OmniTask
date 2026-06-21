import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray = null;
let apiProcess = null;

const dataDir = path.join(os.homedir(), '.omnitask');
const settingsFile = path.join(dataDir, 'settings.json');
const todosFile = path.join(dataDir, 'todos.json');

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
      const tasks = JSON.parse(fs.readFileSync(todosFile, 'utf8'));
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

function startApiServer() {
  // Spawn the Express API server
  const serverPath = path.join(__dirname, 'server.js');
  apiProcess = fork(serverPath);
  
  apiProcess.on('error', (err) => {
    console.error('API Process Error:', err);
  });
}

function createWindow() {
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
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
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
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
  startApiServer();
  createWindow();
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
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  // Unregister shortcuts
  globalShortcut.unregisterAll();
  // Kill API server
  if (apiProcess) apiProcess.kill();
});

app.on('window-all-closed', () => {
  // Keep app running in tray on windows
});
}
