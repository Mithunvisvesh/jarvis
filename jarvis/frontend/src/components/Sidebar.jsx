import React, { useState } from 'react';
import { 
  Terminal, 
  MessageSquare, 
  Settings, 
  Activity, 
  ShieldAlert,
  FolderOpen
} from 'lucide-react';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('chat');

  const menuItems = [
    { id: 'chat', icon: MessageSquare, label: 'CORE OVERLAY' },
    { id: 'terminal', icon: Terminal, label: 'SYS_SHELL' },
    { id: 'diagnostics', icon: Activity, label: 'TELEMETRY' },
    { id: 'security', icon: ShieldAlert, label: 'TDD_GATE' },
    { id: 'files', icon: FolderOpen, label: 'RESOURCES' },
  ];

  return (
    <div style={{
      width: '64px',
      height: '100%',
      backgroundColor: 'rgba(5, 8, 16, 0.95)',
      borderRight: '1px solid var(--border-muted)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      zIndex: 10,
      position: 'relative'
    }}>
      {/* JARVIS Symbol */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '2px double var(--accent-cyan)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '40px',
        cursor: 'pointer',
        boxShadow: 'var(--glow-cyan)',
        position: 'relative'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-cyan)',
          boxShadow: '0 0 8px var(--accent-cyan)',
        }} />
      </div>

      {/* Navigation Items */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        flex: 1
      }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <div 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 10px rgba(0, 212, 255, 0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--accent-cyan)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 212, 255, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={20} />
              
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '25%',
                  height: '50%',
                  width: '3px',
                  backgroundColor: 'var(--accent-cyan)',
                  borderRadius: '0 2px 2px 0',
                  boxShadow: '0 0 6px var(--accent-cyan)'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <div 
        onClick={() => setActiveTab('settings')}
        title="SETTINGS"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          color: activeTab === 'settings' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          backgroundColor: activeTab === 'settings' ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
          border: activeTab === 'settings' ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (activeTab !== 'settings') {
            e.currentTarget.style.color = 'var(--accent-cyan)';
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== 'settings') {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <Settings size={20} />
      </div>
    </div>
  );
}
