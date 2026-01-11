import ChessBoardGame from './components/ChessBoardGame';
import Tabs from './components/Tabs';
import TabSnapshotSettings from './components/TabSnapshotSettings';

// Electron IPC type definitions
declare global {
    interface Window {
        electron?: {
            ipcRenderer: {
                invoke(channel: string, ...args: any[]): Promise<any>;
                send(channel: string, ...args: any[]): void;
                on(channel: string, func: (...args: any[]) => void): void;
            };
        };
    }
}

function App() {

    // Handle screenshot using Electron
    const startSelectionMode = async () => {
        const startTime = performance.now();
        const logWithTimestamp = (message: string) => {
            const elapsed = (performance.now() - startTime).toFixed(2);
            console.log(`[${elapsed}ms] ${message}`);
        };

        try {
            logWithTimestamp('Button clicked - Starting selection mode');

            if (!window.electron) {
                logWithTimestamp('ERROR: Electron is not initialized');
                alert('Electron is not initialized. Make sure you\'re running with: npm start');
                return;
            }

            logWithTimestamp('Electron initialized - Opening selection overlay...');
            
            // Invoke the Electron IPC handler
            const imageData = await window.electron.ipcRenderer.invoke('open-selection-overlay');
            logWithTimestamp('Selection overlay closed - Image data received from main process');
            
            if (!imageData) {
                logWithTimestamp('ERROR: Failed to capture image - no data returned');
                alert('Failed to capture image');
                return;
            }

            logWithTimestamp('Image data validated - Creating download link');

            // Download the captured region
            const link = document.createElement('a');
            link.href = imageData;
            link.download = `chess-position-region-${new Date().toISOString().slice(0, 19)}.png`;
            
            logWithTimestamp('Download link created - Triggering download');
            link.click();
            
            logWithTimestamp('Download triggered - Operation complete');
        } catch (error: any) {
            const elapsed = (performance.now() - startTime).toFixed(2);
            
            if (error?.message === 'Selection cancelled') {
                console.log(`[${elapsed}ms] Selection cancelled by user`);
                return;
            }
            
            console.error(`[${elapsed}ms] ERROR in startSelectionMode:`, error);
            alert(`Failed to capture screenshot: ${error?.message || 'Unknown error'}`);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100dvh', padding: '2rem', gap: '2rem', alignItems: 'flex-start', justifyContent: 'center' }}>
            {/* Left side - Chess Board */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ChessBoardGame />
            </div>

            {/* Right side - Tabs Area */}
            <Tabs
                tabs={[
                    {
                        id: 'SnapshotSettings',
                        label: 'Snapshot Settings',
                        content: <TabSnapshotSettings onScreenshot={startSelectionMode} />
                    }
                ]}
                defaultTab="SnapshotSettings"
            />
        </div>
    );
}

export default App
