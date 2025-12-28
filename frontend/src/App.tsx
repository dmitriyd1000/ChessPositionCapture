import ChessBoardGame from './components/ChessBoardGame';

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
        try {
            if (window.electron) {
                // Electron is available - use native screenshot
                const imageData = await window.electron.ipcRenderer.invoke('open-selection-overlay');

                // Download the captured region
                const link = document.createElement('a');
                link.href = imageData;
                link.download = `chess-position-region-${new Date().toISOString().slice(0, 19)}.png`;
                link.click();
            } else {
                // Fallback for web browser (optional)
                alert('Electron is required for desktop screenshot capture. Please run this app in Electron.');
            }
        } catch (error: any) {
            if (error?.message !== 'Selection cancelled') {
                console.error('Failed to capture region:', error);
                alert('Failed to capture screenshot: ' + error?.message);
            }
        }
    };

    return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
            <ChessBoardGame />

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={startSelectionMode}
                    style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b7dda')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2196F3')}
                >
                    🎯 Select Region to Screenshot
                </button>
            </div>
        </div>
    );
}

export default App
