import { useState, useEffect } from 'react';
import './TabSnapshotSettings.scss';

interface SnapshotSettings {
    rbutWhiteTurn: boolean;
    chkbxCanBlackCastleKingSide: boolean;
    chkbxCanBlackCastleQueenSide: boolean;
    chkbxCanWhiteCastleKingSide: boolean;
    chkbxCanWhiteCastleQueenSide: boolean;
    numbxTolleranceRecogn: number;
}

interface TabSnapshotSettingsProps {
    onScreenshot: () => void;
}

const TabSnapshotSettings = ({ onScreenshot }: TabSnapshotSettingsProps) => {
    const [settings, setSettings] = useState<SnapshotSettings>({
        rbutWhiteTurn: true,
        chkbxCanWhiteCastleKingSide: true,
        chkbxCanWhiteCastleQueenSide: true,
        chkbxCanBlackCastleKingSide: true,
        chkbxCanBlackCastleQueenSide: true,
        numbxTolleranceRecogn: 0.980
    });

    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const [autoRefreshTime, setAutoRefreshTime] = useState('');
    const [lastRecognizingTime] = useState('');

    useEffect(() => {
        // Fetch settings from backend
        fetch('/api/settings/snapshot')
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(err => console.error('Failed to load settings:', err));
    }, []);

    const updateSettings = async (updatedSettings: SnapshotSettings) => {
        try {
            const response = await fetch('/api/settings/snapshot', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedSettings),
            });

            if (!response.ok) {
                console.error('Failed to update settings');
            }
        } catch (err) {
            console.error('Error updating settings:', err);
        }
    };

    const handleWhoseTurnChange = (isWhite: boolean) => {
        const updatedSettings = { ...settings, rbutWhiteTurn: isWhite };
        setSettings(updatedSettings);
        updateSettings(updatedSettings);
    };

    const handleCastleChange = (field: keyof SnapshotSettings, value: boolean) => {
        const updatedSettings = { ...settings, [field]: value };
        setSettings(updatedSettings);
        updateSettings(updatedSettings);
    };

    const handleToleranceChange = (value: number) => {
        const updatedSettings = { ...settings, numbxTolleranceRecogn: value };
        setSettings(updatedSettings);
        updateSettings(updatedSettings);
    };

    const renderCheckbox = (label: string, field: keyof SnapshotSettings, checked: boolean) => (
        <label className="tab-snapshot-settings__checkbox-label">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => handleCastleChange(field, e.target.checked)}
            />
            <span>{label}</span>
        </label>
    );

    const renderSection = (title: string, children: React.ReactNode) => (
        <div className="tab-snapshot-settings__section">
            <label className="tab-snapshot-settings__section-title">
                {title}
            </label>
            {children}
        </div>
    );

    return (
        <div className="tab-snapshot-settings">
            {/* Screenshot Button */}
            <button
                onClick={onScreenshot}
                className="tab-snapshot-settings__screenshot-button"
            >
                🎯 Select Region to Screenshot
            </button>

            {/* Whose Turn */}
            {renderSection('Whose Turn', (
                <div className="tab-snapshot-settings__whose-turn">
                    <label className="tab-snapshot-settings__whose-turn-label">
                        <input
                            type="radio"
                            checked={settings.rbutWhiteTurn}
                            onChange={() => handleWhoseTurnChange(true)}
                        />
                        <span>White</span>
                    </label>
                    <label className="tab-snapshot-settings__whose-turn-label">
                        <input
                            type="radio"
                            checked={!settings.rbutWhiteTurn}
                            onChange={() => handleWhoseTurnChange(false)}
                        />
                        <span>Black</span>
                    </label>
                </div>
            ))}

            {/* Castle */}
            {renderSection('Castle', (
                <div>
                    {renderCheckbox('Can White Castle King Side?', 'chkbxCanWhiteCastleKingSide', settings.chkbxCanWhiteCastleKingSide)}
                    {renderCheckbox('Can White Castle Queen Side?', 'chkbxCanWhiteCastleQueenSide', settings.chkbxCanWhiteCastleQueenSide)}
                    {renderCheckbox('Can Black Castle King Side?', 'chkbxCanBlackCastleKingSide', settings.chkbxCanBlackCastleKingSide)}
                    {renderCheckbox('Can Black Castle Queen Side?', 'chkbxCanBlackCastleQueenSide', settings.chkbxCanBlackCastleQueenSide)}
                </div>
            ))}

            {/* Recognition */}
            {renderSection('Recognition', (
                <div>
                    <div className="tab-snapshot-settings__recognition-enpassa">
                        <label>
                            <input
                                type="checkbox"
                                checked={false}
                                readOnly
                            />
                            <span>EnPassa</span>
                        </label>
                    </div>
                    <div className="tab-snapshot-settings__recognition-tolerance">
                        <input
                            type="number"
                            value={settings.numbxTolleranceRecogn}
                            onChange={(e) => handleToleranceChange(parseFloat(e.target.value) || 0)}
                            step="0.001"
                            min="0"
                            max="1"
                        />
                    </div>
                </div>
            ))}

            {/* Auto Refresh */}
            {renderSection('Auto Refresh', (
                <div>
                    <label className="tab-snapshot-settings__auto-refresh-enable">
                        <input
                            type="checkbox"
                            checked={autoRefreshEnabled}
                            onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                        />
                        <span>Enable</span>
                    </label>
                    <div className="tab-snapshot-settings__auto-refresh-time">
                        <span>Time, s</span>
                        <input
                            type="text"
                            value={autoRefreshTime}
                            onChange={(e) => setAutoRefreshTime(e.target.value)}
                        />
                    </div>
                    <div className="tab-snapshot-settings__auto-refresh-warning">
                        Time cannot be bigger than recognizing<br />
                        time. It will be corrected if it is less.
                    </div>
                    <div className="tab-snapshot-settings__auto-refresh-last-time">
                        Last recognizing time, {lastRecognizingTime && <span className="tab-snapshot-settings__auto-refresh-last-time-value">{lastRecognizingTime}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TabSnapshotSettings;

