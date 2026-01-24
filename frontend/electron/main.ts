import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

type OverlayBoundsDto = { X: number; Y: number; Width: number; Height: number };

async function fetchOverlayBoundsFromBackend(): Promise<{x:number;y:number;width:number;height:number}|null> {
  try {
    const res = await fetch('http://localhost:5145/api/settings/overlay-bounds');
    if (!res.ok) return null;
    const j = (await res.json()) as OverlayBoundsDto;
    if (
      typeof j?.X === 'number' &&
      typeof j?.Y === 'number' &&
      typeof j?.Width === 'number' &&
      typeof j?.Height === 'number'
    ) {
      return { x: j.X, y: j.Y, width: j.Width, height: j.Height };
    }
    return null;
  } catch {
    return null;
  }
}

async function saveOverlayBoundsToBackend(b: {x:number;y:number;width:number;height:number}) {
  try {
    await fetch('http://localhost:5145/api/settings/overlay-bounds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ X: b.x, Y: b.y, Width: b.width, Height: b.height })
    });
  } catch (e) {
    console.error('Failed to persist overlay bounds:', e);
  }
}

let saveDebounce: NodeJS.Timeout | null = null;
function scheduleSaveOverlayBounds(b: {x:number;y:number;width:number;height:number}) {
  if (saveDebounce) clearTimeout(saveDebounce);
  saveDebounce = setTimeout(() => {
    saveOverlayBoundsToBackend(b);
  }, 300);
}

function ensureOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const displayBounds = primaryDisplay.bounds;

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  // Start with a smaller, centered size so edges are visible for resizing
  // compute defaults
  const defaultWidth = 800;
  const defaultHeight = 600;
  const defaultX = Math.floor(displayBounds.x + (displayBounds.width - defaultWidth) / 2);
  const defaultY = Math.floor(displayBounds.y + (displayBounds.height - defaultHeight) / 2);

  // we will set initial bounds after create
  overlayWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    x: defaultX,
    y: defaultY,
    title: 'Selection Overlay - Resize and Double-Click to Capture',
    frame: true,              // show standard title bar with controls
    transparent: false,       // disable transparency to show frame/title bar
    alwaysOnTop: true,
    skipTaskbar: false,       // show in taskbar like normal window
    resizable: true,          // allow resize via edges
    movable: true,            // allow dragging via title bar
    minimizable: true,        // show minimize button
    maximizable: true,        // show maximize button
    closable: true,           // show close button
    autoHideMenuBar: true,    // hide the menu bar (File, Edit, etc.)
    show: false,
    backgroundColor: '#f0f0f0',  // light gray background instead of transparent
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      backgroundThrottling: false,
    },
  });

  const overlayPath = path.join(__dirname, '../public/selection-overlay.html');
  overlayWindow.loadFile(overlayPath);

  // After load, set bounds from backend if available
  fetchOverlayBoundsFromBackend().then(bounds => {
    if (bounds) {
      overlayWindow?.setBounds(bounds, true);
    } else {
      overlayWindow?.setBounds({ x: defaultX, y: defaultY, width: defaultWidth, height: defaultHeight }, true);
    }
  });

  // Persist on move/resize
  const persist = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const b = overlayWindow.getBounds();
    scheduleSaveOverlayBounds({ x: b.x, y: b.y, width: b.width, height: b.height });
  };
  overlayWindow.on('move', persist);
  overlayWindow.on('resize', persist);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

app.whenReady().then(() => {
  createMainWindow();
  // Pre-create overlay window to amortize load time
  ensureOverlayWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Helper to show overlay quickly
async function showOverlayFast(win: BrowserWindow) {
  if (win.webContents.isLoadingMainFrame()) {
    await new Promise<void>((resolve) => win.webContents.once('dom-ready', () => resolve()));
  }
  // Avoid focus steal if desired: win.showInactive();
  win.show();
  win.focus();
}

// Helper: small delay
function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Handle screenshot selection overlay
ipcMain.handle('open-selection-overlay', async () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const overlay = ensureOverlayWindow();

  const startTime = Date.now();
  const logWithTimestamp = (message: string) => {
    const elapsed = Date.now() - startTime;
    console.log(`[Main: ${elapsed}ms] ${message}`);
  };

  logWithTimestamp('Request to open overlay received');
  await showOverlayFast(overlay);
  logWithTimestamp('Overlay shown');

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (overlay && !overlay.isDestroyed()) {
        overlay.hide();
        logWithTimestamp('ERROR: Selection timeout (60 seconds)');
        reject(new Error('Selection timeout'));
      }
    }, 60000);

    ipcMain.once('selection-complete', async (event, bounds: { x: number; y: number; width: number; height: number }) => {
      clearTimeout(timeoutId);
      logWithTimestamp(`Selection received - bounds: ${JSON.stringify(bounds)}`);

      // Persist final bounds immediately (not only debounced move/resize)
      try { scheduleSaveOverlayBounds(bounds); } catch {}

      try {
        // Hide overlay before capture so it doesn't appear in the screenshot
        if (overlay && !overlay.isDestroyed() && overlay.isVisible()) {
          logWithTimestamp('Hiding overlay before screen capture...');
          overlay.hide();
          // Wait a short moment for the compositor to update
          await delay(150);
        }

        logWithTimestamp('Starting screen capture...');
        const imgBuffer = await screenshot({ format: 'png' });
        logWithTimestamp(`Screen captured - buffer size: ${imgBuffer.length} bytes`);

        const scaleFactor = primaryDisplay.scaleFactor;
        const adjustedBounds = {
          left: Math.round(bounds.x * scaleFactor),
          top: Math.round(bounds.y * scaleFactor),
          width: Math.round(bounds.width * scaleFactor),
          height: Math.round(bounds.height * scaleFactor),
        };
        logWithTimestamp(`Adjusted bounds: ${JSON.stringify(adjustedBounds)}`);

        logWithTimestamp('Starting image crop with sharp...');
        const croppedImg = await sharp(imgBuffer)
          .extract(adjustedBounds)
          .png()
          .toBuffer();
        logWithTimestamp(`Image cropped - result size: ${croppedImg.length} bytes`);

        const base64 = croppedImg.toString('base64');
        logWithTimestamp('Converted to base64');

        resolve(`data:image/png;base64,${base64}`);
        logWithTimestamp('✅ Operation complete');
      } catch (error) {
        logWithTimestamp(`❌ ERROR during capture/crop: ${error}`);
        reject(error);
      } finally {
        // Ensure overlay remains hidden after operation; it will be shown on next invocation
        if (overlay && !overlay.isDestroyed() && overlay.isVisible()) {
          overlay.hide();
        }
      }
    });

    ipcMain.once('selection-cancelled', () => {
      clearTimeout(timeoutId);
      logWithTimestamp('Selection cancelled by user');
      if (overlay && !overlay.isDestroyed()) {
        overlay.hide();
      }
      reject(new Error('Selection cancelled'));
    });
  });
});

// Handle window-bounds confirm from overlay
ipcMain.on('selection-complete-by-window', async () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const bounds = overlayWindow.getBounds();
  // Re-emit as selection-complete with explicit bounds
  ipcMain.emit('selection-complete', undefined, { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
});

// Handle arrow keys to move/resize overlay window
ipcMain.on('selection-adjust', (event, { key, isShift, step, resizeStep }: { key: string; isShift: boolean; step: number; resizeStep: number }) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const b = overlayWindow.getBounds();
  let { x, y, width, height } = b;

  if (isShift) {
    // Resize using arrow keys
    switch (key) {
      case 'ArrowLeft': width = Math.max(50, width - resizeStep); break;
      case 'ArrowRight': width = width + resizeStep; break;
      case 'ArrowUp': height = Math.max(50, height - resizeStep); break;
      case 'ArrowDown': height = height + resizeStep; break;
    }
  } else {
    // Move using arrow keys
    switch (key) {
      case 'ArrowLeft': x = x - step; break;
      case 'ArrowRight': x = x + step; break;
      case 'ArrowUp': y = y - step; break;
      case 'ArrowDown': y = y + step; break;
    }
  }

  overlayWindow.setBounds({ x, y, width, height }, true);
});
