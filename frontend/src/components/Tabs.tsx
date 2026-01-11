import { useState } from 'react';
import type { ReactNode } from 'react';

interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
}

const Tabs = ({ tabs, defaultTab }: TabsProps) => {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

    return (
        <div style={{ minWidth: '300px', maxWidth: '400px', flex: '0 0 auto' }}>
            {/* Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '1rem' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            backgroundColor: activeTab === tab.id ? '#2196F3' : '#f5f5f5',
                            color: activeTab === tab.id ? 'white' : '#333',
                            border: 'none',
                            borderRadius: '4px 4px 0 0',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #ddd' }}>
                {activeTabContent}
            </div>
        </div>
    );
};

export default Tabs;

