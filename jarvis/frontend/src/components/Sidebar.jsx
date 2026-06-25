import React from 'react';
import { useJarvis } from '../context/JarvisContext';
import { 
  MessageSquare, 
  Calendar, 
  Brain, 
  Code,
  Target
} from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView }) {
  const { isDeveloperMode, setIsDeveloperMode } = useJarvis();

  const menuItems = [
    { id: 'chat', icon: MessageSquare, label: 'CHAT OVERLAY' },
    { id: 'agenda', icon: Calendar, label: 'AGENDA' },
    { id: 'knowledge', icon: Brain, label: 'KNOWLEDGE BASE' },
    { id: 'missions', icon: Target, label: 'MISSIONS' },
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
      }} onClick={() => setCurrentView('chat')}>
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
          const isActive = currentView === item.id;
          
          return (
            <div 
              key={item.id}
              onClick={() => setCurrentView(item.id)}
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

      {/* Developer Mode Toggle */}
      <div 
        onClick={() => setIsDeveloperMode(!isDeveloperMode)}
        title={isDeveloperMode ? "DISABLE DEV MODE" : "ENABLE DEV MODE"}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          color: isDeveloperMode ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          backgroundColor: isDeveloperMode ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
          border: isDeveloperMode ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent',
          boxShadow: isDeveloperMode ? '0 0 10px rgba(0, 212, 255, 0.1)' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!isDeveloperMode) {
            e.currentTarget.style.color = 'var(--accent-cyan)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDeveloperMode) {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <Code size={20} />
      </div>
    </div>
  );
}
