import React, { useState, useEffect, useRef } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { 
  Settings as SettingsIcon, 
  User, 
  Terminal, 
  Database, 
  Trash2, 
  RefreshCw, 
  Share2, 
  Cpu, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  GitBranch,
  Calendar,
  Layers
} from 'lucide-react';

export default function SettingsView() {
  const { 
    isDeveloperMode, 
    setIsDeveloperMode, 
    clearChat, 
    wipeSessionContext, 
    resetConversation,
    reminders,
    missions
  } = useJarvis();

  // Reset stage
  const [resetStage, setResetStage] = useState(0); // 0 = idle, 1 = confirm
  const resetTimerRef = useRef(null);

  // Wipe stage
  const [wipeStage, setWipeStage] = useState(0); // 0 = idle, 1 = confirm
  const wipeTimerRef = useRef(null);

  // Clear chat log stage
  const [clearStage, setClearStage] = useState(0); // 0 = idle, 1 = confirm
  const clearTimerRef = useRef(null);

  const handleResetClick = () => {
    if (resetStage === 0) {
      setResetStage(1);
      resetTimerRef.current = setTimeout(() => {
        setResetStage(0);
      }, 4000);
    } else {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetConversation();
      setResetStage(0);
    }
  };

  const handleWipeClick = async () => {
    if (wipeStage === 0) {
      setWipeStage(1);
      wipeTimerRef.current = setTimeout(() => {
        setWipeStage(0);
      }, 4000);
    } else {
      if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current);
      await wipeSessionContext();
      setWipeStage(0);
    }
  };

  const handleClearClick = () => {
    if (clearStage === 0) {
      setClearStage(1);
      clearTimerRef.current = setTimeout(() => {
        setClearStage(0);
      }, 4000);
    } else {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearChat();
      setClearStage(0);
    }
  };

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(5, 8, 16, 0.65)',
      overflowY: 'auto',
      width: '100%',
      position: 'relative'
    }}>
      {/* Header Banner */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(10, 14, 24, 0.4)',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '18px',
            fontWeight: '600',
            letterSpacing: '1.5px',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <SettingsIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
            SYSTEM DIAGNOSTICS & CONFIG
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)'
          }}>
            Configure operational protocols and diagnostic environments
          </p>
        </div>
      </div>

      {/* Main Settings Form Scrollable Content */}
      <div style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        flex: 1
      }}>
        {/* Section 1: JARVIS Operator Identity */}
        <div className="cyber-panel" style={{
          backgroundColor: 'rgba(10, 14, 24, 0.3)',
          borderLeft: '2px solid var(--accent-cyan)',
          padding: '16px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: 'var(--accent-cyan)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <User size={14} />
            JARVIS IDENTITY MATRIX
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '9px' }}>OPERATOR</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>Mithun</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '9px' }}>STATUS</span>
              <span style={{ color: 'var(--text-primary)' }}>4th-Semester B.Tech CSE Student</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '9px' }}>CAPSTONE DEADLINE</span>
              <span style={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}>July 6, 2026</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '9px' }}>FOCUS OBJECTIVE</span>
              <span style={{ color: 'var(--text-primary)' }}>Google ADK 2.0 Capstone Project</span>
            </div>
          </div>
        </div>

        {/* Section 2: Developer Mode & Diagnostics Toggle */}
        <div className="cyber-panel" style={{
          backgroundColor: 'rgba(10, 14, 24, 0.3)',
          borderLeft: '2px solid var(--accent-cyan)',
          padding: '16px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontFamily: 'var(--font-header)',
                fontSize: '13px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                color: 'var(--accent-cyan)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Terminal size={14} />
                DEVELOPER MODE & AGENT DIAGNOSTICS
              </h2>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '10px',
                color: 'var(--text-secondary)'
              }}>
                Enables telemetry panels, latency tracing, and direct A2A event timelines.
              </p>
            </div>
            <button 
              onClick={() => setIsDeveloperMode(!isDeveloperMode)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isDeveloperMode ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isDeveloperMode ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
            </button>
          </div>

          {isDeveloperMode && (
            <div style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: 'rgba(0, 212, 255, 0.03)',
              border: '1px solid rgba(0, 212, 255, 0.15)',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>[SYS_STATUS] Event Bus Synchronization:</span>
                <span style={{ color: 'var(--accent-green)' }}>ONLINE (15 Channels Listeners Active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>[SYS_STATUS] MCP stdio Transport:</span>
                <span style={{ color: 'var(--accent-green)' }}>ACTIVE (mcp_server.py spawned)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>[SYS_STATUS] Active Threadpool Workers:</span>
                <span style={{ color: 'var(--text-primary)' }}>ThreadPoolExecutor(max_workers=2)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>[SYS_STATUS] Memory Deduplication:</span>
                <span style={{ color: 'var(--text-primary)' }}>ACTIVE (difflib.SequenceMatcher &gt;= 0.85)</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Session Management (Actions Matrix) */}
        <div className="cyber-panel" style={{
          backgroundColor: 'rgba(10, 14, 24, 0.3)',
          borderLeft: '2px solid var(--accent-pink)',
          padding: '16px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: 'var(--accent-pink)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Database size={14} />
            SESSION MANAGEMENT
          </h2>
          <p style={{
            margin: 0,
            fontSize: '10px',
            color: 'var(--text-secondary)'
          }}>
            Manage local caches, schedule buffers, and backend session graphs.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '8px'
          }}>
            {/* Action 1: Clear chat log locally */}
            <div style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: 'rgba(10, 14, 24, 0.2)'
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold' }}>CLEAR CHAT LOG</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: 'var(--text-secondary)' }}>Wipes local web view messaging histories. Stored memories and scheduled agendas are not deleted.</p>
              </div>
              <button
                onClick={handleClearClick}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: clearStage === 1 ? 'rgba(255, 0, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: clearStage === 1 ? '1px solid var(--accent-pink)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: clearStage === 1 ? 'var(--accent-pink)' : 'var(--text-primary)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: clearStage === 1 ? 'var(--glow-pink)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Trash2 size={12} />
                {clearStage === 1 ? 'CONFIRM CLEAR?' : 'CLEAR CHAT'}
              </button>
            </div>

            {/* Action 2: Wipe session context */}
            <div style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: 'rgba(10, 14, 24, 0.2)'
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold' }}>WIPE MEMORY DATABASE</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: 'var(--text-secondary)' }}>Erases all backend database entries including scheduled agenda tasks and memorized facts.</p>
              </div>
              <button
                onClick={handleWipeClick}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: wipeStage === 1 ? 'rgba(255, 0, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: wipeStage === 1 ? '1px solid var(--accent-pink)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: wipeStage === 1 ? 'var(--accent-pink)' : 'var(--text-primary)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: wipeStage === 1 ? 'var(--glow-pink)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={12} />
                {wipeStage === 1 ? 'CONFIRM WIPE?' : 'WIPE MEMORIES'}
              </button>
            </div>

            {/* Action 3: Complete Reset */}
            <div style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              backgroundColor: 'rgba(10, 14, 24, 0.2)'
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold' }}>FULL COGNITIVE RESET</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: 'var(--text-secondary)' }}>Wipes local messaging history and calls the backend session clear endpoints in a single operation.</p>
              </div>
              <button
                onClick={handleResetClick}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: resetStage === 1 ? 'rgba(255, 0, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: resetStage === 1 ? '1px solid var(--accent-pink)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: resetStage === 1 ? 'var(--accent-pink)' : 'var(--text-primary)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: resetStage === 1 ? 'var(--glow-pink)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <AlertCircle size={12} />
                {resetStage === 1 ? 'CONFIRM RESET?' : 'RESET CONVERSATION'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Integrations (Placeholder Matrix) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-header)',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Share2 size={14} style={{ color: 'var(--accent-cyan)' }} />
            INTEGRATIONS MATRIX
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Tile 1: GitHub */}
            <div style={{
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              opacity: 0.5,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 6px',
                borderRadius: '2px',
                fontWeight: 'bold'
              }}>PLANNED</div>
              <GitBranch size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>GitHub Integration</span>
              <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>Track code commits, repository telemetry, and branch updates in active missions.</span>
            </div>

            {/* Tile 2: Notion */}
            <div style={{
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              opacity: 0.5,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 6px',
                borderRadius: '2px',
                fontWeight: 'bold'
              }}>PLANNED</div>
              <Layers size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Notion Workspace</span>
              <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>Sync note databases, project requirements documents, and specs seamlessly.</span>
            </div>

            {/* Tile 3: Google Calendar */}
            <div style={{
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              opacity: 0.5,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 6px',
                borderRadius: '2px',
                fontWeight: 'bold'
              }}>PLANNED</div>
              <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Google Calendar</span>
              <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)' }}>Automate reminders scheduling and synchronize daily tasks with real calendar logs.</span>
            </div>
          </div>
        </div>

        {/* Section 5: About JARVIS */}
        <div style={{
          borderTop: '1px solid var(--border-muted)',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'rgba(255, 255, 255, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={12} />
            <span>JARVIS CORE ENGINE v2.0.0</span>
          </div>
          <span>GOOGLE ADK 2.0 WORKFLOW RUNTIME</span>
          <span>BUILD: JUNE 26, 2026</span>
        </div>
      </div>
    </div>
  );
}
