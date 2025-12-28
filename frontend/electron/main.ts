import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as screenshot from 'screenshot-desktop';
import * as sharp from 'sharp';

let mainWindow: BrowserWindow | null = null;
let selectionWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle screenshot selection overlay
ipcMain.handle('open-selection-overlay', async () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;

  if (selectionWindow) {
    selectionWindow.close();
  }

  selectionWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the selection overlay HTML
  selectionWindow.loadFile(path.join(__dirname, '../public/selection-overlay.html'));
  selectionWindow.setFullScreen(true);

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (selectionWindow) {
        selectionWindow.close();
        reject(new Error('Selection timeout'));
      }
    }, 60000); // 60 second timeout

    ipcMain.once('selection-complete', async (event, bounds: { x: number; y: number; width: number; height: number }) => {
      clearTimeout(timeoutId);
      
      try {
        // Capture the entire screen
        const imgBuffer = await screenshot({ format: 'png' });
        
        // Get display scale factor for high DPI displays
        const scaleFactor = primaryDisplay.scaleFactor;
        
        // Adjust bounds for scale factor
        const adjustedBounds = {
          left: Math.round(bounds.x * scaleFactor),
          top: Math.round(bounds.y * scaleFactor),
          width: Math.round(bounds.width * scaleFactor),
          height: Math.round(bounds.height * scaleFactor),
        };

        // Crop the screenshot to the selected region
        const croppedImg = await sharp(imgBuffer)
          .extract(adjustedBounds)
          .png()
          .toBuffer();

        const base64 = croppedImg.toString('base64');
        
        if (selectionWindow) {
          selectionWindow.close();
          selectionWindow = null;
        }
        
        resolve(`data:image/png;base64,${base64}`);
      } catch (error) {
        if (selectionWindow) {
          selectionWindow.close();
          selectionWindow = null;
        }
        reject(error);
      }
    });

    ipcMain.once('selection-cancelled', () => {
      clearTimeout(timeoutId);
      
      if (selectionWindow) {
        selectionWindow.close();
        selectionWindow = null;
      }
      
      reject(new Error('Selection cancelled'));
    });

    // Attach 'closed' handler safely
    if (selectionWindow) {
      selectionWindow.on('closed', () => {
        clearTimeout(timeoutId);
        selectionWindow = null;
      });
    }
  });
});

