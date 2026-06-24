import React, { useState, useEffect } from 'react';
import { getTraces, getTraceDetail } from '../services/api';
import { Activity, Clock, Cpu, ChevronRight, RefreshCw, Layers } from 'lucide-react';

export default function TraceViewer() {
  const [traces, setTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTracesList = async () => {
    setIsLoading(true);
    try {
      const data = await getTraces();
      setTraces(data);
      if (data.length > 0 && !selectedTrace) {
        // Auto-select latest
        const detail = await getTraceDetail(data[0].workflow_id);
        setSelectedTrace(detail);
      }
    } catch (err) {
      console.error("Failed to load traces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracesList();
  }, []);

  const handleSelectTrace = async (workflowId) => {
    try {
      const detail = await getTraceDetail(workflowId);
      setSelectedTrace(detail);
    } catch (err) {
      console.error("Failed to load trace detail:", err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      gap: '12px',
      marginTop: '8px',
      height: '100%'
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
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} />
          CLOUD TRACE OBSERVABILITY
        </div>
        <button 
          onClick={fetchTracesList} 
          disabled={isLoading}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-cyan)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px'
          }}
        >
          <RefreshCw size={10} className={isLoading ? 'flicker' : ''} />
          REFRESH
        </button>
      </div>

      {/* Traces List Split View */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Top: Recent Traces List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '180px',
          overflowY: 'auto',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-muted)',
          paddingBottom: '8px'
        }}>
          {traces.length === 0 ? (
            <div style={{
              fontSize: '11px',
              color: 'var(--text-dark)',
              textAlign: 'center',
              padding: '15px 0',
              fontStyle: 'italic',
              fontFamily: 'var(--font-mono)'
            }}>
              NO_ACTIVE_TRACES
            </div>
          ) : (
            traces.map((t) => {
              const isSelected = selectedTrace && selectedTrace.workflow_id === t.workflow_id;
              return (
                <div 
                  key={t.workflow_id}
                  onClick={() => handleSelectTrace(t.workflow_id)}
                  className="cyber-panel"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderLeft: `3px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--text-dark)'}`,
                    background: isSelected ? 'rgba(0, 212, 255, 0.05)' : 'var(--bg-card)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                      {t.workflow_id}
                    </span>
                    <span style={{ color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} />
                      {t.duration}s
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {t.prompt}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom: Detailed Event Stepper */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.2)',
          padding: '8px',
          borderRadius: '4px'
        }}>
          {selectedTrace ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Summary details */}
              <div style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                flexShrink: 0,
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '6px'
              }}>
                <span>REQ ID: {selectedTrace.request_id}</span>
                <span>EVENTS: {selectedTrace.events?.length || 0}</span>
              </div>

              {/* Event Step List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflowY: 'auto',
                flex: 1,
                paddingRight: '2px'
              }}>
                {selectedTrace.events?.map((evt, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      position: 'relative',
                      paddingLeft: '14px',
                      fontSize: '11px'
                    }}
                  >
                    {/* Vertical connecting line */}
                    {idx < selectedTrace.events.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: '4px',
                        top: '12px',
                        bottom: '-12px',
                        width: '1px',
                        backgroundColor: 'rgba(255,255,255,0.08)'
                      }} />
                    )}

                    {/* Timeline Node Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '1px',
                      top: '4px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: evt.event_type === 'COMPLETE' ? 'var(--accent-green)' : 'var(--accent-cyan)',
                      boxShadow: evt.event_type === 'COMPLETE' ? 'var(--glow-green)' : 'var(--glow-cyan)'
                    }} />

                    {/* Step Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 'bold',
                          color: evt.event_type === 'COMPLETE' ? 'var(--accent-green)' : 'var(--text-primary)'
                        }}>
                          {evt.event_type}
                        </span>
                        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dark)' }}>
                          {evt.sender}
                        </span>
                      </div>
                      
                      {/* Optional message or tool metadata */}
                      {evt.data && (evt.data.message || evt.data.tool || evt.data.route) && (
                        <span style={{
                          fontSize: '10px',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                          wordBreak: 'break-all'
                        }}>
                          {evt.data.message || (evt.data.tool ? `Invoked tool "${evt.data.tool}"` : `Resolved route: ${evt.data.route}`)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '11px',
              color: 'var(--text-dark)',
              fontFamily: 'var(--font-mono)'
            }}>
              SELECT_A_TRACE_RECORD
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
