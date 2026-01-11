import { useState } from 'react';

interface TabSnapshotSettingsProps {
    onScreenshot: () => void;
}

const TabSnapshotSettings = ({ onScreenshot }: TabSnapshotSettingsProps) => {
    const [whoseTurn, setWhoseTurn] = useState<'White' | 'Black'>('White');

    return (
        <>
            {/* Screenshot Button */}
            <button
                onClick={onScreenshot}
                style={{
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s',
                    marginBottom: '1.5rem'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0b7dda')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2196F3')}
            >
                🎯 Select Region to Screenshot
            </button>

            {/* Whose Turn Radio Buttons */}
            <div style={{ marginTop: '1rem' }}>
                <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '0.5rem',
                    fontSize: '0.95rem',
                    color: '#333'
                }}>
                    Whose Turn
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        backgroundColor: whoseTurn === 'White' ? '#e3f2fd' : 'transparent',
                        transition: 'background-color 0.2s'
                    }}>
                        <input
                            type="radio"
                            name="whoseTurn"
                            value="White"
                            checked={whoseTurn === 'White'}
                            onChange={(e) => setWhoseTurn(e.target.value as 'White' | 'Black')}
                            style={{ 
                                marginRight: '0.5rem',
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px'
                            }}
                        />
                        <span style={{ fontSize: '0.95rem' }}>White</span>
                    </label>
                    <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        backgroundColor: whoseTurn === 'Black' ? '#e3f2fd' : 'transparent',
                        transition: 'background-color 0.2s'
                    }}>
                        <input
                            type="radio"
                            name="whoseTurn"
                            value="Black"
                            checked={whoseTurn === 'Black'}
                            onChange={(e) => setWhoseTurn(e.target.value as 'White' | 'Black')}
                            style={{ 
                                marginRight: '0.5rem',
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px'
                            }}
                        />
                        <span style={{ fontSize: '0.95rem' }}>Black</span>
                    </label>
                </div>
            </div>
        </>
    );
};

export default TabSnapshotSettings;

