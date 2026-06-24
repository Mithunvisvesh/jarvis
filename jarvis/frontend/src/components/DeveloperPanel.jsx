import React, { useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { getTraces, getTraceDetail } from '../services/api';
import { Activity, Clock, Layers, ShieldAlert, Cpu, Heart, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function DeveloperPanel() {
  const { currentRequestEvents, executionState } = useJarvis();
  const [traces, setTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [meshHealth, setMeshHealth] = useState('ONLINE'); // 'ONLINE' | 'STANDBY'
  const [lastEventTime, setLastEventTime] = useState(Date.now());
  const [expandedPayloads, setExpandedPayloads] = useState({});

  // 1. Mesh Health Checker: heartbeat timeout
  useEffect(() => {
    if (currentRequestEvents.length > 0) {
      setLastEventTime(Date.now());
      setMeshHealth('ONLINE');
    }
  }, [currentRequestEvents]);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTime;
      if (timeSinceLastEvent > 10000) {
        setMeshHealth('STANDBY');
      } else {
        setMeshHealth('ONLINE');
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [lastEventTime]);

  // Load history list
  const loadTraceHistory = async () => {
    try {
      const list = await getTraces();
      setTraces(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTraceHistory();
  }, [currentRequestEvents]);

  const selectHistoryTrace = async (workflowId) => {
    try {
      const detail = await getTraceDetail(workflowId);
      setSelectedTrace(detail);
    } catch (e) {
      console.error(e);
    }
  };

  // Determine active events to display (either current real-time ones, or a selected past trace)
  const displayEvents = selectedTrace 
    ? (selectedTrace.events || []) 
    : currentRequestEvents;

  // Toggle JSON payload display
  const togglePayload = (idx) => {
    setExpandedPayloads(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Compute Latencies
  const getLatencies = () => {
    if (displayEvents.length < 2) return { orch: 0, bg: 0, ui: 0, total: 0 };
    
    // Find timestamps of key checkpoints
    const getEvtTime = (type) => {
      const found = displayEvents.find(e => e.event_type === type);
      return found ? found.payload?.timestamp || found.timestamp : null;
    };

    const tStart = displayEvents[0].payload?.timestamp || displayEvents[0].timestamp;
    const tRouting = getEvtTime('ROUTING') || getEvtTime('INTENT_DETECTED');
    const tBgComplete = getEvtTime('BACKGROUND_DATA_COMPLETE') || getEvtTime('RESPONSE_SYNTHESIS');
    const tComplete = getEvtTime('COMPLETE');

    const latencies = {
      orch: tRouting && tStart ? Math.round((tRouting - tStart) * 1000) : 0,
      bg: tBgComplete && tRouting ? Math.round((tBgComplete - tRouting) * 1000) : 0,
      ui: tComplete && tBgComplete ? Math.round((tComplete - tBgComplete) * 1000) : 0,
      total: tComplete && tStart ? Math.round((tComplete - tStart) * 1000) : 0
    };

    // Fallbacks if events occur but don't match specific types
    if (latencies.total === 0 && displayEvents.length > 1) {
      const last = displayEvents[displayEvents.length - 1];
      const tLast = last.payload?.timestamp || last.timestamp;
      latencies.total = Math.round((tLast - tStart) * 1000);
    }

    return latencies;
  };

  const latencies = getLatencies();

  // Find memory confidence if recalled
  const getMemoryConfidence = () => {
    const recallEvent = displayEvents.find(e => e.event_type === 'MEMORY_RECALLED');
    if (recallEvent && recallEvent.payload && recallEvent.payload.data) {
      const res = recallEvent.payload.data.result;
      if (res && res.confidence !== undefined) {
        return Math.round(res.confidence * 100);
      }
    }
    // Also support past traces stored as raw data
    const completeEvent = displayEvents.find(e => e.event_type === 'COMPLETE');
    if (completeEvent && completeEvent.payload && completeEvent.payload.data && completeEvent.payload.data.action_taken) {
      const action = completeEvent.payload.data.action_taken;
      const match = action.match(/Confidence:\s*(\d+)%/i);
      if (match) return parseInt(match[1]);
    }
    return null;
  };

  const memoryConfidence = getMemoryConfidence();

  // Get color for trace level / event type
  const getEventColor = (type) => {
    if (type.includes('ERROR') || type.includes('FAILURE')) return 'var(--accent-pink)';
    if (type.includes('TOOL') || type.includes('MEMORY') || type.includes('REMINDER')) return 'var(--accent-cyan)';
    if (type === 'COMPLETE') return 'var(--accent-green)';
    return 'var(--text-secondary)';
  };

  // Check if specific node is active in pipeline flow
  const isNodeActive = (nodeName) => {
    if (selectedTrace) return false;
    if (executionState === 'Idle') return false;
    
    if (nodeName === 'Orchestrator') {
      return executionState === 'Analyzing Request' || executionState === 'Routing Intent';
    }
    if (nodeName === 'Background') {
      return executionState === 'Running Tools';
    }
    if (nodeName === 'UI') {
      return executionState === 'Synthesizing Response';
    }
    return false;
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
      {/* 1. MESH HEALTH CARD */}
      <div className="cyber-panel" style={{
        padding: '12px',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Heart size={14} style={{ 
            color: meshHealth === 'ONLINE' ? 'var(--accent-green)' : 'var(--accent-orange)',
            animation: meshHealth === 'ONLINE' ? 'pulse-green 1.5s infinite ease-in-out' : 'none'
          }} />
          <span style={{ 
            fontSize: '11px', 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 'bold',
            color: 'var(--text-primary)'
          }}>
            A2A MESH HEALTH
          </span>
        </div>
        <span style={{ 
          fontSize: '10px', 
          fontFamily: 'var(--font-mono)', 
          color: meshHealth === 'ONLINE' ? 'var(--accent-green)' : 'var(--accent-orange)',
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          {meshHealth}
        </span>
      </div>

      {/* 2. LATENCY & FLOW DIAGRAM */}
      <div className="cyber-panel" style={{
        padding: '16px 12px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        flexShrink: 0
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-nav)',
          color: 'var(--text-secondary)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: '6px',
          fontWeight: 'bold'
        }}>
          COLLABORATIVE FLOW & LATENCIES
        </div>

        {/* Nodes Visual Diagram */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          padding: '0 8px'
        }}>
          {/* Connector Line 1 */}
          <div style={{
            position: 'absolute',
            left: '25%',
            right: '55%',
            top: '16px',
            height: '2px',
            background: latencies.orch > 0 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
            zIndex: 1
          }} />
          {/* Connector Line 2 */}
          <div style={{
            position: 'absolute',
            left: '50%',
            right: '25%',
            top: '16px',
            height: '2px',
            background: latencies.bg > 0 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
            zIndex: 1
          }} />

          {/* Node 1: Orchestrator */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isNodeActive('Orchestrator') ? 'rgba(0, 212, 255, 0.15)' : 'var(--bg-card)',
              border: `2px solid ${isNodeActive('Orchestrator') ? 'var(--accent-cyan)' : (latencies.orch > 0 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)')}`,
              boxShadow: isNodeActive('Orchestrator') ? 'var(--glow-cyan)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isNodeActive('Orchestrator') || latencies.orch > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              transition: 'all 0.3s'
            }}>
              <Layers size={14} />
            </div>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', marginTop: '6px', color: 'var(--text-secondary)' }}>
              Orchestrator
            </span>
            {latencies.orch > 0 && (
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {latencies.orch}ms
              </span>
            )}
          </div>

          {/* Node 2: Background Data Agent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isNodeActive('Background') ? 'rgba(255, 0, 128, 0.15)' : 'var(--bg-card)',
              border: `2px solid ${isNodeActive('Background') ? 'var(--accent-pink)' : (latencies.bg > 0 ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)')}`,
              boxShadow: isNodeActive('Background') ? 'var(--glow-pink)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isNodeActive('Background') ? 'var(--accent-pink)' : (latencies.bg > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)'),
              transition: 'all 0.3s'
            }}>
              <Cpu size={14} />
            </div>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', marginTop: '6px', color: 'var(--text-secondary)' }}>
              Background
            </span>
            {latencies.bg > 0 && (
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {latencies.bg}ms
              </span>
            )}
          </div>

          {/* Node 3: UI Synthesizer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isNodeActive('UI') ? 'rgba(0, 255, 159, 0.15)' : 'var(--bg-card)',
              border: `2px solid ${isNodeActive('UI') ? 'var(--accent-green)' : (latencies.ui > 0 ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)')}`,
              boxShadow: isNodeActive('UI') ? 'var(--glow-green)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isNodeActive('UI') || latencies.ui > 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
              transition: 'all 0.3s'
            }}>
              <CheckCircle2 size={14} />
            </div>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', marginTop: '6px', color: 'var(--text-secondary)' }}>
              UI_Synth
            </span>
            {latencies.ui > 0 && (
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--accent-green)', marginTop: '2px' }}>
                {latencies.ui}ms
              </span>
            )}
          </div>
        </div>

        {/* Additional Stats Panel */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.03)'
        }}>
          <div>
            <span style={{ color: 'var(--text-dark)' }}>TOTAL_LATENCY: </span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>
              {latencies.total > 0 ? `${latencies.total}ms` : '0ms'}
            </span>
          </div>
          {memoryConfidence !== null && (
            <div>
              <span style={{ color: 'var(--text-dark)' }}>MEM_CONFIDENCE: </span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                {memoryConfidence}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. TELEMETRY LOGS FEED */}
      <div className="cyber-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        padding: '12px'
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-nav)',
          color: 'var(--text-secondary)',
          fontWeight: 'bold',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span>A2A_MESH_LOGS_STREAM</span>
          {selectedTrace && (
            <button
              onClick={() => setSelectedTrace(null)}
              style={{
                background: 'none',
                border: '1px solid rgba(255, 0, 128, 0.3)',
                color: 'var(--accent-pink)',
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                cursor: 'pointer',
                borderRadius: '3px',
                padding: '2px 6px'
              }}
            >
              CLOSE PAST TRACE
            </button>
          )}
        </div>

        {/* Live log entries */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px'
        }}>
          {displayEvents.length === 0 ? (
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-dark)',
              textAlign: 'center',
              padding: '40px 0',
              fontStyle: 'italic'
            }}>
              WAITING_FOR_Operational_Traffic...
            </div>
          ) : (
            displayEvents.map((evt, idx) => {
              const eType = evt.event_type || evt.event;
              const sender = evt.sender || 'system';
              const color = getEventColor(eType);
              const data = evt.payload?.data || evt.data || {};
              const hasData = Object.keys(data).length > 0;
              const isExpanded = !!expandedPayloads[idx];

              return (
                <div key={idx} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  lineHeight: '1.4',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  padding: '8px',
                  borderRadius: '3px',
                  borderLeft: `2px solid ${color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: color, fontWeight: 'bold' }}>
                      {eType}
                    </span>
                    <span style={{ color: 'var(--text-dark)', fontSize: '9px' }}>
                      {sender.toUpperCase()}
                    </span>
                  </div>
                  {data.message && (
                    <div style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      &gt; {data.message}
                    </div>
                  )}
                  {hasData && (
                    <button
                      onClick={() => togglePayload(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dark)',
                        fontSize: '9px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: 0,
                        alignSelf: 'flex-start',
                        marginTop: '2px'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {isExpanded ? 'Hide Payload' : 'Show Payload'}
                    </button>
                  )}
                  {isExpanded && hasData && (
                    <pre style={{
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      color: 'var(--accent-cyan)',
                      padding: '6px',
                      borderRadius: '2px',
                      overflowX: 'auto',
                      fontSize: '9px',
                      margin: '4px 0 0 0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. COLLAPSIBLE HISTORY LIST */}
      <div className="cyber-panel" style={{
        padding: '10px 12px',
        borderRadius: '4px',
        maxHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--font-nav)',
          color: 'var(--text-secondary)',
          fontWeight: 'bold',
          marginBottom: '6px',
          flexShrink: 0
        }}>
          HISTORICAL_WORKFLOW_RUNS
        </div>
        <div style={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1
        }}>
          {traces.length === 0 ? (
            <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-dark)' }}>
              NO_PAST_RUNS
            </div>
          ) : (
            traces.map((t) => (
              <div
                key={t.workflow_id}
                onClick={() => selectHistoryTrace(t.workflow_id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  padding: '4px 6px',
                  background: selectedTrace?.workflow_id === t.workflow_id ? 'rgba(0, 212, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                  border: selectedTrace?.workflow_id === t.workflow_id ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  cursor: 'pointer',
                  borderRadius: '2px'
                }}
              >
                <span>{t.workflow_id}</span>
                <span style={{ color: 'var(--text-dark)' }}>{t.duration}s</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
