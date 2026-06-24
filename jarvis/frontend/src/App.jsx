import React, { useState } from 'react';
import { JarvisProvider, useJarvis } from './context/JarvisContext';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import TelemetryPanel from './components/TelemetryPanel';
import Agenda from './components/Agenda';
import MemoryViewer from './components/MemoryViewer';
import ActivityTimeline from './components/ActivityTimeline';
import DeveloperPanel from './components/DeveloperPanel';
import StatusBar from './components/StatusBar';
import AgendaView from './components/AgendaView';
import KnowledgeView from './components/KnowledgeView';

function Dashboard() {
  const [activeRightTab, setActiveRightTab] = useState('system'); // 'system' | 'memory' | 'logs'
  const [currentView, setCurrentView] = useState('chat'); // 'chat' | 'agenda' | 'knowledge'
  const { isDeveloperMode } = useJarvis();

  return (
    <div className="app-container">
      {/* Scanline/Grid Overlay for cinematic depth */}
      <div className="grid-overlay" />

      {/* Main Layout containing Sidebar, Chat, and Right Sidebar Panels */}
      <div className="main-layout" style={{
        gridTemplateColumns: isDeveloperMode ? '64px 1fr 280px' : '64px 1fr',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        
        {/* Centered Workspace Area */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
          padding: '24px 40px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '896px', // max-w-4xl
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid var(--border-muted)',
            borderRight: '1px solid var(--border-muted)',
            backgroundColor: 'rgba(10, 14, 24, 0.2)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {currentView === 'chat' && <ChatInterface />}
            {currentView === 'agenda' && <AgendaView />}
            {currentView === 'knowledge' && <KnowledgeView />}
          </div>
        </div>

        {/* Right Sidebar containing System, Memory, and Activity Timeline Panels */}
        {isDeveloperMode && (
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
            {/* Cyber Tab Selector (Only rendered when Developer Mode is active) */}
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
                  <Agenda />
                </div>
              )}
              {activeRightTab === 'memory' && <MemoryViewer />}
              {activeRightTab === 'logs' && <ActivityTimeline />}
              {activeRightTab === 'traces' && <DeveloperPanel />}
            </div>
          </div>
        )}
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
