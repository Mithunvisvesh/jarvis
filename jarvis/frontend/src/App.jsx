import React, { useState } from 'react';
import { JarvisProvider } from './context/JarvisContext';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import TelemetryPanel from './components/TelemetryPanel';
import TemporalBuffer from './components/TemporalBuffer';
import MemoryViewer from './components/MemoryViewer';
import ActivityTimeline from './components/ActivityTimeline';
import TraceViewer from './components/TraceViewer';
import StatusBar from './components/StatusBar';

function Dashboard() {
  const [activeRightTab, setActiveRightTab] = useState('system'); // 'system' | 'memory' | 'logs'

  return (
    <div className="app-container">
      {/* Scanline/Grid Overlay for cinematic depth */}
      <div className="grid-overlay" />

      {/* Main Layout containing Sidebar, Chat, and Right Sidebar Panels */}
      <div className="main-layout">
        <Sidebar />
        
        <ChatInterface />

        {/* Right Sidebar containing System, Memory, and Activity Timeline Panels */}
        <div className="right-sidebar" style={{
          backgroundColor: 'rgba(5, 8, 16, 0.95)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          gap: '12px',
          zIndex: 5,
          borderLeft: '1px solid var(--border-muted)'
        }}>
          {/* Cyber Tab Selector */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-muted)',
            paddingBottom: '8px',
            gap: '4px',
            flexShrink: 0
          }}>
            {['system', 'memory', 'logs', 'traces'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveRightTab(tab)}
                style={{
                  flex: 1,
                  background: activeRightTab === tab ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                  border: activeRightTab === tab ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                  color: activeRightTab === tab ? (tab === 'memory' ? 'var(--accent-green)' : 'var(--accent-cyan)') : 'var(--text-secondary)',
                  fontFamily: 'var(--font-nav)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  padding: '6px 0',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  boxShadow: activeRightTab === tab ? `0 0 5px ${tab === 'memory' ? 'rgba(0, 255, 159, 0.15)' : 'rgba(0, 212, 255, 0.15)'}` : 'none'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Dynamic Panel Rendering */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden'
          }}>
            {activeRightTab === 'system' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: '16px' }}>
                <TelemetryPanel />
                <TemporalBuffer />
              </div>
            )}
            {activeRightTab === 'memory' && <MemoryViewer />}
            {activeRightTab === 'logs' && <ActivityTimeline />}
            {activeRightTab === 'traces' && <TraceViewer />}
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <JarvisProvider>
      <Dashboard />
    </JarvisProvider>
  );
}
