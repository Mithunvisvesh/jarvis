import React from 'react';
import { JarvisProvider } from './context/JarvisContext';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import TelemetryPanel from './components/TelemetryPanel';
import TemporalBuffer from './components/TemporalBuffer';
import StatusBar from './components/StatusBar';

function Dashboard() {
  return (
    <div className="app-container">
      {/* Scanline/Grid Overlay for cinematic depth */}
      <div className="grid-overlay" />

      {/* Main Layout containing Sidebar, Chat, and Right Sidebar Panels */}
      <div className="main-layout">
        <Sidebar />
        
        <ChatInterface />

        {/* Right Sidebar: Telemetry & Temporal Buffer */}
        <div className="right-sidebar" style={{
          backgroundColor: 'rgba(5, 8, 16, 0.95)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          gap: '16px',
          zIndex: 5
        }}>
          <TelemetryPanel />
          <TemporalBuffer />
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
