# Chess Position Capture - Electron Setup

This application now uses Electron to enable full desktop screenshot capabilities, including areas outside the browser window and across multiple monitors.

## Installation

Install the additional dependencies required for Electron:

```bash
npm install concurrently cross-env wait-on --save-dev
```

## Running the Application

### Development Mode

To run the app in Electron with hot-reload:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Wait for it to be ready
3. Launch Electron with the React app

### Building for Production

To create a distributable package:

```bash
npm run electron:build
```

This will create an installer in the `release` folder.

## How It Works

### Architecture

1. **Main Process** (`electron/main.ts`): 
   - Creates the main application window
   - Handles IPC communication
   - Creates the selection overlay window
   - Captures and crops screenshots

2. **Preload Script** (`electron/preload.ts`):
   - Safely exposes IPC methods to the renderer
   - Provides security through channel whitelisting

3. **React App** (`src/App.tsx`):
   - Simplified UI with single button
   - Calls Electron IPC to trigger screenshot

4. **Selection Overlay** (`public/selection-overlay.html`):
   - Transparent fullscreen window
   - Drag-to-select interface
   - Red dashed box shows selection

### Screenshot Flow

1. User clicks "🎯 Select Region to Screenshot"
2. Electron creates a transparent fullscreen overlay
3. User drags to select area (or presses ESC to cancel)
4. Electron captures entire screen using `screenshot-desktop`
5. Uses `sharp` to crop to selected region
6. Returns base64 image to React app
7. App triggers download of PNG file

## Key Features

✅ **Full Desktop Capture** - Not limited to browser window  
✅ **Multi-Monitor Support** - Works across displays  
✅ **High DPI Support** - Handles display scaling  
✅ **Visual Feedback** - Red dashed selection box  
✅ **ESC to Cancel** - Easy to abort selection  
✅ **Automatic Download** - Timestamped PNG files

## Troubleshooting

### Electron doesn't start
- Make sure all dependencies are installed: `npm install`
- Try cleaning: `rm -rf dist dist-electron node_modules && npm install`

### Screenshot is blank or wrong size
- Check display scaling settings in Windows
- The app accounts for DPI scaling automatically

### Selection overlay doesn't appear
- Check console for errors
- Verify `selection-overlay.html` exists in `public` folder

## Development Notes

- The app works in both browser mode (`npm run dev`) and Electron mode (`npm run electron:dev`)
- In browser mode, screenshot will show an alert (Electron required)
- Main process logs appear in terminal, renderer logs in DevTools

