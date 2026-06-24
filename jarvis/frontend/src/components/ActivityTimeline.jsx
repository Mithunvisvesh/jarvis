import React from 'react';
import { useJarvis } from '../context/JarvisContext';
import { 
  Activity, 
  MessageSquare, 
  Calendar, 
  Brain, 
  Cpu, 
  Download, 
  Printer,
  Terminal
} from 'lucide-react';

export default function ActivityTimeline() {
  const { timelineEvents } = useJarvis();

  const handleExportJson = () => {
    window.open('http://localhost:8001/api/diagnostics/export?format=json', '_blank');
  };

  const handlePrintPdf = () => {
    window.open('http://localhost:8001/api/diagnostics/export?format=html', '_blank');
  };

  const getEventStyles = (type) => {
    switch (type) {
      case 'user':
        return { icon: MessageSquare, color: 'var(--accent-pink)', label: 'USER_QUERY' };
      case 'reminder':
        return { icon: Calendar, color: 'var(--accent-orange)', label: 'REMINDER_BUFF' };
      case 'memory':
        return { icon: Brain, color: 'var(--accent-green)', label: 'NEURAL_MEM' };
      case 'diagnostics':
        return { icon: Cpu, color: 'var(--accent-cyan)', label: 'SYS_TELEMETRY' };
      default:
        return { icon: Activity, color: 'var(--text-secondary)', label: 'SYS_EVENT' };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      gap: '12px',
      marginTop: '8px'
    }}>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-nav)',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '1.5px',
        color: 'var(--accent-cyan)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Terminal size={14} />
        SYS_LOGS_TIMELINE
      </div>

      {/* Export Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleExportJson}
          className="cyber-panel"
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderRadius: '4px',
            padding: '8px',
            color: 'var(--accent-cyan)',
            fontFamily: 'var(--font-nav)',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 212, 255, 0.08)';
            e.currentTarget.style.borderColor = 'var(--accent-cyan)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.2)';
          }}
        >
          <Download size={12} />
          EXPORT JSON
        </button>

        <button
          onClick={handlePrintPdf}
          className="cyber-panel cyber-panel-pink"
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 0, 128, 0.2)',
            borderRadius: '4px',
            padding: '8px',
            color: 'var(--accent-pink)',
            fontFamily: 'var(--font-nav)',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 0, 128, 0.08)';
            e.currentTarget.style.borderColor = 'var(--accent-pink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 128, 0.2)';
          }}
        >
          <Printer size={12} />
          PRINT PDF
        </button>
      </div>

      {/* Timeline Event Feed */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflowY: 'auto',
        flex: 1,
        paddingRight: '2px',
        position: 'relative'
      }}>
        {/* Vertical timeline connector line */}
        <div style={{
          position: 'absolute',
          left: '15px',
          top: '8px',
          bottom: '8px',
          width: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          zIndex: 1
        }} />

        {timelineEvents.length === 0 ? (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-dark)',
            textAlign: 'center',
            padding: '20px 0',
            fontStyle: 'italic',
            fontFamily: 'var(--font-mono)'
          }}>
            TIMELINE_EMPTY
          </div>
        ) : (
          timelineEvents.map((evt) => {
            const { icon: Icon, color, label } = getEventStyles(evt.type);
            const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });

            return (
              <div 
                key={evt.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  zIndex: 2,
                  position: 'relative'
                }}
              >
                {/* Visual node */}
                <div style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(5, 8, 16, 0.95)',
                  border: `1px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 5px ${color}33`,
                  color: color,
                  flexShrink: 0
                }}>
                  <Icon size={12} />
                </div>

                {/* Event description block */}
                <div className="cyber-panel" style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '4px',
                  borderLeft: `3px solid ${color}`,
                  background: 'rgba(10, 14, 24, 0.4)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <span style={{ color: color, fontWeight: 'bold' }}>{label}</span>
                    <span style={{ color: 'var(--text-dark)' }}>{timeStr}</span>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    lineHeight: '1.4'
                  }}>
                    {evt.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
